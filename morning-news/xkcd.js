// Viser siste xkcd i boksen på Morning news. Dataene ligger i xkcd.json, som GitHub Action-en
// .github/workflows/xkcd.yml oppdaterer. Bildet lenkes rett fra imgs.xkcd.com.
(async () => {
  const box = document.getElementById("xkcd");
  if (!box) return;
  try {
    const res = await fetch("/morning-news/xkcd.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const c = await res.json();
    const link = `https://xkcd.com/${c.num}/`;
    const date = new Date(Date.UTC(+c.year, +c.month - 1, +c.day));

    box.querySelector(".xkcd-title").textContent = c.title;
    box.querySelector(".xkcd-title").href = link;
    box.querySelector(".xkcd-date").textContent =
      `#${c.num} · ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;

    const img = box.querySelector("img");
    img.src = c.img;
    img.alt = c.title;
    img.title = c.alt; // xkcd-tradisjon: alt-teksten som tooltip
    img.hidden = false;
    box.querySelector(".xkcd-alt").textContent = c.alt;
    box.querySelector(".xkcd-img-link").href = link;
  } catch {
    box.querySelector(".xkcd-title").textContent = "xkcd.com";
    box.querySelector(".xkcd-date").textContent = "Could not load today's comic.";
  }
})();
