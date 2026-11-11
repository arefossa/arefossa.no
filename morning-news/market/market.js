// Market: viser rapportfilene fra Drive-mappa arefossa.no/morning-news/market. Den nyeste vises
// helt, de eldre under «Eldre rapporter». Innloggingen og lesingen fra Drive ligger i ../drive.js.
// Alt fra filene settes som tekst, aldri som HTML. **tekst** i en antakelse blir uthevet.
import { readFolder } from "../drive.js";

// Mappene i Drive følger stiene på siden.
const FOLDER_ID = "1IF8VAXAlgFRPq_Ek5sd-iibbOOli1Mle";

const $ = (id) => document.getElementById(id);
const content = $("content");

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value; else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false || child === "") continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const text = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

// **uthevet** blir <strong>, resten tekst.
function rich(v) {
  return text(v).split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? el("strong", {}, part) : part));
}
const MISSING = /^(ikke funnet|ikke målt|åpen)$/i;
function cell(v, numeric, extra) {
  const value = text(v);
  const cls = [numeric ? "n" : "", MISSING.test(value) ? "na" : "", extra || ""].filter(Boolean).join(" ");
  return el("td", { class: cls || null }, value);
}
function pill(v) {
  const value = text(v);
  const key = value.toLowerCase().replace("å", "a").replace("ø", "o");
  return el("td", {}, value && el("span", { class: "pill " + key }, value));
}
function table(headers, rows) {
  return el("div", { class: "tbl" }, el("table", {},
    el("thead", {}, el("tr", {}, headers.map((h) => el("th", {}, h)))),
    el("tbody", {}, rows)));
}
const small = (v) => text(v) && el("p", { class: "small" }, text(v));
const callout = (label, v) => text(v) && el("p", { class: "note" }, el("strong", {}, label + ": "), text(v));

// ---- Delene av en rapport ----
function movements(m) {
  if (!m) return null;
  const rows = [];
  for (const g of list(m.groups)) {
    rows.push(el("tr", { class: "grp" }, el("td", { colspan: "4" }, text(g.name))));
    for (const r of list(g.rows)) {
      const dir = r.dir === "up" || r.dir === "down" ? r.dir : "";
      rows.push(el("tr", {}, cell(r.market), cell(r.last, true), cell(r.change, true, dir), cell(r.date, true)));
    }
  }
  return el("section", {}, el("h2", {}, "Bevegelser"), small(m.note),
    table(["Marked", "Siste", "Endring", "Dato"], rows), small(m.sources));
}
function analysis(a) {
  if (!a) return null;
  return el("section", {}, el("h2", {}, "Analyse"),
    el("ul", { class: "points" }, list(a.points).map((p) => el("li", {}, text(p.title) && el("strong", {}, text(p.title) + " "), text(p.text)))),
    callout("Regime", a.regime));
}
function accuracy(a) {
  if (!a) return null;
  return el("section", {}, el("h2", {}, text(a.heading) || "Treffsikkerhet"),
    list(a.kpis).length ? el("div", { class: "kpi" }, list(a.kpis).map((k) => el("div", {}, el("b", {}, text(k.value)), el("span", {}, text(k.label))))) : null,
    small(a.rule),
    table(["#", "Antakelse", "Utfall", "Retning", "Intervall", "Resultat"],
      list(a.rows).map((r) => el("tr", {}, cell(r.id, true), cell(r.assumption), cell(r.outcome, true), cell(r.direction), cell(r.range), pill(r.result)))),
    callout("Lærdom", a.lesson));
}
function assumptions(a) {
  if (!a) return null;
  return el("section", {}, el("h2", {}, text(a.heading) || "Nye antakelser"), small(a.note),
    table(["#", "Antakelse", "Utgangsverdi", "Begrunnelse", "Sikkerhet"],
      list(a.rows).map((r) => el("tr", {}, cell(r.id, true), el("td", {}, rich(r.assumption)), cell(r.base, true), cell(r.reason), pill(r.confidence)))));
}
function calendar(c) {
  if (!list(c).length) return null;
  return el("section", {}, el("h2", {}, "Kommende hendelser"),
    table(["Dato", "Hendelse"], list(c).map((r) => el("tr", {}, cell(r.date, true), cell(r.text)))));
}
function log(l) {
  if (!l) return null;
  return el("section", {}, el("h2", {}, "Antakelseslogg"),
    text(l.summary) && el("p", { class: "small" }, rich(l.summary)),
    list(l.rows).length ? table(["Satt", "#", "Antakelse", "Utfall", "Resultat"],
      list(l.rows).map((r) => el("tr", {}, cell(r.set, true), cell(r.id, true), cell(r.assumption), cell(r.outcome, true), pill(r.result)))) : null,
    list(l.rounds).length ? table(["Runde", "Satt", "Målt", "Treff", "Naiv «ingen endring»", "Naiv «samme retning»"],
      list(l.rounds).map((r) => el("tr", {}, cell(r.round, true), cell(r.set, true), cell(r.measured, true), cell(r.hits, true), cell(r.naiveNone, true), cell(r.naiveSame, true)))) : null);
}
function summary(s) {
  return list(s).map((p) => el("p", { class: "small" }, text(p)));
}

function label(r) {
  const parts = [];
  if (r.number) parts.push(`Rapport nr. ${r.number}`);
  const date = text(r.title).replace(/^Markedsrapport\s*/i, "") || text(r.date);
  if (date) parts.push(date);
  return parts.join(" · ");
}

function render(reports) {
  content.replaceChildren();
  if (!reports.length) {
    content.append(el("p", { class: "message" }, "Mappa har ingen rapporter ennå."));
    return;
  }
  const [latest, ...older] = reports;
  $("eyebrow").textContent = [latest.number && `Rapport nr. ${latest.number}`, latest.round && `runde ${latest.round}`].filter(Boolean).join(" · ") || "Morning news";
  $("title").textContent = text(latest.title) || "Market";
  $("intro").textContent = text(latest.note);
  const parts = [summary(latest.summary), movements(latest.movements), analysis(latest.analysis), accuracy(latest.accuracy),
    assumptions(latest.assumptions), calendar(latest.calendar), log(latest.log)];
  for (const p of parts.flat()) if (p) content.append(p);

  if (older.length) {
    content.append(el("section", { class: "older" }, el("h2", {}, "Eldre rapporter"),
      older.map((r) => el("details", {}, el("summary", {}, label(r)),
        el("div", { class: "report" }, small(r.note), summary(r.summary), movements(r.movements), analysis(r.analysis),
          accuracy(r.accuracy), assumptions(r.assumptions))))));
  }
  if (text(latest.footer)) $("footer").textContent = text(latest.footer);
}

readFolder({
  folderId: FOLDER_ID,
  prefix: "rapport-",
  limit: 12,
  render,
  ui: { signin: $("signin"), login: $("login"), status: $("status"), footer: $("footer") },
});
