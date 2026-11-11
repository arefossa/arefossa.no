// Watch list: henter ukefilene fra en privat Google Drive-mappe og viser dem som kort. Ingen data
// ligger på arefossa.no. Siden logger inn med Google i nettleseren (Google Identity Services) og
// leser filene med Drive-API-et. Alt fra filene settes som tekst, aldri som HTML.
(() => {
  const CONFIG = {
    // Klient-ID-en fra Google Cloud. Den er ikke hemmelig.
    clientId: "947698817547-ejrbeabep1cr9bgaifmcmso1igdelvh7.apps.googleusercontent.com",
    // Drive-mappa arefossa.no/morning-news/watch. Mappene i Drive følger stiene på siden.
    folderId: "1NXMbgum9zr5CM6Hge1nd1B7PXZwcrLvV",
    prefix: "uke-",
    weeks: 8,
    scope: "https://www.googleapis.com/auth/drive.readonly",
  };
  const TOKEN_KEY = "watch.token";
  const API = "https://www.googleapis.com/drive/v3/files";
  const WEIGHTS = ["krav", "viktig", "lite"];
  const NUM = ["Ingen", "Ett", "To", "Tre", "Fire", "Fem"];

  const $ = (id) => document.getElementById(id);
  const content = $("content");
  const status = $("status");
  const signin = $("signin");
  const login = $("login");
  const clock = new Intl.DateTimeFormat("nb-NO", { timeStyle: "short", timeZone: "Europe/Oslo" });

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class") node.className = value; else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
  const weightOf = (i) => (WEIGHTS.includes(i && i.weight) ? i.weight : "viktig");
  const items = (list) => (Array.isArray(list) ? list.filter((i) => i && text(i.text)) : []);
  const n = (k) => NUM[k] || String(k);

  // ---- Visning (samme format som ukefilene fra den planlagte oppgaven) ----
  function counts(list) {
    const c = { krav: 0, viktig: 0, lite: 0 };
    for (const i of list) c[weightOf(i)]++;
    return WEIGHTS.filter((w) => c[w]).map((w) => `${c[w]} ${w}`).join(", ") || "ingen";
  }
  function verdict(misses) {
    const broken = misses.filter((i) => weightOf(i) === "krav" && !i.unclear).length;
    const unclear = misses.filter((i) => weightOf(i) === "krav" && i.unclear).length;
    const out = [];
    if (broken) out.push(el("span", { class: "flag" }, `${n(broken)} krav ikke møtt`));
    if (unclear) out.push(el("span", { class: "flag" }, `${n(unclear)} krav må avklares`));
    if (!out.length) out.push(el("span", { class: "ok" }, "Ingen krav brutt"));
    return out;
  }
  function bullets(list, kind) {
    const ul = el("ul");
    if (!list.length) ul.append(el("li", { class: "none" }, "Ingen"));
    for (const i of list) {
      const w = weightOf(i);
      ul.append(el("li", {}, text(i.text) + (i.unclear ? " (må avklares)" : ""), el("span", { class: w === "krav" ? "w krav" : "w" }, w)));
    }
    return el("div", { class: kind }, el("h4", {}, kind === "hits" ? "Treff" : "Bom"), ul);
  }
  function card(item, cls) {
    const hits = items(item.hits), misses = items(item.misses);
    const url = safeUrl(item.url);
    const title = text(item.title) || "Uten tittel";
    return el("article", { class: "card" + (cls ? " " + cls : "") },
      el("h3", {}, url ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, title) : title),
      el("div", { class: "meta" },
        text(item.company) && el("span", {}, text(item.company)),
        text(item.place) && el("span", {}, text(item.place)),
        text(item.deadline) && el("span", { class: "due" }, "Frist " + text(item.deadline))),
      el("div", { class: "fit" }, bullets(hits, "hits"), bullets(misses, "misses")),
      el("p", { class: "sum" }, el("span", {}, "Treff: " + counts(hits)), el("span", {}, "Bom: " + counts(misses)), verdict(misses)),
      text(item.tip) && el("p", { class: "tip" }, text(item.tip)));
  }
  function label(w) {
    const parts = [];
    if (w.week) parts.push("uke " + w.week);
    const d = text(w.date).split("-");
    if (d.length === 3) parts.push(`${d[2]}.${d[1]}.${d[0]}`);
    return parts.join(" · ");
  }
  function section(cls, heading, note, list, cardCls) {
    if (!list.length) return null;
    return el("section", { class: cls || null }, el("h2", {}, heading),
      text(note) && el("p", { class: "note" }, text(note)),
      el("div", { class: "cards" }, list.map((i) => card(i, cardCls))));
  }
  function render(weeks) {
    content.replaceChildren();
    if (!weeks.length) {
      content.append(el("p", { class: "message" }, "Mappa har ingen uker ennå."));
      return;
    }
    const [latest, ...older] = weeks;
    const all = Array.isArray(latest.jobs) ? latest.jobs.filter(Boolean) : [];
    const pick = (k) => all.filter((j) => (j.kind || "treff") === k);
    $("intro").textContent = text(latest.intro);
    content.append(el("section", {},
      el("h2", {}, "Ukens treff", el("span", { class: "date" }, label(latest))),
      text(latest.note) && el("p", { class: "note" }, text(latest.note)),
      pick("treff").length ? el("div", { class: "cards" }, pick("treff").map((i) => card(i)))
        : el("p", { class: "message" }, "Ingen treff denne uken.")));
    const wild = section(null, "Ukens wildcard", null, pick("wildcard"), "wild");
    if (wild) content.append(wild);
    const soon = section("soon", "Frist snart", latest.soonNote, pick("frist"));
    if (soon) content.append(soon);
    const sources = Array.isArray(latest.sources) ? latest.sources.filter((s) => s && text(s.text)) : [];
    if (sources.length) {
      content.append(el("section", {}, el("h2", {}, "Kilder sjekket denne uken"),
        el("ul", { class: "sources" }, sources.map((s) => el("li", {}, text(s.name) && el("strong", {}, text(s.name) + ": "), text(s.text))))));
    }
    const history = el("section", { class: "history" }, el("h2", {}, "Historikk"));
    if (!older.length) history.append(el("p", { class: "note" }, "Ingen tidligere uker ennå."));
    for (const w of older) {
      const list = Array.isArray(w.jobs) ? w.jobs.filter(Boolean) : [];
      history.append(el("details", {},
        el("summary", {}, `Uke ${w.week || "?"}`, el("span", { class: "date" }, `${label(w)} · ${list.length} oppføringer`)),
        el("ul", {}, list.map((j) => {
          const url = safeUrl(j.url);
          const broken = items(j.misses).filter((i) => weightOf(i) === "krav" && !i.unclear).length;
          return el("li", {},
            url ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text(j.title) || "Uten tittel") : (text(j.title) || "Uten tittel"),
            el("span", { class: "who" }, [text(j.company), text(j.place), text(j.deadline) && "frist " + text(j.deadline)].filter(Boolean).join(" · ")),
            broken ? el("span", { class: "flag" }, `${n(broken)} krav ikke møtt`) : null);
        }))));
    }
    content.append(history);
    if (text(latest.footer)) $("footer").textContent = text(latest.footer);
  }

  // ---- Innlogging og Drive ----
  // Tilgangsnøkkelen huskes bare i denne fanen (sessionStorage) til den går ut, så en
  // ny lasting ikke ber om innlogging igjen.
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

  async function load(token) {
    signin.hidden = false;
    login.disabled = true;
    status.textContent = "Henter fra Drive …";
    try {
      const q = `'${CONFIG.folderId}' in parents and trashed = false and name contains '${CONFIG.prefix}'`;
      const list = await (await drive(`?q=${encodeURIComponent(q)}&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name,createdTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`, token)).json();
      // En ny kjøring samme uke lager en ny fil med samme navn: bruk den nyeste per navn.
      const newest = new Map();
      for (const f of list.files || []) if (!newest.has(f.name)) newest.set(f.name, f);
      const files = [...newest.values()].sort((a, b) => b.name.localeCompare(a.name)).slice(0, CONFIG.weeks);
      const weeks = [];
      for (const f of files) {
        try {
          const body = (await (await drive(`/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`, token)).text()).replace(/^﻿/, "");
          weeks.push(JSON.parse(body));
        } catch { /* en ødelagt fil skal ikke stoppe resten */ }
      }
      render(weeks);
      signin.hidden = true;
      $("footer").append(el("span", {}, ` · Hentet fra Drive kl. ${clock.format(new Date())}`));
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
    if (!CONFIG.clientId) {
      status.textContent = "Innloggingen er ikke satt opp ennå.";
      login.disabled = true;
      return;
    }
    const google = window.google && window.google.accounts && window.google.accounts.oauth2;
    if (!google) return false;
    tokenClient = google.initTokenClient({
      client_id: CONFIG.clientId,
      scope: CONFIG.scope,
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
    if (tokenClient) tokenClient.requestAccessToken({ prompt: "" });
  });

  // Bare lokalt: ?file=<adresse> viser én ukefil uten innlogging, for å teste visningen.
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("file");
  if (local) {
    fetch(local).then((r) => r.json()).then((w) => { render([w]); signin.hidden = true; })
      .catch(() => { status.textContent = "Fant ikke testfila."; });
    return;
  }

  const token = savedToken();
  if (token) load(token);
  let tries = 0;
  const wait = setInterval(() => { if (startGoogle() !== false || ++tries > 100) clearInterval(wait); }, 100);
})();
