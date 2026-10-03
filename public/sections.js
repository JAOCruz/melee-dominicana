/* =====================================================================
   Melee Dominicana — secciones después del hero.
   Lounge pixel por capas (parallax 2.5D + teles con clips), podio con focos
   y confeti, roster con iconos de stock, franja VS/REC/RD y ruta del hub.
   Arte 100% propio (canvas pixel). GSAP + ScrollTrigger opcionales: sin
   ellos (o con prefers-reduced-motion) todo queda en su estado final.
   Scroll nativo: nada de smooth-scroll librerías.
   ===================================================================== */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduced;
  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => window.matchMedia("(max-width: 820px)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (motion) document.documentElement.classList.add("has-motion");

  /* ------------------------------------------------------------------ */
  /* Mini motor pixel (mismo espíritu que la estación de Arcova)          */
  /* ------------------------------------------------------------------ */
  const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const outline = (g, x, y, w, h, c) => { px(g, x, y, w, 1, c); px(g, x, y + h - 1, w, 1, c); px(g, x, y, 1, h, c); px(g, x + w - 1, y, 1, h, c); };
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const rgb = (a) => `rgb(${a.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
  const tint = (c, k) => rgb(hex(c).map((v) => v + (255 - v) * k));
  const shade = (c, k) => rgb(hex(c).map((v) => v * k));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return rgb(A.map((v, i) => v + (B[i] - v) * k)); };

  // Fuente 3×5 propia (mayúsculas, dígitos y algo de puntuación)
  const FONT = {
    A: ".x.|x.x|xxx|x.x|x.x", B: "xx.|x.x|xx.|x.x|xx.", C: ".xx|x..|x..|x..|.xx", D: "xx.|x.x|x.x|x.x|xx.", E: "xxx|x..|xx.|x..|xxx",
    F: "xxx|x..|xx.|x..|x..", G: ".xx|x..|x.x|x.x|.xx", H: "x.x|x.x|xxx|x.x|x.x", I: "xxx|.x.|.x.|.x.|xxx", J: "..x|..x|..x|x.x|.x.",
    K: "x.x|x.x|xx.|x.x|x.x", L: "x..|x..|x..|x..|xxx", M: "x.x|xxx|xxx|x.x|x.x", N: "xx.|x.x|x.x|x.x|x.x", O: ".x.|x.x|x.x|x.x|.x.",
    P: "xx.|x.x|xx.|x..|x..", Q: ".x.|x.x|x.x|.x.|..x", R: "xx.|x.x|xx.|x.x|x.x", S: ".xx|x..|.x.|..x|xx.", T: "xxx|.x.|.x.|.x.|.x.",
    U: "x.x|x.x|x.x|x.x|xxx", V: "x.x|x.x|x.x|x.x|.x.", W: "x.x|x.x|xxx|xxx|x.x", X: "x.x|x.x|.x.|x.x|x.x", Y: "x.x|x.x|.x.|.x.|.x.",
    Z: "xxx|..x|.x.|x..|xxx", 0: "xxx|x.x|x.x|x.x|xxx", 1: ".x.|xx.|.x.|.x.|xxx", 2: "xx.|..x|.x.|x..|xxx", 3: "xxx|..x|.xx|..x|xxx",
    4: "x.x|x.x|xxx|..x|..x", 5: "xxx|x..|xx.|..x|xx.", 6: ".xx|x..|xxx|x.x|xxx", 7: "xxx|..x|.x.|.x.|.x.", 8: "xxx|x.x|xxx|x.x|xxx",
    9: "xxx|x.x|xxx|..x|xx.", "#": "x.x|xxx|x.x|xxx|x.x", "-": "...|...|xxx|...|...", ".": "...|...|...|...|.x.", "!": ".x.|.x.|.x.|...|.x.",
    ":": "...|.x.|...|.x.|...", "%": "x.x|..x|.x.|x..|x.x", " ": "...|...|...|...|...", "'": ".x.|.x.|...|...|...",
  };
  function text(g, s, x, y, c, scale = 1) {
    let cx = x;
    for (const ch of String(s).toUpperCase()) {
      const rows = (FONT[ch] || FONT["."]).split("|");
      rows.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === "x") px(g, cx + i * scale, y + j * scale, scale, scale, c); });
      cx += 4 * scale;
    }
    return cx - x - scale;
  }
  const textW = (s, scale = 1) => String(s).length * 4 * scale - scale;

  // Bandera dominicana (cruz blanca, azul/rojo en cuadrantes) ondeando por columnas
  function flag(g, x, y, w, h, t, amp = 1.6) {
    const cw = Math.floor(w / 2) - 1, ch = Math.floor(h / 2) - 1;
    for (let i = 0; i < w; i++) {
      const dy = t == null ? 0 : Math.round(Math.sin(t / 220 + i / 2.2) * (i / w) * amp);
      const sh = t == null ? 1 : 0.86 + 0.14 * Math.cos(t / 220 + i / 2.2);
      for (let j = 0; j < h; j++) {
        const cross = i === cw || i === cw + 1 || j === ch || j === ch + 1;
        const left = i < cw, top = j < ch;
        const base = cross ? "#f3f4f6" : left === top ? "#1d4ed8" : "#e11d48";
        px(g, x + i, y + j + dy, 1, 1, shade(base, sh));
      }
    }
  }

  // Persona sentada vista de espaldas con control (silueta propia; sin personajes de nadie)
  function person(g, x, y, p, t, hype) {
    const bob = t == null ? 0 : Math.floor(t / 420 + p.seed) % 4 === 0 ? 1 : 0;
    const jig = t == null ? 0 : Math.floor(t / 170 + p.seed * 3) % 3 === 0 ? 1 : 0;
    const hy = y + bob;
    // torso / hoodie
    px(g, x, hy + 11, 18, 10, p.shirt); px(g, x, hy + 11, 18, 1, tint(p.shirt, 0.25)); px(g, x + 17, hy + 11, 1, 10, shade(p.shirt, 0.7));
    px(g, x + 6, hy + 11, 6, 2, shade(p.shirt, 0.75)); // capucha caída
    // cuello
    px(g, x + 7, hy + 9, 4, 2, p.skin);
    // cabeza
    px(g, x + 5, hy + 1, 8, 9, p.skin); px(g, x + 5, hy + 1, 1, 9, shade(p.skin, 0.8));
    if (p.style === "cap") { px(g, x + 5, hy, 8, 4, p.acc); px(g, x + 4, hy + 3, 10, 1, shade(p.acc, 0.7)); px(g, x + 8, hy + 4, 2, 1, p.acc); }
    else if (p.style === "afro") { px(g, x + 3, hy - 1, 12, 7, p.hair); px(g, x + 4, hy - 2, 10, 1, p.hair); px(g, x + 5, hy + 6, 8, 1, p.hair); }
    else if (p.style === "headset") { px(g, x + 5, hy, 8, 4, p.hair); px(g, x + 4, hy + 2, 10, 1, "#1f2937"); px(g, x + 3, hy + 3, 2, 4, "#374151"); px(g, x + 13, hy + 3, 2, 4, "#374151"); px(g, x + 3, hy + 4, 1, 1, "#ef4444"); }
    else { px(g, x + 5, hy, 8, 4, p.hair); px(g, x + 4, hy + 2, 1, 5, p.hair); px(g, x + 13, hy + 2, 1, 5, p.hair); }
    if (hype) {
      // brazos arriba (hype)
      px(g, x - 2, hy + 3, 3, 9, p.shirt); px(g, x + 17, hy + 3, 3, 9, p.shirt);
      px(g, x - 2, hy + 1, 3, 2, p.skin); px(g, x + 17, hy + 1, 3, 2, p.skin);
      px(g, x + 16, hy - 2 - jig, 7, 3, p.pad); px(g, x + 17, hy - 2 - jig, 5, 1, tint(p.pad, 0.3));
    } else {
      // codos a los lados, control sobre las piernas (se ve por encima del respaldo)
      px(g, x - 2, hy + 12, 3, 7, p.shirt); px(g, x + 17, hy + 12, 3, 7, p.shirt);
      px(g, x - 1, hy + 19, 2, 2, p.skin); px(g, x + 17, hy + 19, 2, 2, p.skin);
      px(g, x + 5, hy + 18 + jig, 8, 3, p.pad); px(g, x + 6, hy + 18 + jig, 6, 1, tint(p.pad, 0.3)); px(g, x + 6, hy + 19 + jig, 1, 1, "#9ca3af"); px(g, x + 11, hy + 19 + jig, 1, 1, "#22c55e");
      px(g, x + 3, hy + 18 + jig, 2, 2, p.skin); px(g, x + 13, hy + 18 + jig, 2, 2, p.skin);
    }
  }

  function crtStand(g, x, y, w, h, c) { // mueble/mesa con patas y una sombra
    px(g, x, y, w, h, c); px(g, x, y, w, 1, tint(c, 0.2)); px(g, x, y + h - 1, w, 1, shade(c, 0.6)); px(g, x + w - 1, y, 1, h, shade(c, 0.7));
    px(g, x + 2, y + h, 3, 6, shade(c, 0.55)); px(g, x + w - 5, y + h, 3, 6, shade(c, 0.55));
    px(g, x - 2, y + h + 6, w + 4, 2, "rgba(0,0,0,.35)");
  }
  function trophy(g, x, y, c = "#e3b341") {
    px(g, x, y, 7, 4, c); px(g, x + 1, y, 1, 2, tint(c, 0.5)); px(g, x - 1, y + 1, 1, 2, c); px(g, x + 7, y + 1, 1, 2, c);
    px(g, x + 1, y + 4, 5, 1, shade(c, 0.8)); px(g, x + 3, y + 5, 1, 2, shade(c, 0.8)); px(g, x + 1, y + 7, 5, 2, "#78350f"); px(g, x + 1, y + 7, 5, 1, "#a16207");
  }
  function plant(g, x, y) {
    px(g, x + 2, y + 10, 8, 7, "#7c2d12"); px(g, x + 2, y + 10, 8, 1, "#9a3412"); px(g, x + 3, y + 17, 6, 1, "#431407");
    px(g, x + 5, y + 3, 2, 8, "#166534"); px(g, x, y + 4, 5, 3, "#16a34a"); px(g, x + 7, y + 2, 5, 3, "#16a34a"); px(g, x + 2, y, 4, 3, "#22c55e"); px(g, x + 6, y + 6, 4, 3, "#15803d");
  }
  function cube(g, x, y) { // consola cúbica morada con asa
    px(g, x, y + 2, 10, 7, "#5b21b6"); px(g, x, y + 2, 10, 1, "#7c3aed"); px(g, x + 9, y + 2, 1, 7, "#3b0f82"); px(g, x + 1, y + 8, 8, 1, "#3b0f82");
    px(g, x + 3, y, 4, 2, "#4c1d95"); for (let i = 0; i < 4; i++) px(g, x + 1 + i * 2, y + 4, 1, 1, "#1e1b4b"); px(g, x + 2, y + 6, 6, 1, "#4c1d95");
  }
  function pad(g, x, y, c) { px(g, x, y, 7, 3, c); px(g, x, y, 7, 1, tint(c, 0.25)); px(g, x + 1, y + 1, 1, 1, "#9ca3af"); px(g, x + 5, y + 1, 1, 1, "#22c55e"); }
  function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) px(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, c); }
  function pool(g, cx, cy, rx, ry, c, a) { // charco de luz (elipse suave)
    g.save(); g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }

  /* ------------------------------------------------------------------ */
  /* LOUNGE: el cuarto (400×225 px lógicos)                               */
  /* ------------------------------------------------------------------ */
  const RW = 400, RH = 225, FLOOR = 150;
  const PEOPLE = [
    { x: 150, y: 150, seed: 0, skin: "#a9693a", hair: "#15100d", shirt: "#b91c1c", acc: "#1d4ed8", pad: "#5b21b6", style: "cap" },
    { x: 190, y: 148, seed: 1, skin: "#5a3a24", hair: "#0f0a08", shirt: "#e5e7eb", acc: "#e3b341", pad: "#374151", style: "afro" },
    { x: 232, y: 151, seed: 2, skin: "#c58c5a", hair: "#3b2416", shirt: "#1e40af", acc: "#e11d48", pad: "#e11d48", style: "headset" },
  ];
  const WINDOW = { x: 24, y: 20, w: 72, h: 54 };
  const NEON = { x: 148, y: 10, w: 104, h: 30 };

  function drawRoomBG(g) {
    // pared: paneles oscuros con listones
    px(g, 0, 0, RW, FLOOR, "#141729");
    for (let x = 0; x < RW; x += 24) px(g, x + 22, 0, 2, FLOOR, "#171a2e");
    for (let y = 0; y < FLOOR; y += 6) for (let x = (y / 6) % 2 ? 0 : 12; x < RW; x += 24) px(g, x + 3, y + 2, 1, 1, "#1b1f36");
    px(g, 0, 0, RW, 3, "#0b0d18"); // cornisa
    px(g, 0, FLOOR - 6, RW, 6, "#20233a"); px(g, 0, FLOOR - 6, RW, 1, "#2c3050"); px(g, 0, FLOOR - 1, RW, 1, "#0b0d18"); // zócalo
    // piso: baldosas con alfombra central
    for (let y = FLOOR; y < RH; y += 12) for (let x = 0; x < RW; x += 12) { const odd = ((x / 12 + (y - FLOOR) / 12) % 2) === 0; px(g, x, y, 12, 12, odd ? "#1a1d30" : "#161929"); px(g, x, y, 12, 1, "#20233a"); }
    px(g, 92, 162, 216, 58, "#1e3a8a"); px(g, 95, 165, 210, 52, "#4a1d2a"); px(g, 99, 169, 202, 44, "#5a2434");
    for (let i = 0; i < 6; i++) px(g, 110 + i * 34, 188, 10, 6, "#64283a");
    // ventana con noche, estrellas y la bandera en el asta de afuera
    const W = WINDOW;
    px(g, W.x - 4, W.y - 4, W.w + 8, W.h + 8, "#2a2740"); px(g, W.x - 4, W.y - 4, W.w + 8, 2, "#3a3652");
    px(g, W.x, W.y, W.w, W.h, "#0b1230"); px(g, W.x, W.y, W.w, 14, "#0d1538");
    [[6, 6], [20, 10], [33, 4], [48, 12], [60, 7], [14, 20], [66, 18], [40, 22]].forEach(([sx, sy], i) => px(g, W.x + sx, W.y + sy, 1, 1, i % 3 ? "#ffffff88" : "#ffffffcc"));
    // ciudad: bloques con ventanitas
    [[0, 26, 10, 28], [10, 32, 8, 22], [18, 22, 12, 32], [30, 36, 9, 18], [39, 28, 11, 26], [50, 34, 8, 20], [58, 24, 14, 30]].forEach(([bx, by, bw, bh]) => {
      px(g, W.x + bx, W.y + by, bw, bh, "#151a3a"); for (let yy = by + 3; yy < by + bh - 2; yy += 4) for (let xx = bx + 2; xx < bx + bw - 1; xx += 3) if (((xx * 7 + yy * 3) % 5) < 2) px(g, W.x + xx, W.y + yy, 1, 1, "#e3b34166");
    });
    px(g, W.x, W.y + W.h - 3, W.w, 3, "#1e2a4a"); // mar/horizonte
    px(g, W.x + W.w / 2 - 1, W.y, 2, W.h, "#2a2740"); px(g, W.x, W.y + W.h / 2 - 1, W.w, 2, "#2a2740"); // cruz del marco
    px(g, W.x - 6, W.y + W.h + 4, W.w + 12, 3, "#3a3652"); // repisa de la ventana
    // base del neón MELEE DOMINICANA
    px(g, NEON.x, NEON.y, NEON.w, NEON.h, "#0c0b16"); outline(g, NEON.x, NEON.y, NEON.w, NEON.h, "#2a2740");
    // póster del bracket "TOP 8"
    px(g, 300, 24, 46, 54, "#f5f3ee"); outline(g, 300, 24, 46, 54, "#2b2540"); text(g, "TOP 8", 306, 29, "#e11d48", 1);
    for (let i = 0; i < 4; i++) { px(g, 306, 40 + i * 6, 10, 2, i % 2 ? "#1d4ed8" : "#e11d48"); px(g, 316, 40 + i * 6, 1, i % 2 ? 1 : 7, "#64748b"); }
    px(g, 316, 43, 6, 1, "#64748b"); px(g, 316, 55, 6, 1, "#64748b"); px(g, 322, 43, 1, 13, "#64748b"); px(g, 322, 49, 6, 1, "#64748b"); px(g, 328, 46, 1, 7, "#64748b");
    px(g, 328, 49, 5, 1, "#e3b341"); px(g, 333, 47, 5, 5, "#e3b341"); px(g, 334, 48, 1, 1, "#fde68a");
    px(g, 306, 66, 34, 1, "#cbd5e1"); px(g, 306, 69, 24, 1, "#cbd5e1"); px(g, 306, 72, 28, 1, "#cbd5e1");
    // póster rojo "GG" con un play
    px(g, 356, 30, 30, 40, "#7f1d1d"); outline(g, 356, 30, 30, 40, "#2b2540"); text(g, "GG", 364, 36, "#fde68a", 2);
    px(g, 367, 54, 2, 10, "#fff"); px(g, 369, 56, 2, 6, "#fff"); px(g, 371, 58, 2, 2, "#fff");
    // repisa con trofeos y medallas
    px(g, 104, 66, 44, 2, "#8a7a6a"); px(g, 104, 68, 44, 1, "#5a4a3a"); trophy(g, 108, 57); trophy(g, 136, 58, "#cbd5e1");
    [120, 127].forEach((mx, i) => { px(g, mx, 56, 1, 5, "#1d4ed8"); px(g, mx + 1, 56, 1, 5, "#e11d48"); px(g, mx - 1, 61, 3, 3, i ? "#cbd5e1" : "#e3b341"); });
    // banderines RD cruzando la pared
    for (let i = 0; i < 20; i++) { const bx = 6 + i * 20, by = 4 + (i % 2); const c = ["#e11d48", "#f3f4f6", "#1d4ed8"][i % 3]; px(g, bx, by, 6, 1, c); px(g, bx + 1, by + 1, 4, 1, c); px(g, bx + 2, by + 2, 2, 1, c); px(g, bx + 2, by + 3, 1, 1, c); }
    // brillo del neón sobre la pared (estático)
    pool(g, NEON.x + NEON.w / 2, NEON.y + 12, 90, 30, "#ce1126", 0.1);
    pool(g, NEON.x + NEON.w / 2, NEON.y + 24, 70, 18, "#2f6fd1", 0.1);
    // aire fresco: lámpara de techo de la ventana
    px(g, 60, 0, 1, 8, "#4b5563"); px(g, 55, 8, 11, 4, "#374151"); px(g, 56, 12, 9, 1, "#fde68a");
    pool(g, 60, 22, 26, 18, "#fde68a", 0.07);
  }

  function drawRoomMid(g) {
    // mueble bajo la tele central con la consola y cables
    crtStand(g, 136, 138, 128, 22, "#2a2a34"); px(g, 140, 142, 120, 14, "#1a1a22");
    cube(g, 150, 144); px(g, 170, 146, 24, 6, "#2f2f3a"); px(g, 171, 147, 9, 1, "#4b5563"); px(g, 182, 147, 8, 1, "#4b5563"); // cajas de juegos
    pad(g, 200, 148, "#5b21b6"); pad(g, 212, 149, "#3f3f52"); line(g, 160, 153, 200, 151, "#111118"); line(g, 162, 153, 212, 152, "#111118");
    px(g, 232, 146, 20, 7, "#2a1f3d"); px(g, 233, 147, 18, 1, "#4c1d95"); px(g, 236, 149, 2, 2, "#22c55e"); // capturadora
    // mesas laterales para los setups 1 y 2
    crtStand(g, 26, 128, 92, 10, "#2f2f3a"); crtStand(g, 282, 128, 92, 10, "#2f2f3a");
    px(g, 32, 118, 5, 6, "#f8fafc"); text(g, "1", 33, 119, "#1f2937"); px(g, 363, 118, 5, 6, "#f8fafc"); text(g, "2", 364, 119, "#1f2937");
    pad(g, 60, 132, "#3f3f52"); pad(g, 300, 131, "#e11d48");
    // torre de captura junto a la mesa 1
    px(g, 8, 122, 10, 22, "#15151f"); px(g, 9, 123, 8, 1, "#2a2a3a"); px(g, 10, 132, 6, 6, "#0a0a12"); px(g, 11, 133, 4, 4, "#1d4ed8"); line(g, 18, 140, 30, 138, "#111118");
    // asta con bandera dentro del cuarto (la bandera ondea en fx), pedestal con trofeo y mata
    px(g, 384, 96, 1, 56, "#9ca3af"); px(g, 383, 95, 3, 1, "#d4d4d8"); px(g, 381, 150, 7, 2, "#4b5563");
    px(g, 352, 150, 14, 12, "#2d2d3d"); px(g, 354, 152, 10, 1, "#4a4a5c"); trophy(g, 355, 141);
    plant(g, 6, 148); plant(g, 376, 196);
    // mesita de picadera a la derecha del sofá
    px(g, 292, 196, 22, 5, "#3a2a2a"); px(g, 292, 196, 22, 1, "#5a4040"); px(g, 294, 201, 2, 6, "#2a1a1a"); px(g, 310, 201, 2, 6, "#2a1a1a");
    px(g, 296, 191, 4, 5, "#ef4444"); px(g, 296, 191, 4, 1, "#fecaca"); px(g, 303, 193, 7, 3, "#f59e0b"); px(g, 304, 192, 5, 1, "#fde68a");
    // caja con controles apilados
    px(g, 60, 196, 16, 5, "#4a3a2c"); pad(g, 63, 194, "#5b21b6"); pad(g, 64, 191, "#3f3f52"); pad(g, 62, 188, "#e11d48");
  }

  function drawRoomFront(g) {
    // respaldo del sofá (la gente se sienta detrás, se ven hombros y cabezas)
    const sx = 128, sy = 170, sw = 148, sh = 40;
    px(g, sx + 4, sy, sw - 8, sh, "#9f1239"); px(g, sx, sy + 4, sw, sh - 4, "#9f1239");
    px(g, sx + 4, sy, sw - 8, 2, "#be123c"); px(g, sx, sy + 4, 2, sh - 4, "#be123c");
    px(g, sx + 4, sy + sh - 6, sw - 8, 6, "#881337"); px(g, sx + sw - 2, sy + 4, 2, sh - 4, "#881337");
    for (let i = 0; i < 3; i++) px(g, sx + 14 + i * 46, sy + 6, 32, 1, "#be123c"); // costuras
    px(g, sx + 10, sy + 12, 8, 5, "#1d4ed8"); px(g, sx + sw - 18, sy + 12, 8, 5, "#1d4ed8"); // cojines
    px(g, sx - 2, sy + sh, sw + 4, 3, "rgba(0,0,0,.4)");
  }

  // Capa animada: bandera, neón, personas, LEDs, charcos de luz de las teles
  function drawRoomFX(g, t, hype, clear = true) {
    if (clear) g.clearRect(0, 0, RW, RH);
    const W = WINDOW;
    // bandera fuera de la ventana (asta) y bandera del interior
    px(g, W.x + 50, W.y + 8, 1, 30, "#9ca3af"); flag(g, W.x + 51, W.y + 9, 16, 11, t, 1.8);
    flag(g, 385, 97, 16, 11, t == null ? null : t + 900, 1.6);
    // neón con parpadeo ocasional
    const fl = t == null ? 1 : Math.sin(t / 113) > 0.96 ? 0.35 : 1;
    const red = mix("#0c0b16", "#ff3b55", fl), blue = mix("#0c0b16", "#60a5fa", fl);
    text(g, "MELEE", NEON.x + 12, NEON.y + 4, red, 2); text(g, "DOMINICANA", NEON.x + 13, NEON.y + 18, blue, 1);
    px(g, NEON.x + 10, NEON.y + 15, NEON.w - 20, 1, mix("#0c0b16", "#7f1d1d", fl));
    pool(g, NEON.x + NEON.w / 2, NEON.y + 10, 70, 16, "#ff3b55", 0.08 * fl);
    // charcos de luz de las teles
    const k = t == null ? 1 : 0.8 + 0.2 * Math.sin(t / 180);
    pool(g, 200, 150, 70, 14, "#93c5fd", 0.12 * k); pool(g, 72, 134, 38, 8, "#93c5fd", 0.08 * k); pool(g, 328, 134, 38, 8, "#fda4af", 0.08 * k);
    // gente en el sofá
    PEOPLE.forEach((p) => person(g, p.x, p.y, p, t, hype));
    // LEDs
    px(g, 11, 127, 2, 1, t == null || Math.floor(t / 300) % 3 ? "#e11d48" : "#450a0a");
    px(g, 14, 127, 2, 1, t == null || Math.floor(t / 450) % 2 ? "#1d4ed8" : "#1e3a8a");
    px(g, 158, 150, 2, 1, t == null || Math.floor(t / 700) % 2 ? "#f97316" : "#7c2d12");
  }

  // Teles pixel (solo para la og.png: en la página las teles son botones DOM con la miniatura del clip)
  function crt(g, x, y, w, h) {
    px(g, x, y, w, h, "#3a3d52"); px(g, x, y, w, 2, "#55597a"); px(g, x, y, 2, h, "#4b4e66"); px(g, x + w - 2, y, 2, h, "#262839"); px(g, x, y + h - 2, w, 2, "#1c1c24");
    px(g, x + 5, y + 5, w - 18, h - 10, "#15151c"); px(g, x + 7, y + 7, w - 22, h - 14, "#0c1733");
    px(g, x + w - 11, y + 7, 6, 6, "#7f1d1d"); px(g, x + w - 11, y + 16, 6, 6, "#1a1b26"); px(g, x + w - 11, y + 25, 6, 6, "#1a1b26");
    px(g, x - 2, y + h, w + 4, 3, "rgba(0,0,0,.4)");
  }
  function drawRoomTVs(g) {
    crt(g, 136, 40, 130, 100); const sx = 143, sy = 47, sw = 108, sh = 86;
    px(g, sx, sy, sw, sh, "#1e3a8a"); px(g, sx, sy, sw / 2, sh, "#991b1b"); px(g, sx + sw / 2 - 2, sy, 4, sh, "#f3f4f6");
    text(g, "NOTME", sx + 8, sy + 10, "#fecaca", 2); text(g, "ALORIC", sx + 60, sy + 10, "#bfdbfe", 2);
    text(g, "VS", sx + sw / 2 - 7, sy + 36, "#fde047", 4); text(g, "FT10", sx + sw / 2 - 7, sy + 70, "#f3f4f6", 1);
    for (let i = 0; i < sh; i += 2) px(g, sx, sy + i, sw, 1, "rgba(0,0,0,.14)");
    [[30, 84], [286, 84]].forEach(([x, y]) => {
      crt(g, x, y, 84, 56); const a = x + 7, b = y + 7, w = 62, h = 42;
      px(g, a, b, w, h, "#0c1733"); px(g, a, b, w, 18, "#13204a"); px(g, a + 4, b + h - 8, w - 8, 3, "#9ca3af"); px(g, a + 4, b + h - 8, w - 8, 1, "#e5e7eb");
      sprite(g, FIGHT.idle, a + 18, b + h - 13, "#ff5c6c"); sprite(g, FIGHT.atkL, a + 36, b + h - 13, "#5b9cff");
      for (let i = 0; i < h; i += 2) px(g, a, b + i, w, 1, "rgba(0,0,0,.14)");
    });
  }

  function buildLounge() {
    const scene = $("#roomScene"); if (!scene) return;
    const layers = {};
    ["bg", "mid", "front", "fx"].forEach((k) => {
      const c = $(`.lg-room__${k}`, scene); c.width = RW; c.height = RH; layers[k] = c.getContext("2d", { alpha: k !== "bg" });
    });
    drawRoomBG(layers.bg); drawRoomMid(layers.mid); drawRoomFront(layers.front);
    let hype = false, visible = false, last = 0;
    const draw = (t) => drawRoomFX(layers.fx, reduced ? null : t, hype);
    draw(0);

    // Teles (DOM, clicables) — las posiciones vienen de data-tv en el CSS
    const tvs = $("#tvs");
    const list = $("#clipList");
    const clips = (window.MD && window.MD.clips) || [];
    clips.forEach((c, i) => {
      // La tele grande reproduce el set dentro de la misma tele (iframe de YouTube): es un div con
      // role=button para que el iframe no quede dentro de un <button>.
      const big = c.tv === "big";
      const tv = document.createElement(big ? "div" : "button");
      if (big) { tv.setAttribute("role", "button"); tv.tabIndex = 0; } else tv.type = "button";
      tv.className = `lg-tv lg-tv--${c.tv || "left"}`; tv.dataset.i = i;
      tv.setAttribute("aria-label", `Ver: ${c.title}`);
      tv.innerHTML = `
        <span class="lg-tv__body">
          <span class="lg-tv__screen">
            ${c.video
              ? `<video muted playsinline loop preload="none" poster="${esc(c.poster || "")}" width="576" height="432" aria-hidden="true"><source src="${esc(c.video)}" type="video/mp4" /></video>`
              : `<img src="https://i.ytimg.com/vi/${esc(c.id)}/${c.tv === "big" ? "hqdefault" : "mqdefault"}.jpg" alt="" loading="lazy" width="320" height="180" />`}
            ${c.video ? `<span class="lg-vhs" aria-hidden="true"><b>PLAY ▶</b><i class="lg-vhs__tc">SP 0:00:00</i><span class="lg-vhs__track"></span></span>` : ""}
            <span class="lg-tv__scan"></span>
            <span class="lg-tv__play"><i>▶</i> ${big ? "Ver el set" : "Ver clip"}</span>
          </span>
          <span class="lg-tv__side"><i class="led"></i><i></i><i></i></span>
        </span>
        <span class="lg-tv__plate">${esc(c.tag)}</span>`;
      const playInTv = () => {
        if (tv.classList.contains("is-live")) return;
        const screen = tv.querySelector(".lg-tv__screen");
        const v = screen.querySelector("video"); if (v) v.pause();
        screen.insertAdjacentHTML("beforeend", `<iframe class="lg-tv__live" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.id)}?autoplay=1&rel=0&playsinline=1&start=${c.start || 0}" title="${esc(c.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe><button type="button" class="lg-tv__off" aria-label="Apagar la tele">✕</button>`);
        tv.classList.add("is-live"); tv.removeAttribute("role"); tv.removeAttribute("tabindex");
        screen.querySelector(".lg-tv__off").addEventListener("click", (e) => {
          e.stopPropagation();
          screen.querySelectorAll(".lg-tv__live, .lg-tv__off").forEach((n) => n.remove());
          tv.classList.remove("is-live"); tv.setAttribute("role", "button"); tv.tabIndex = 0;
          if (v && visible && !reduced) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        });
      };
      if (big) {
        tv.addEventListener("click", playInTv);
        tv.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playInTv(); } });
      } else tv.addEventListener("click", () => window.MD_openPlayer && window.MD_openPlayer(c));
      if (c.tv === "big") { tv.addEventListener("pointerenter", () => { hype = true; }); tv.addEventListener("pointerleave", () => { hype = false; }); tv.addEventListener("focus", () => { hype = true; }); tv.addEventListener("blur", () => { hype = false; }); }
      tv.addEventListener("pointerenter", () => list && list.querySelectorAll("li").forEach((li) => li.classList.toggle("is-on", +li.dataset.i === i)));
      tv.addEventListener("pointerleave", () => list && list.querySelectorAll("li").forEach((li) => li.classList.remove("is-on")));
      tvs.appendChild(tv);
      if (list) {
        const li = document.createElement("li"); li.dataset.i = i;
        li.innerHTML = `<button type="button"><small>${esc(c.tag)}</small><b>${esc(c.title)}</b></button>`;
        li.querySelector("button").addEventListener("click", () => { if (big) { tv.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }); playInTv(); } else if (window.MD_openPlayer) window.MD_openPlayer(c); });
        li.addEventListener("pointerenter", () => tv.classList.add("is-hot")); li.addEventListener("pointerleave", () => tv.classList.remove("is-hot"));
        list.appendChild(li);
      }
    });

    // Loop de la capa fx a ~15 fps (pixel art a pasos), solo con el cuarto en pantalla
    const tick = (t) => { if (!visible) return; if (t - last > 66) { last = t; draw(t); } requestAnimationFrame(tick); };
    const videos = $$("video", tvs);
    // Contador estilo VCR sobre el clip
    videos.forEach((v) => {
      const tc = v.parentElement.querySelector(".lg-vhs__tc"); if (!tc) return;
      const pad = (n) => String(n).padStart(2, "0");
      v.addEventListener("timeupdate", () => { const t = Math.floor(v.currentTime); tc.textContent = `SP 0:${pad(Math.floor(t / 60))}:${pad(t % 60)}`; });
    });
    const playVideos = (on) => { if (reduced) return; videos.forEach((v) => { if (on && v.closest(".is-live")) return; if (on) { if (v.preload === "none") v.preload = "auto"; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); }); };
    new IntersectionObserver((en) => { const was = visible; visible = en[0].isIntersecting; if (visible && !was && !reduced) requestAnimationFrame(tick); playVideos(visible); }, { rootMargin: "80px" }).observe(scene);
    document.addEventListener("visibilitychange", () => playVideos(visible && document.visibilityState === "visible"));

    // Móvil: el cuarto se desliza; centramos la tele grande y damos un pelín de parallax al paneo
    const vp = $("#roomViewport");
    const centerRoom = () => { if (isMobile()) vp.scrollLeft = (scene.offsetWidth - vp.clientWidth) / 2; };
    centerRoom(); window.addEventListener("resize", centerRoom);
    vp.addEventListener("scroll", () => {
      if (!isMobile()) return;
      const o = vp.scrollLeft - (scene.offsetWidth - vp.clientWidth) / 2;
      scene.style.setProperty("--panx", (o * 0.12).toFixed(1) + "px");
      scene.style.setProperty("--panf", (o * -0.06).toFixed(1) + "px");
    }, { passive: true });

    // Parallax 2.5D: scroll (eje y) + puntero (eje x)
    if (motion) {
      const L = ["bg", "mid", "front", "fx"].map((k) => $(`.lg-room__${k}`, scene));
      const [bg, mid, front, fx] = L;
      const depth = [[bg, -0.035], [mid, -0.015], [tvs, -0.015], [front, 0.03], [fx, 0.03]];
      depth.forEach(([el, d]) => gsap.fromTo(el, { "--py": () => -d * scene.offsetHeight + "px" }, { "--py": () => d * scene.offsetHeight + "px", ease: "none", scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } }));
      if (hoverable) {
        const setters = [[bg, 6], [mid, 10], [tvs, 10], [front, 16], [fx, 16]].map(([el, k]) => [gsap.quickTo(el, "--px", { duration: 0.6, ease: "power3" }), k]);
        const room = $("#room");
        room.addEventListener("pointermove", (e) => { const r = room.getBoundingClientRect(); const nx = ((e.clientX - r.left) / r.width - 0.5) * 2; setters.forEach(([to, k]) => to((-nx * k).toFixed(1) + "px")); });
        room.addEventListener("pointerleave", () => setters.forEach(([to]) => to("0px")));
      }
      // entrada: el cuarto "enciende" (las teles se prenden en cascada)
      gsap.from($$(".lg-tv", tvs), { opacity: 0, y: 14, duration: 0.5, ease: "steps(5)", stagger: 0.12, clearProps: "opacity,transform", scrollTrigger: { trigger: scene, start: "top 80%", once: true } });
    }
    // Hook para generar og.png (herramienta interna): dibuja el cuarto completo en un contexto
    window.MD_room = { W: RW, H: RH, draw(ctx, t = 0) { drawRoomBG(ctx); drawRoomMid(ctx); drawRoomTVs(ctx); drawRoomFront(ctx); drawRoomFX(ctx, t, false, false); } };
  }

  /* ------------------------------------------------------------------ */
  /* TORNEOS: focos y confeti sobre el podio                              */
  /* ------------------------------------------------------------------ */
  function confetti(host) {
    const cv = document.createElement("canvas"); cv.className = "rs-confetti"; cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);
    const g = cv.getContext("2d");
    const W = (cv.width = host.offsetWidth), H = (cv.height = host.offsetHeight + 40);
    const cols = ["#ce1126", "#2f6fd1", "#f5f5f5", "#e3b341"];
    const ps = Array.from({ length: Math.min(160, Math.round(W / 6)) }, () => ({
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 9, s: 3 + Math.round(Math.random() * 3),
      c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6.28, w: (Math.random() - 0.5) * 0.3,
    }));
    let t0 = 0;
    const step = (t) => {
      if (!t0) t0 = t; const life = (t - t0) / 1000;
      g.clearRect(0, 0, W, H);
      let alive = 0;
      ps.forEach((p) => {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.r += p.w;
        if (p.y < H) { alive++; const s = p.s * Math.abs(Math.cos(p.r)) + 1; px(g, p.x, p.y, s, p.s, p.c); }
      });
      if (alive && life < 4) requestAnimationFrame(step); else cv.remove();
    };
    requestAnimationFrame(step);
  }
  let confettiDone = false;
  function dressPodium(root) {
    const podium = $(".rs-podium", root); if (!podium || podium.dataset.lit) return;
    podium.dataset.lit = "1";
    podium.insertAdjacentHTML("afterbegin", `<div class="rs-lights" aria-hidden="true"><i class="rs-spot rs-spot--l"></i><i class="rs-spot rs-spot--c"></i><i class="rs-spot rs-spot--r"></i></div>`);
    const light = () => { podium.classList.add("is-lit"); if (!confettiDone && !reduced) { confettiDone = true; setTimeout(() => confetti(podium), 450); } };
    if (!motion) { light(); return; }
    ScrollTrigger.create({ trigger: podium, start: "top 78%", once: true, onEnter: light });
    // filas de la tabla entran en cascada
    const rows = $$(".rs-row", root);
    if (rows.length) gsap.from(rows, { opacity: 0, x: -12, duration: 0.4, ease: "power2", stagger: 0.04, clearProps: "opacity,transform", scrollTrigger: { trigger: $(".rs-table", root), start: "top 85%", once: true } });
  }
  function buildTorneos() {
    const res = $(".results"); if (!res) return;
    document.addEventListener("md:results", (e) => { dressPodium(e.target); if (hasGsap) ScrollTrigger.refresh(); });
    if ($(".rs-podium", res)) dressPodium(res);
  }

  /* ------------------------------------------------------------------ */
  /* ESCENA: franja VS/REC/RD + roster con iconos de stock                */
  /* ------------------------------------------------------------------ */
  const FIGHT = { idle: [".x.", "xxx", ".x.", "x.x", "x.x"], atkR: [".x..", "xxxx", ".x..", "x.x.", "x.x."], atkL: ["..x.", "xxxx", "..x.", ".x.x", ".x.x"], jump: [".x.", "xxx", ".x.", "xxx", "..."] };
  const sprite = (g, rows, x, y, c) => rows.forEach((r, j) => [...r].forEach((ch, i) => ch === "x" && px(g, x + i, y + j, 1, 1, c)));
  function buildPillars() {
    const cvs = $$(".sc-pillar canvas"); if (!cvs.length) return;
    const ctxs = cvs.map((c) => { c.width = 40; c.height = 20; return c.getContext("2d"); });
    let visible = false;
    const draw = (t) => {
      const [vs, rec, rd] = ctxs;
      // VS: dos siluetas que se acercan y golpean
      vs.clearRect(0, 0, 40, 20); px(vs, 2, 16, 36, 2, "#6b7383"); px(vs, 2, 16, 36, 1, "#c3c9d4");
      const ph = t == null ? 0.5 : (t / 1400) % 1; const atk = ph > 0.55 && ph < 0.8;
      const d = atk ? 0 : Math.round(Math.abs(Math.sin(ph * Math.PI)) * 4);
      sprite(vs, atk ? FIGHT.atkR : FIGHT.idle, 13 - d, 11, "#ff5c6c"); sprite(vs, atk ? FIGHT.atkL : ph > 0.3 && ph < 0.5 ? FIGHT.jump : FIGHT.idle, 23 + d, atk ? 9 : 11, "#5b9cff");
      if (atk) { px(vs, 20, 10, 1, 3, "#fde047"); px(vs, 19, 11, 3, 1, "#fde047"); }
      // REC: punto rojo intermitente + barras de audio
      rec.clearRect(0, 0, 40, 20); const on = t == null || Math.floor(t / 500) % 2 === 0;
      px(rec, 4, 4, 4, 4, on ? "#ff3b55" : "#5a1620"); text(rec, "REC", 11, 4, on ? "#f5f5f5" : "#8a8ca3");
      for (let i = 0; i < 9; i++) { const h = t == null ? 3 + (i % 4) : 2 + Math.round(Math.abs(Math.sin(t / 160 + i * 1.3)) * 6); px(rec, 4 + i * 4, 17 - h, 2, h, i % 3 ? "#2f6fd1" : "#e3b341"); }
      // RD: bandera ondeando
      rd.clearRect(0, 0, 40, 20); px(rd, 6, 2, 1, 17, "#9ca3af"); flag(rd, 7, 3, 22, 14, t, 1.4);
    };
    draw(reduced ? null : 0);
    let last = 0;
    const tick = (t) => { if (!visible) return; if (t - last > 66) { last = t; draw(t); } requestAnimationFrame(tick); };
    new IntersectionObserver((en) => { const was = visible; visible = en.some((x) => x.isIntersecting); if (visible && !was && !reduced) requestAnimationFrame(tick); }).observe(cvs[0].closest(".sc-pillars"));
  }

  const FLAGS = {
    RD: `<svg viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="12" fill="#f5f5f5"/><rect width="7" height="5" fill="#002d62"/><rect x="9" width="7" height="5" fill="#ce1126"/><rect y="7" width="7" height="5" fill="#ce1126"/><rect x="9" y="7" width="7" height="5" fill="#002d62"/></svg>`,
    PR: `<svg viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="12" fill="#f5f5f5"/><rect width="16" height="2" fill="#ce1126"/><rect y="5" width="16" height="2" fill="#ce1126"/><rect y="10" width="16" height="2" fill="#ce1126"/><polygon points="0,0 8,6 0,12" fill="#1d4ed8"/><rect x="2" y="5" width="2" height="2" fill="#f5f5f5"/></svg>`,
  };
  const normTag = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  async function buildRoster() {
    const roster = $("#roster"); if (!roster || !window.MD) return;
    const { players, tournaments = [] } = window.MD;
    const STOCK = window.MD_STOCK || {}, CHARS = window.MD_CHARS || {};
    // Puestos en torneos publicados (md1.json): se cruzan por tag o aka
    const placed = {};
    for (const t of tournaments) {
      try {
        const data = await (await fetch(t.json)).json();
        const singles = data.events.find((e) => !e.standings.some((s) => s.team)) || data.events[0];
        singles.standings.forEach((e) => e.players.forEach((p) => { placed[normTag(p.tag)] = { place: e.placement, short: t.short, entrants: singles.entrants, chars: e.chars }; }));
      } catch { /* sin resultados: las tarjetas salen sin puesto */ }
    }
    roster.innerHTML = players.map((p) => {
      const hit = placed[normTag(p.name)] || placed[normTag(p.aka)];
      let char = p.char, color = p.color || 0;
      if (!char && hit && hit.chars && hit.chars[0]) { char = hit.chars[0].c; color = hit.chars[0].k || 0; }
      const main = p.main || (char && CHARS[char]) || "";
      let icon = `<span class="pc__stock pc__stock--none" aria-hidden="true">?</span>`;
      if (char && STOCK[char]) { const [pre, cols] = STOCK[char]; const k = cols.split(" ")[color] || "DEF"; icon = `<img class="pc__stock" src="stocks/${pre}${k}.png" alt="" width="24" height="24" loading="lazy" />`; }
      return `<article class="pc pc--${p.country === "PR" ? "pr" : "rd"}">
        <span class="pc__flag">${FLAGS[p.country] || FLAGS.RD}<small>${esc(p.country)}</small></span>
        ${icon}
        <h4 class="pc__name">${esc(p.name)}</h4>
        ${p.aka ? `<p class="pc__aka">aka ${esc(p.aka)}</p>` : ""}
        <p class="pc__main">${main ? esc(main) : "Main por confirmar"}</p>
        ${hit ? `<p class="pc__place"><b>${hit.place}º</b> de ${hit.entrants} · ${esc(hit.short)}</p>` : `<p class="pc__place pc__place--none">Sin torneo aún</p>`}
      </article>`;
    }).join("");
    if (motion) gsap.from($$(".pc", roster), { opacity: 0, y: 26, duration: 0.55, ease: "power3", stagger: 0.06, clearProps: "opacity,transform", scrollTrigger: { trigger: roster, start: "top 85%", once: true } });
    if (hasGsap) ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------ */
  /* HUB: ruta paso a paso que se dibuja con el scroll                    */
  /* ------------------------------------------------------------------ */
  function buildRoute() {
    const route = $("#route"); if (!route) return;
    const steps = $$(".hb-step", route);
    const svg = $(".hb-route__svg", route);
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const ghost = mk("path", { class: "hb-path hb-path--ghost" }), glow = mk("path", { class: "hb-path hb-path--glow" }), lit = mk("path", { class: "hb-path hb-path--lit" });
    const comet = mk("rect", { class: "hb-comet", width: 10, height: 10, x: -5, y: -5 });
    svg.append(ghost, glow, lit, comet);
    let L = 1, pts = [];
    function layout() {
      const W = route.offsetWidth, H = route.offsetHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      pts = steps.map((s) => { const n = $(".hb-step__n", s); return { x: n.offsetLeft + s.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + s.offsetTop + n.offsetHeight / 2 }; });
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const my = (a.y + b.y) / 2; d += ` C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`; }
      [ghost, glow, lit].forEach((p) => p.setAttribute("d", d));
      L = lit.getTotalLength() || 1;
      [glow, lit].forEach((p) => { p.style.strokeDasharray = `${L} ${L}`; });
      render(state.p);
    }
    const state = { p: motion ? 0 : 1 };
    function render(p) {
      state.p = p;
      [glow, lit].forEach((el) => { el.style.strokeDashoffset = L * (1 - p); });
      const pt = lit.getPointAtLength(L * p);
      comet.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      comet.style.opacity = p > 0.01 && p < 0.995 ? 1 : 0;
      // un paso se enciende cuando la línea llega a su número
      steps.forEach((s, i) => { const t = i === 0 ? 0 : lengthTo(i) / L; s.classList.toggle("is-on", p >= t - 0.002); });
    }
    const lengthCache = [];
    function lengthTo(i) { // longitud del path hasta el nodo i (búsqueda sobre el path)
      if (lengthCache[i] != null) return lengthCache[i];
      let lo = 0, hi = L; const ty = pts[i].y;
      for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (lit.getPointAtLength(m).y < ty) lo = m; else hi = m; }
      return (lengthCache[i] = lo);
    }
    layout();
    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { lengthCache.length = 0; layout(); }, 80); }).observe(route);
    if (motion) {
      ScrollTrigger.create({ trigger: route, start: "top 70%", end: "bottom 72%", scrub: 0.3, onUpdate: (s) => render(s.progress), onRefresh: () => { lengthCache.length = 0; layout(); } });
      gsap.from($$(".hb-step__card", route), { opacity: 0, y: 30, duration: 0.6, ease: "power3", stagger: 0.1, clearProps: "opacity,transform", scrollTrigger: { trigger: route, start: "top 78%", once: true } });
    } else steps.forEach((s) => s.classList.add("is-on"));
  }

  /* ------------------------------------------------------------------ */
  /* Reveals ligeros entre secciones                                      */
  /* ------------------------------------------------------------------ */
  function reveals() {
    if (!motion) { $$(".rv, .rv-title, .sep").forEach((n) => n.classList.add("is-in")); return; }
    ScrollTrigger.batch(".rv", { start: "top 88%", once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power3", stagger: 0.08, overwrite: true }) });
    $$(".rv-title, .sep").forEach((n) => ScrollTrigger.create({ trigger: n, start: "top 88%", once: true, onEnter: () => n.classList.add("is-in") }));
    // franja marquee: se acelera un poco al hacer scroll (sin Lenis: velocidad desde ScrollTrigger)
    const strip = $(".sc-strip__track");
    if (strip) ScrollTrigger.create({ trigger: ".sc-strip", start: "top bottom", end: "bottom top", onUpdate: (s) => { const v = Math.min(3, 1 + Math.abs(s.getVelocity()) / 900); strip.style.animationDuration = (28 / v).toFixed(2) + "s"; } });
  }

  const start = () => {
    buildLounge();
    buildTorneos();
    buildPillars();
    buildRoster();
    buildRoute();
    reveals();
    if (hasGsap) { ScrollTrigger.refresh(); window.addEventListener("load", () => ScrollTrigger.refresh()); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
