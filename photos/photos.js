// Bildevisning: miniatyrene øverst velger bildet som vises stort under. Piltastene, knappene på
// bildet og sveip blar. Valgt bilde står i adressen (#id), så det kan lenkes til. Uten skript
// virker miniatyrene som vanlige lenker, og CSS viser bildet med :target.
(() => {
  const viewer = document.getElementById("viewer");
  if (!viewer) return;
  const strip = viewer.querySelector(".thumbs");
  const links = [...strip.querySelectorAll("a")];
  const figures = links.map((a) => document.getElementById(a.hash.slice(1)));
  const status = document.getElementById("viewer-status");
  let current = 0;

  // Hold valgt miniatyr synlig i stripa uten å flytte resten av siden.
  function reveal(link) {
    const left = link.offsetLeft, right = left + link.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }

  function show(index, { announce = true, remember = true } = {}) {
    current = (index + figures.length) % figures.length;
    figures.forEach((f, i) => f.classList.toggle("is-current", i === current));
    links.forEach((a, i) => (i === current ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    reveal(links[current]);
    if (remember) history.replaceState(null, "", "#" + figures[current].id);
    if (announce) {
      const title = figures[current].querySelector(".title");
      status.textContent = `Photo ${current + 1} of ${figures.length}: ${title ? title.textContent : ""}`;
    }
  }

  figures.forEach((f, i) => {
    const count = f.querySelector(".count");
    if (count) count.textContent = `${i + 1} / ${figures.length}`;
  });
  viewer.classList.add("js");
  const start = figures.findIndex((f) => "#" + f.id === location.hash);
  show(start < 0 ? 0 : start, { announce: false, remember: false });

  links.forEach((a, i) => a.addEventListener("click", (e) => { e.preventDefault(); show(i); }));
  viewer.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => show(current + Number(b.dataset.step))));
  window.addEventListener("hashchange", () => {
    const i = figures.findIndex((f) => "#" + f.id === location.hash);
    if (i >= 0 && i !== current) show(i, { remember: false });
  });
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
  });

  // Sveip på mobil: vannrett bevegelse på minst 40 px blar ett bilde.
  const stage = viewer.querySelector(".stage");
  let x0 = null, y0 = null;
  stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
  stage.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = y0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener("pointercancel", () => { x0 = y0 = null; });

  // Når siden er ferdig lastet, hentes de andre bildene også, så blaingen går uten venting.
  window.addEventListener("load", () => {
    viewer.querySelectorAll('.frame img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
  });
})();
