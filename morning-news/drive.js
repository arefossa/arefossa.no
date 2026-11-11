// Felles for sidene under /morning-news/: Google-innlogging i nettleseren og lesing av filene i
// en privat Drive-mappe. Ingen data ligger på arefossa.no. Tilgangsnøkkelen huskes bare i denne
// fanen (sessionStorage) til den går ut, og deles av sidene her, så én innlogging holder.
const CLIENT_ID = "947698817547-ejrbeabep1cr9bgaifmcmso1igdelvh7.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_KEY = "morning-news.token";
const API = "https://www.googleapis.com/drive/v3/files";
const clock = new Intl.DateTimeFormat("nb-NO", { timeStyle: "short", timeZone: "Europe/Oslo" });

function savedToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    return t && t.expires > Date.now() + 60000 ? t.value : null;
  } catch { return null; }
}
function saveToken(value, seconds) {
  try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ value, expires: Date.now() + seconds * 1000 })); } catch { /* bare denne visningen */ }
}
function forgetToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ingenting å glemme */ }
}

async function drive(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status });
  return res;
}

/**
 * Leser de nyeste JSON-filene i en Drive-mappe og gir dem til render(docs), nyeste først.
 * Filnavnene sorteres bakover (uke-2026-46, rapport-2026-11-11 osv.). Lages en ny fil med samme
 * navn, brukes den nyeste. ui = { signin, login, status, footer }.
 */
export function readFolder({ folderId, prefix, limit, render, ui }) {
  const { signin, login, status, footer } = ui;

  async function load(token) {
    signin.hidden = false;
    login.disabled = true;
    status.textContent = "Henter fra Drive …";
    try {
      const q = `'${folderId}' in parents and trashed = false and name contains '${prefix}'`;
      const list = await (await drive(`?q=${encodeURIComponent(q)}&orderBy=createdTime%20desc&pageSize=200&fields=files(id,name,createdTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`, token)).json();
      const newest = new Map();
      for (const f of list.files || []) if (f.name.startsWith(prefix) && !newest.has(f.name)) newest.set(f.name, f);
      const files = [...newest.values()].sort((a, b) => b.name.localeCompare(a.name)).slice(0, limit);
      const docs = [];
      for (const f of files) {
        try {
          const body = (await (await drive(`/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`, token)).text()).replace(/^﻿/, "");
          docs.push(JSON.parse(body));
        } catch { /* en ødelagt fil skal ikke stoppe resten */ }
      }
      render(docs);
      signin.hidden = true;
      if (footer) {
        const span = document.createElement("span");
        span.textContent = ` · Hentet fra Drive kl. ${clock.format(new Date())}`;
        footer.append(span);
      }
    } catch (error) {
      if (error.status === 401) {
        forgetToken();
        status.textContent = "Innloggingen har gått ut. Logg inn på nytt.";
      } else if (error.status === 403 || error.status === 404) {
        status.textContent = "Fikk ikke tilgang til mappa. Logg inn med kontoen mappa er delt med.";
      } else {
        status.textContent = "Fikk ikke hentet fra Drive. Prøv igjen om litt.";
      }
    } finally {
      login.disabled = false;
    }
  }

  let tokenClient = null;
  function startGoogle() {
    const google = window.google && window.google.accounts && window.google.accounts.oauth2;
    if (!google) return false;
    tokenClient = google.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (res) => {
        if (res && res.access_token) {
          saveToken(res.access_token, Number(res.expires_in) || 3600);
          load(res.access_token);
        } else {
          status.textContent = "Innloggingen ble avbrutt.";
        }
      },
      error_callback: () => { status.textContent = "Innloggingen ble avbrutt eller stoppet av nettleseren."; },
    });
    return true;
  }
  login.addEventListener("click", () => {
    if (!tokenClient && !startGoogle()) { status.textContent = "Google-innloggingen lastes fortsatt. Prøv igjen."; return; }
    tokenClient.requestAccessToken({ prompt: "" });
  });

  // Bare lokalt: ?file=<adresse> (gjerne flere) viser filene uten innlogging, for å teste visningen.
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).getAll("file");
  if (local && local.length) {
    Promise.all(local.map((f) => fetch(f).then((r) => r.json())))
      .then((docs) => { render(docs); signin.hidden = true; })
      .catch(() => { status.textContent = "Fant ikke testfila."; });
    return;
  }

  const token = savedToken();
  if (token) load(token);
  let tries = 0;
  const wait = setInterval(() => { if (startGoogle() || ++tries > 100) clearInterval(wait); }, 100);
}
