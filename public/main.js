(() => {
  const { clips, players, hub } = window.MD;
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Teles del lounge
  const tvs = document.getElementById("tvs");
  clips.forEach((c, i) => {
    const tv = el("button", "tv");
    tv.type = "button";
    tv.style.setProperty("--d", `${i * 0.7}s`);
    tv.setAttribute("aria-label", `Ver: ${c.title}`);
    tv.innerHTML = `
      <span class="tv-body">
        <span class="screen">
          <img src="https://i.ytimg.com/vi/${esc(c.id)}/hqdefault.jpg" alt="" loading="lazy" />
          <span class="scan"></span>
          <span class="play">▶</span>
        </span>
        <span class="knobs"><i></i><i></i></span>
      </span>
      <span class="stand"></span>
      <span class="label"><small>${esc(c.tag)}</small>${esc(c.title)}</span>`;
    tv.addEventListener("click", () => openPlayer(c));
    tvs.appendChild(tv);
  });

  // Reproductor (carga YouTube solo al abrir)
  const dlg = document.getElementById("player");
  const frame = document.getElementById("frame");
  function openPlayer(c) {
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.id)}?autoplay=1&rel=0" title="${esc(c.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    document.getElementById("caption").textContent = c.title;
    if (dlg.showModal) dlg.showModal();
    else window.open(`https://youtu.be/${c.id}`, "_blank", "noopener");
  }
  const closePlayer = () => { frame.innerHTML = ""; if (dlg.open) dlg.close(); };
  document.getElementById("close").addEventListener("click", closePlayer);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closePlayer(); });
  dlg.addEventListener("close", () => { frame.innerHTML = ""; });

  // Jugadores
  const roster = document.getElementById("roster");
  players.forEach((p) => {
    const card = el("div", `player-card ${p.country === "PR" ? "pr" : "rd"}`);
    card.innerHTML = `
      <span class="flagchip">${esc(p.country)}</span>
      <b>${esc(p.name)}</b>
      ${p.aka ? `<small>aka ${esc(p.aka)}</small>` : ""}
      ${p.main ? `<em>${esc(p.main)}</em>` : ""}`;
    roster.appendChild(card);
  });

  // Hub
  const grid = document.getElementById("hubgrid");
  hub.forEach((h) => {
    const a = el("a", "hub-card");
    a.href = h.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<b>${esc(h.name)}</b><p>${esc(h.what)}</p><span>Abrir →</span>`;
    grid.appendChild(a);
  });

  // Bandera RD pixelada ondeando
  const cv = document.getElementById("flag");
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, PAD = 3, FH = H - PAD * 2;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BLUE = [0, 45, 98], RED = [206, 17, 38], WHITE = [245, 245, 245];
  const img = ctx.createImageData(W, H);
  function colorAt(x, y) {
    const cx = W / 2, cy = FH / 2, bar = 3;
    if (Math.abs(x - cx + 0.5) < bar / 2 + 0.01 || Math.abs(y - cy + 0.5) < bar / 2 + 0.01) return WHITE;
    const left = x < cx, top = y < cy;
    return left === top ? BLUE : RED;
  }
  function draw(t) {
    img.data.fill(0);
    for (let x = 0; x < W; x++) {
      const amp = (x / W) * 2.2;
      const off = Math.round(Math.sin(x * 0.35 - t * 0.004) * amp);
      const shade = 0.82 + 0.18 * Math.cos(x * 0.35 - t * 0.004);
      for (let y = 0; y < FH; y++) {
        const ty = y + off + PAD;
        if (ty < 0 || ty >= H) continue;
        const c = colorAt(x, y);
        const i = (ty * W + x) * 4;
        img.data[i] = c[0] * shade;
        img.data[i + 1] = c[1] * shade;
        img.data[i + 2] = c[2] * shade;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (!reduce && flagVisible) requestAnimationFrame(draw);
  }
  // Solo anima mientras la bandera está en pantalla
  let flagVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => {
      const was = flagVisible;
      flagVisible = en[0].isIntersecting;
      if (flagVisible && !was && !reduce) requestAnimationFrame(draw);
    }).observe(cv);
  }
  requestAnimationFrame(draw);
})();
