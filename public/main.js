(() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Las teles del lounge, el roster y la guía los monta sections.js (usa window.MD y este reproductor).

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
  window.MD_openPlayer = openPlayer;

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
