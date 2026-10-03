/* =====================================================================
   Melee Dominicana — Captain Falcon en voxels (escultura original).
   Todo procedural: primitivas (elipsoides, cajas, cápsulas) muestreadas
   en una rejilla + capas de "pintura" (visor, emblema, cinturón…).
   No usa modelos ni texturas del juego. `step` = tamaño del voxel
   (1 = desktop, ~1.6 = móvil con menos cubos).
   ===================================================================== */

// Colores en sRGB [0..1]; falcon3d.js los convierte a lineal.
const C = {
  suit: [0.14, 0.31, 0.74], suitHi: [0.19, 0.38, 0.84], suitDk: [0.09, 0.21, 0.56],
  helmet: [0.16, 0.36, 0.84], helmetDk: [0.08, 0.18, 0.48], trim: [0.05, 0.06, 0.12],
  visor: [1.0, 0.36, 0.10], skin: [0.91, 0.70, 0.54], skinHi: [0.97, 0.78, 0.62], mouth: [0.48, 0.22, 0.18],
  scarf: [0.96, 0.77, 0.30], scarfDk: [0.82, 0.60, 0.19], gold: [0.93, 0.72, 0.27], goldHi: [1.0, 0.86, 0.44],
  glove: [0.84, 0.11, 0.19], gloveDk: [0.62, 0.07, 0.13], cuff: [0.12, 0.05, 0.07], gem: [0.92, 0.10, 0.16],
  brow: [0.46, 0.28, 0.18],
};

const ell = (cx, cy, cz, rx, ry, rz) => ({
  bb: [cx - rx, cx + rx, cy - ry, cy + ry, cz - rz, cz + rz],
  f: (x, y, z) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return a * a + b * b + c * c <= 1; },
});
const box = (cx, cy, cz, hx, hy, hz) => ({
  bb: [cx - hx, cx + hx, cy - hy, cy + hy, cz - hz, cz + hz],
  f: (x, y, z) => Math.abs(x - cx) <= hx && Math.abs(y - cy) <= hy && Math.abs(z - cz) <= hz,
});
const cap = (ax, ay, az, bx, by, bz, r) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1;
  return {
    bb: [Math.min(ax, bx) - r, Math.max(ax, bx) + r, Math.min(ay, by) - r, Math.max(ay, by) + r, Math.min(az, bz) - r, Math.max(az, bz) + r],
    f: (x, y, z) => {
      let t = ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t - x, py = ay + dy * t - y, pz = az + dz * t - z;
      return px * px + py * py + pz * pz <= r * r;
    },
  };
};
const and = (p, cond) => ({ bb: p.bb, f: (x, y, z) => p.f(x, y, z) && cond(x, y, z) });
const region = (bb, cond) => ({ bb, f: cond });

// Emblema de ave (frente del casco). Diseño propio, 13×6.
const EMBLEM = [
  '#...........#',
  '##....#....##',
  '.###.###.###.',
  '..#########..',
  '....#####....',
  '......#......',
];
// Ave de fuego del "Falcon Punch", 25×15 (diseño propio).
const FIREBIRD = [
  '............#............',
  '...........###...........',
  '..........#####..........',
  '#........#######........#',
  '##......#########......##',
  '###....###########....###',
  '####..#############..####',
  '#########################',
  '.#######################.',
  '..#####..#######..#####..',
  '...###....#####....###...',
  '...........###...........',
  '...........###...........',
  '..........##.##..........',
  '..........#...#..........',
];

const hash3 = (x, y, z) => {
  let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function buildFalcon(step = 1) {
  const P = []; // primitivas en orden; las últimas ganan
  const solid = (p, color, extra) => P.push({ p, color, paint: false, ...extra });
  const paint = (p, color, extra) => P.push({ p, color, paint: true, ...extra });

  /* ---------- Torso (traje azul) ---------- */
  solid(ell(0, -4, 0, 10.5, 5.5, 6.4), C.suitDk);                 // caderas (se corta abajo)
  solid(ell(0, 6, 0, 10.8, 8.5, 6.4), C.suit);                    // cintura
  solid(ell(0, 15, 0, 14, 12.5, 7.6), C.suit);                    // masa del pecho
  solid(ell(-5.6, 18.5, 4.6, 6.6, 5, 4.2), C.suitHi);             // pectorales
  solid(ell(5.6, 18.5, 4.6, 6.6, 5, 4.2), C.suitHi);
  paint(region([-0.8, 0.8, 6, 20, 5, 12], (x, y, z) => Math.abs(x) < 0.7 && z > 5.2 && y > 6 && y < 21), C.suitDk); // línea central
  paint(region([-6, 6, 7, 13.5, 4, 12], (x, y, z) => z > 5 && Math.abs(x) < 5.5 && (Math.abs(y - 8.2) < 0.45 || Math.abs(y - 11.6) < 0.45)), C.suitDk); // abdominales
  // Hombros (deltoides) + hombreras doradas
  solid(ell(-14.6, 23, 0, 6.2, 5.6, 5.6), C.suit);
  solid(ell(14.6, 23, 0, 6.2, 5.6, 5.6), C.suit);
  solid(and(ell(-15.2, 24.6, 0, 8.2, 5.6, 7.2), (x, y) => y > 24.2), C.gold);
  solid(and(ell(15.2, 24.6, 0, 8.2, 5.6, 7.2), (x, y) => y > 24.2), C.gold);
  paint(region([-24, 24, 27.5, 31, -8, 8], (x, y) => Math.abs(x) > 9 && Math.abs(x) < 22 && y > 27.6), C.goldHi); // brillo superior
  paint(region([-24, 24, 24, 30, -8, 8], (x, y) => Math.abs(x) > 11 && Math.abs(y - 26.4) < 0.5), C.scarfDk);    // ranura
  // Cinturón + hebilla
  paint(region([-13, 13, -1.4, 2.4, -8, 8], (x, y) => y > -1.4 && y < 2.4), C.gold);
  paint(region([-13, 13, 1.8, 2.5, -8, 8], (x, y) => y > 1.8 && y < 2.5), C.goldHi);
  solid(box(0, 0.5, 6.6, 3.4, 2.5, 1.2), C.goldHi);
  paint(box(0, 0.5, 7.6, 1.3, 1.1, 1), C.gem);

  /* ---------- Cuello y bufanda ---------- */
  solid(cap(0, 22, 0, 0, 33, 0, 4.3), C.skin);
  solid(and(ell(0, 28.6, 0.6, 8.4, 3.4, 7.8), (x, y, z) => !ell(0, 28.6, 0.6, 4.4, 5, 4.4).f(x, y, z)), C.scarf);
  paint(region([-9, 9, 26, 31, -9, 9], (x, y, z) => hash3(Math.round(x * 2), Math.round(y * 2), Math.round(z * 2)) < 0.22), C.scarfDk);
  // nudo y cola flotando hacia atrás-izquierda
  solid(ell(-6.5, 28, 4, 3.2, 3, 3), C.scarf);
  solid(cap(-7, 27.5, 3, -12, 23.5, -2, 2.9), C.scarf);
  solid(cap(-12, 23.5, -2, -20, 20.5, -9, 2.6), C.scarf);
  solid(cap(-20, 20.5, -9, -27, 24.5, -14, 2.3), C.scarfDk);
  solid(cap(-27, 24.5, -14, -33, 21.5, -17, 1.9), C.scarfDk);

  /* ---------- Cabeza ---------- */
  solid(ell(0, 41, 0, 8.6, 9.8, 9), C.skin);                      // cráneo base
  solid(and(ell(0, 41.6, -0.6, 9.7, 10.7, 10.3),                   // casco con apertura facial
    (x, y, z) => !(z > 3.2 && y < 44.6 && Math.abs(x) < 7.4)), C.helmet);
  solid(ell(0, 34.6, 3.6, 5.4, 4.4, 5.8), C.skin);                // mentón / mandíbula
  solid(box(0, 38.6, 9.4, 1, 1.4, 1), C.skinHi);                  // nariz
  paint(region([-3, 3, 35, 36.2, 7, 11], (x, y, z) => z > 7.4 && Math.abs(x) < 2.4 && Math.abs(y - 35.6) < 0.5), C.mouth);
  // Visor rojo-naranja (emisivo) y rebordes oscuros
  paint(region([-9, 9, 39.9, 45.3, 3, 12], (x, y, z) => y >= 39.9 && y <= 45.3 && z > 3.6 && Math.abs(x) < 8.4), C.visor, { glow: 1 });
  paint(region([-10, 10, 39, 40, 3, 12], (x, y, z) => y >= 39 && y < 39.9 && z > 3.6 && Math.abs(x) < 8.9), C.trim);
  paint(region([-10, 10, 45.3, 46.3, 3, 12], (x, y, z) => y > 45.3 && y <= 46.3 && z > 3.6 && Math.abs(x) < 9.3), C.trim);
  // Protectores laterales (orejas) con punto dorado
  solid(ell(-10, 40.6, 0, 2.3, 3.8, 3.8), C.helmetDk);
  solid(ell(10, 40.6, 0, 2.3, 3.8, 3.8), C.helmetDk);
  paint(ell(-11.2, 40.6, 0, 1.3, 2, 2), C.gold, { gold: 1 });
  paint(ell(11.2, 40.6, 0, 1.3, 2, 2), C.gold, { gold: 1 });
  // Cresta dorada
  solid(box(0, 52.2, -3.4, 0.8, 2.3, 6.2), C.gold, { gold: 0.6 });
  // Emblema de ave dorado en la frente
  {
    const rows = EMBLEM.length, cols = EMBLEM[0].length, y0 = 46.4, x0 = -6.5;
    paint(region([x0, x0 + cols, y0, y0 + rows, 4, 13], (x, y, z) => {
      if (z < 4.4) return false;
      const c = Math.floor(x - x0), r = Math.floor(y0 + rows - y);
      return c >= 0 && c < cols && r >= 0 && r < rows && EMBLEM[r][c] === '#';
    }), C.goldHi, { gold: 1 });
  }

  /* ---------- Brazos ---------- */
  // Derecho (x>0): puño en alto hacia la cámara (Falcon Punch)
  solid(cap(15, 22, 0, 25, 13, 4, 4.7), C.suit);
  solid(ell(25, 13, 4, 5.2, 5.2, 5.2), C.suitHi);
  solid(cap(25, 13, 4, 21.5, 24.5, 13, 4.3), C.suit);
  paint(region([15, 28, 21, 28, 8, 18], (x, y, z) => (x - 21.4) ** 2 + (y - 24.8) ** 2 + (z - 13.2) ** 2 < 4.1 ** 2), C.cuff);
  paint(region([15, 28, 23, 26, 8, 18], (x, y, z) => (x - 21.4) ** 2 + (y - 24.8) ** 2 + (z - 13.2) ** 2 < 4.1 ** 2 && Math.abs(y - 24.6) < 0.5), C.gold, { gold: 0.5 });
  solid(ell(20, 29.2, 16.6, 5.2, 4.8, 5.4), C.glove);
  solid(ell(16.2, 29, 18.6, 2.1, 2.2, 2.6), C.glove);           // pulgar
  paint(region([14, 26, 30.5, 35, 11, 23], (x, y, z) => y > 31.3 && z > 15 && Math.abs(x - 20) < 5 && ((Math.round(x - 20) + 20) % 3 === 0)), C.gloveDk); // nudillos
  // Izquierdo (x<0): puño cerrado junto a la cadera
  solid(cap(-15, 22, 0, -21, 11, -2, 4.5), C.suit);
  solid(ell(-21, 11, -2, 4.9, 4.9, 4.9), C.suitHi);
  solid(cap(-21, 11, -2, -17, 1, 5, 4.1), C.suit);
  paint(region([-23, -11, -2, 4.5, 0, 10], (x, y, z) => (x + 16.8) ** 2 + (y - 1.6) ** 2 + (z - 5) ** 2 < 4 ** 2), C.cuff);
  solid(ell(-16, -2.6, 7, 4.9, 4.5, 5.1), C.glove);
  solid(ell(-12.4, -1.6, 9.2, 2, 2, 2.3), C.glove);

  /* ---------- Muestreo en rejilla ---------- */
  const X0 = -36, X1 = 30, Y0 = -8.5, Y1 = 56, Z0 = -19, Z1 = 24;
  const nx = Math.ceil((X1 - X0) / step), ny = Math.ceil((Y1 - Y0) / step), nz = Math.ceil((Z1 - Z0) / step);
  const occ = new Uint8Array(nx * ny * nz);
  const colIdx = new Int16Array(nx * ny * nz).fill(-1);
  const glowA = new Float32Array(nx * ny * nz), goldA = new Float32Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  const palette = [];
  const palKey = new Map();
  const colorId = (c) => { const k = c.join(','); if (!palKey.has(k)) { palKey.set(k, palette.length); palette.push(c); } return palKey.get(k); };
  for (const q of P) q.cid = colorId(q.color);

  for (let k = 0; k < nz; k++) {
    const z = Z0 + (k + 0.5) * step;
    for (let j = 0; j < ny; j++) {
      const y = Y0 + (j + 0.5) * step;
      for (let i = 0; i < nx; i++) {
        const x = X0 + (i + 0.5) * step;
        let cid = -1, glow = 0, gold = 0;
        for (let n = 0; n < P.length; n++) {
          const q = P[n], bb = q.p.bb;
          if (x < bb[0] || x > bb[1] || y < bb[2] || y > bb[3] || z < bb[4] || z > bb[5]) continue;
          if (q.paint && cid < 0) continue;
          if (q.p.f(x, y, z)) { cid = q.cid; glow = q.glow || 0; gold = q.gold || 0; }
        }
        if (cid >= 0) { const o = idx(i, j, k); occ[o] = 1; colIdx[o] = cid; glowA[o] = glow; goldA[o] = gold; }
      }
    }
  }

  /* ---------- Culling de interior + AO falso ---------- */
  const at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? 0 : occ[idx(i, j, k)];
  const pos = [], col = [], glow = [], seed = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const o = idx(i, j, k);
    if (!occ[o]) continue;
    if (at(i + 1, j, k) && at(i - 1, j, k) && at(i, j + 1, k) && at(i, j - 1, k) && at(i, j, k + 1) && at(i, j, k - 1)) continue;
    let n = 0;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (di || dj || dk) n += at(i + di, j + dj, k + dk);
    const ao = 1 - Math.min(1, Math.max(0, (n - 8) / 16)) * 0.42;
    const h = hash3(i, j, k);
    const tone = 0.93 + h * 0.12;                                   // variación por voxel (look pixel-art)
    const x = X0 + (i + 0.5) * step, y = Y0 + (j + 0.5) * step, z = Z0 + (k + 0.5) * step;
    const vgrad = 0.9 + 0.1 * Math.min(1, Math.max(0, (y + 8) / 60));   // ligero gradiente vertical
    const c = palette[colIdx[o]];
    pos.push(x, y, z);
    col.push(c[0] * ao * tone * vgrad, c[1] * ao * tone * vgrad, c[2] * ao * tone * vgrad);
    glow.push(glowA[o], goldA[o]);
    seed.push(h, (y - Y0) / (Y1 - Y0));
  }

  /* ---------- Fuego del puño: pluma + ave de fuego ---------- */
  const fist = [20, 29.2, 16.6];
  const fpos = [], fcol = [], fseed = []; // seed: [rand, kind(0 pluma / 1 ave), stagger 0..1, speed]
  const nPlume = Math.round(240 / (step * step));
  for (let n = 0; n < nPlume; n++) {
    const a = hash3(n, 7, 1) * Math.PI * 2, b = hash3(n, 3, 9) * Math.PI, r = 2 + hash3(n, 11, 5) * 8;
    const x = fist[0] + Math.sin(b) * Math.cos(a) * r * 0.9, y = fist[1] + Math.cos(b) * r * 1.3 + 2, z = fist[2] + Math.sin(b) * Math.sin(a) * r + 2;
    const t = hash3(n, 2, 2);
    fpos.push(x, y, z);
    fcol.push(1, 0.55 + 0.4 * t, 0.12 + 0.2 * t);
    fseed.push(hash3(n, 5, 5), 0, r / 10, 0.6 + hash3(n, 8, 8) * 0.9);
  }
  {
    const rows = FIREBIRD.length, cols = FIREBIRD[0].length, cell = 1.25 * (step > 1.3 ? 1.35 : 1);
    const yaw = 0.42, cu = Math.cos(yaw), su = Math.sin(yaw);
    const cx = fist[0] + 7, cy = fist[1] + 12.5, cz = fist[2] + 3;
    const thick = step > 1.3 ? [0] : [-1, 0, 1];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (FIREBIRD[r][c] !== '#') continue;
      const u = (c - (cols - 1) / 2) * cell, v = ((rows - 1) / 2 - r) * cell;
      for (const w of thick) {
        const x = cx + u * cu - w * su * cell, y = cy + v, z = cz - u * su - w * cu * cell;
        const t = 1 - r / (rows - 1);                               // 1 arriba (cabeza) → 0 abajo (cola)
        const d = Math.hypot(x - fist[0], y - fist[1], z - fist[2]) / 30;
        fpos.push(x, y, z);
        fcol.push(1, 0.45 + 0.5 * t, 0.08 + 0.35 * t * t);
        fseed.push(hash3(r, c, w + 3), 1, Math.min(1, d), 0.5 + hash3(c, r, 1) * 0.5);
      }
    }
  }

  return {
    count: pos.length / 3,
    pos: new Float32Array(pos), col: new Float32Array(col), glow: new Float32Array(glow), seed: new Float32Array(seed),
    fire: { count: fpos.length / 3, pos: new Float32Array(fpos), col: new Float32Array(fcol), seed: new Float32Array(fseed) },
    fist, step,
    bounds: { x0: X0, x1: X1, y0: Y0, y1: Y1, z0: Z0, z1: Z1 },
  };
}
