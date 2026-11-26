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
  // Zoomtilstand, brukt av show() og zoomkoden lenger ned.
  const MAX_ZOOM = 5, TAP_ZOOM = 2.5;
  const pointers = new Map();
  let z = { s: 1, x: 0, y: 0 };   // skala og forskyvning for bildet i rammen
  let gesture = null;             // tilstand ved starten av knip eller drag
  let swipe = null;               // startpunkt for sveip, bare med én finger og uten zoom
  let lastTap = 0;

  // Hold valgt miniatyr synlig i stripa uten å flytte resten av siden.
  function reveal(link) {
    const left = link.offsetLeft, right = left + link.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }

  function show(index, { announce = true, remember = true } = {}) {
    resetZoom();
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

  // Zoom i rammen: knip med to fingre, dobbelttrykk eller dobbeltklikk zoomer, og ett finger (eller
  // musa) drar bildet rundt når det er zoomet. Uten zoom blar et vannrett sveip på minst 40 px.
  // Zoomen nullstilles når man bytter bilde.

  const frame = () => figures[current].querySelector(".frame");
  const img = () => frame().querySelector("img");
  const local = (e) => { const r = frame().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function apply(animate = false) {
    const f = frame(), w = f.clientWidth, h = f.clientHeight;
    z.s = Math.min(MAX_ZOOM, Math.max(1, z.s));
    // Bildet skal alltid dekke rammen, så det ikke kan dras ut av synet.
    z.x = Math.min(0, Math.max(w - w * z.s, z.x));
    z.y = Math.min(0, Math.max(h - h * z.s, z.y));
    const i = img();
    i.style.transition = animate ? "transform 0.2s ease" : "none";
    i.style.transform = z.s === 1 ? "" : `translate(${z.x}px, ${z.y}px) scale(${z.s})`;
    f.classList.toggle("is-zoomed", z.s > 1);
  }

  function zoomAt(point, scale, animate) {
    // Punktet under fingeren/musa blir liggende i ro mens skalaen endres.
    const cx = (point.x - z.x) / z.s, cy = (point.y - z.y) / z.s;
    z = { s: scale, x: point.x - cx * scale, y: point.y - cy * scale };
    apply(animate);
  }

  function resetZoom() {
    if (!figures[current]) return;
    z = { s: 1, x: 0, y: 0 };
    pointers.clear();
    gesture = swipe = null;
    apply();
  }

  function beginGesture() {
    const pts = [...pointers.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z: { ...z } };
    } else if (pts.length === 1) {
      gesture = { kind: "drag", p: pts[0], z: { ...z } };
    } else gesture = null;
  }

  const stage = viewer.querySelector(".stage");
  stage.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".frame")) return;
    pointers.set(e.pointerId, local(e));
    e.target.setPointerCapture?.(e.pointerId);
    swipe = pointers.size === 1 && z.s === 1 && e.pointerType !== "mouse" ? { x: e.clientX, y: e.clientY } : null;
    beginGesture();
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (!gesture) return;
    if (gesture.kind === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(MAX_ZOOM, Math.max(1, gesture.z.s * d / gesture.d));
      // Innholdspunktet som var under midten av fingrene, følger midten.
      const cx = (gesture.m.x - gesture.z.x) / gesture.z.s, cy = (gesture.m.y - gesture.z.y) / gesture.z.s;
      z = { s, x: m.x - cx * s, y: m.y - cy * s };
      swipe = null;
      apply();
    } else if (gesture.kind === "drag" && gesture.z.s > 1) {
      const p = pointers.get(e.pointerId);
      z = { s: gesture.z.s, x: gesture.z.x + p.x - gesture.p.x, y: gesture.z.y + p.y - gesture.p.y };
      apply();
    }
  });

  function endPointer(e, cancelled) {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!cancelled && pointers.size === 0) {
      if (swipe) {
        const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swipe = null; show(current + (dx < 0 ? 1 : -1)); return; }
      }
      // Dobbelttrykk på touch. Mus bruker dblclick under.
      if (e.pointerType !== "mouse" && gesture && gesture.kind === "drag" &&
          Math.hypot(p.x - gesture.p.x, p.y - gesture.p.y) < 10) {
        const now = Date.now();
        if (now - lastTap < 300) { lastTap = 0; toggleZoom(p); } else lastTap = now;
      }
    }
    swipe = null;
    beginGesture();
  }
  stage.addEventListener("pointerup", (e) => endPointer(e, false));
  stage.addEventListener("pointercancel", (e) => endPointer(e, true));

  function toggleZoom(point) {
    if (z.s > 1) { z = { s: 1, x: 0, y: 0 }; apply(true); } else zoomAt(point, TAP_ZOOM, true);
  }
  stage.addEventListener("dblclick", (e) => {
    if (!e.target.closest(".frame")) return;
    e.preventDefault();
    toggleZoom(local(e));
  });
  window.addEventListener("resize", () => { if (z.s > 1) resetZoom(); });

  // Når siden er ferdig lastet, hentes de andre bildene også, så blaingen går uten venting.
  window.addEventListener("load", () => {
    viewer.querySelectorAll('.frame img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
  });
})();
