// Watch list: viser ukefilene fra Drive-mappa arefossa.no/morning-news/watch som kort.
// Innloggingen og lesingen fra Drive ligger i ../drive.js, felles for sidene under
// /morning-news/. Alt fra filene settes som tekst, aldri som HTML.
import { readFolder } from "../drive.js";

// Mappene i Drive følger stiene på siden.
const FOLDER_ID = "1NXMbgum9zr5CM6Hge1nd1B7PXZwcrLvV";
const WEIGHTS = ["krav", "viktig", "lite"];
const NUM = ["Ingen", "Ett", "To", "Tre", "Fire", "Fem"];

const $ = (id) => document.getElementById(id);
const content = $("content");

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

readFolder({
  folderId: FOLDER_ID,
  prefix: "uke-",
  limit: 8,
  render,
  ui: { signin: $("signin"), login: $("login"), status: $("status"), footer: $("footer") },
});
