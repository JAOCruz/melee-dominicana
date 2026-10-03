/* =====================================================================
   Melee Dominicana — hero 3D "setup de torneo".
   Diorama low-poly (mesa, CRT con clips reales del canal, consola cúbica,
   mandos con cable, bandera RD ondeando, neones, polvo) → al hacer scroll
   la cámara entra a la CRT, donde Captain Falcon (modelo del juego,
   models/falcon.glb) carga el Falcon Punch; el golpe rompe la pantalla y
   el flash corta al lounge. Render a baja resolución con escalado nearest
   (3D + pixel). Scroll nativo + GSAP ScrollTrigger (scrub 0.25).
   Fallbacks: sin WebGL → hero estático; sin modelo → solo diorama;
   reduced-motion → diorama estático.
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/* ---------- Estilo del Falcon: 'A' fiel a Melee · 'B' cel-shading · 'C' pixel art · 'D' Animelee (cel-shaded, crédito @Vancity_Primal) ---------- */
const STYLE_DEFAULT = 'B';   // 'D' (Animelee) queda listo: requiere models/falcon-animelee.glb
const STYLE = (new URLSearchParams(location.search).get('style') || STYLE_DEFAULT).toUpperCase(); // ?style=B para probar
const STYLES = {
  A: { pix: 2, pixMobile: 2, levels: 0, outline: 0, hull: 0, mat: 'standard', rim: 0.3, key: 2.8, fill: 1.5 },
  B: { pix: 2, pixMobile: 2, levels: 0, outline: 2, hull: 0, mat: 'toon', rim: 0.3, key: 3.4, fill: 1.0 },   // contorno de 2 px en el pase pixel
  C: { pix: 4, pixMobile: 3, levels: 6, outline: 1, hull: 0, mat: 'lambert', rim: 0.4, key: 3.4, fill: 1.2 },
  D: { pix: 2, pixMobile: 2, levels: 0, outline: 0, hull: 0, mat: 'toon2', rim: 0.25, key: 2.3, fill: 1.4, model: 'models/falcon-animelee.glb' },
};
const ST = STYLES[STYLE] || STYLES[STYLE_DEFAULT];

const hero = document.querySelector('.hero');
const host = document.querySelector('.hero .falcon3d');
const nav = document.querySelector('.nav');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = innerWidth < 820 || !fine;
const hasGsap = !!(window.gsap && window.ScrollTrigger);
const motion = hasGsap && !reduced;
const navH = () => (nav ? nav.offsetHeight : 0);
const BG = 0x07080f;
const MODEL_URL = new URLSearchParams(location.search).get('model') || ST.model || 'models/falcon.glb'; // ?model= solo para QA
const PUNCH_T = 0.86;   // segundo del clip SpecialN en que sale el puño
const HOLD_T = 1.12;    // se congela con el brazo extendido
const P_FEED = 0.26;    // la CRT pasa de clips a la señal en vivo del Falcon
const P_IN = 0.5;       // la cámara entra a la CRT (corte)
const P_PUNCH = 0.56;   // arranca la carga del Falcon Punch

function setupScroll() { if (motion) gsap.registerPlugin(ScrollTrigger); }

/* ---------- Texturas procedurales (canvas) ---------- */
function flagTexture() {
  const W = 48, H = 30, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, W / 2, H / 2); g.fillRect(W / 2, H / 2, W / 2, H / 2);
  g.fillStyle = '#e11d48'; g.fillRect(W / 2, 0, W / 2, H / 2); g.fillRect(0, H / 2, W / 2, H / 2);
  g.fillStyle = '#f3f4f6'; g.fillRect(W / 2 - 2, 0, 4, H); g.fillRect(0, H / 2 - 2, W, 4);
  g.fillStyle = '#15803d'; g.fillRect(W / 2 - 1, H / 2 - 1, 2, 2);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function carpetTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#2a1f2e'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#352639'; g.fillRect(3, 3, 2, 2); g.fillRect(11, 11, 2, 2);
  g.fillStyle = '#3a2a40'; g.fillRect(2, 4, 4, 1); g.fillRect(4, 2, 1, 4); g.fillRect(10, 12, 4, 1); g.fillRect(12, 10, 1, 4);
  g.fillStyle = '#2e2232'; g.fillRect(0, 0, 1, 16);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function wallTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#3d2a3c'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#44304a'; for (let y = 0; y < 32; y += 8) { g.fillRect(0, y, 32, 1); g.fillRect((y / 8) % 2 ? 16 : 0, y, 1, 8); }
  g.fillStyle = '#36253a'; for (let i = 0; i < 24; i++) g.fillRect((i * 7) % 32, (i * 11) % 32, 1, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 8); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function posterTexture() {
  const c = document.createElement('canvas'); c.width = 36; c.height = 50; const g = c.getContext('2d');
  g.fillStyle = '#0c1733'; g.fillRect(0, 0, 36, 50);
  g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, 18, 20); g.fillRect(18, 20, 18, 20);
  g.fillStyle = '#e11d48'; g.fillRect(18, 0, 18, 20); g.fillRect(0, 20, 18, 20);
  g.fillStyle = '#f3f4f6'; g.fillRect(17, 0, 2, 40); g.fillRect(0, 19, 36, 2);
  g.fillStyle = '#fbbf24'; [[14, 8, 8, 2], [12, 10, 12, 2], [10, 12, 16, 2], [16, 14, 4, 4]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));   // ave
  g.fillStyle = '#07080f'; g.fillRect(0, 40, 36, 10);
  g.fillStyle = '#fbbf24'; [[3, 43], [7, 43], [11, 43], [15, 43], [19, 43], [25, 43], [29, 43]].forEach(([x, y]) => g.fillRect(x, y, 3, 4));   // "letras" pixel
  g.fillStyle = '#f3f4f6'; g.fillRect(25, 44, 1, 2); g.fillRect(31, 44, 1, 2);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noiseTexture() {
  const n = 64, d = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) { const v = 20 + Math.random() * 60; d.set([v, v + 10, v + 30, 255], i * 4); }
  const t = new THREE.DataTexture(d, n, n); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- Ave de fuego voxel (diseño propio) ---------- */
const FIREBIRD = [
  '............#............', '...........###...........', '..........#####..........', '#........#######........#',
  '##......#########......##', '###....###########....###', '####..#############..####', '#########################',
  '.#######################.', '..#####..#######..#####..', '...###....#####....###...', '...........###...........',
  '...........###...........', '..........##.##..........', '..........#...#..........',
];
const hash3 = (x, y, z) => {
  let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function buildFire(cell, thick) {
  const pos = [], col = [], seed = [];
  const nPlume = thick === 1 ? 90 : 170;
  for (let n = 0; n < nPlume; n++) {
    const a = hash3(n, 7, 1) * Math.PI * 2, b = hash3(n, 3, 9) * Math.PI, r = 1.0 + hash3(n, 11, 5) * 3.5;
    pos.push(Math.sin(b) * Math.cos(a) * r * 0.9, Math.cos(b) * r * 1.2 + 1.0, Math.sin(b) * Math.sin(a) * r + 1);
    const t = hash3(n, 2, 2); col.push(1, 0.55 + 0.4 * t, 0.12 + 0.2 * t);
    seed.push(hash3(n, 5, 5), 0, r / 8, 0.6 + hash3(n, 8, 8) * 0.9);
  }
  const rows = FIREBIRD.length, cols = FIREBIRD[0].length, cy = 7.5, cz = -1.5;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (FIREBIRD[r][c] !== '#') continue;
    const u = (c - (cols - 1) / 2) * cell, v = ((rows - 1) / 2 - r) * cell;
    for (let w = -(thick - 1) / 2; w <= (thick - 1) / 2; w++) {
      const t = 1 - r / (rows - 1);
      pos.push(u, cy + v, cz + w * cell);
      col.push(1, 0.45 + 0.5 * t, 0.08 + 0.35 * t * t);
      seed.push(hash3(r, c, w + 3), 1, Math.min(1, Math.hypot(u, cy + v, cz) / 24), 0.5 + hash3(c, r, 1) * 0.5);
    }
  }
  return { count: pos.length / 3, pos: new Float32Array(pos), col: new Float32Array(col), seed: new Float32Array(seed) };
}

/* ======================================================================= */
function main() {
  if (!hero || !host) return false;
  if (!window.WebGL2RenderingContext) throw new Error('no webgl2');
  {
    const probe = document.createElement('canvas');
    const ctx = probe.getContext('webgl2');
    if (!ctx) throw new Error('webgl deshabilitado');
    const lose = ctx.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
  }
  document.documentElement.style.setProperty('--navh', navH() + 'px');

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.getContext()) throw new Error('no context');
  renderer.setPixelRatio(1);
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NoToneMapping;       // el tone mapping lo hace el pase pixel
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(canvas);
  host.insertAdjacentHTML('beforeend', '<div class="falcon3d__flash"></div>');
  const flash = host.querySelector('.falcon3d__flash');
  const clock = new THREE.Clock();

  // Estado (tweens de GSAP escriben aquí)
  const S = { p: 0, reveal: 0, fire: 0, shake: 0, glitch: 0, crack: 0, white: 0, charge: 0, view: true, lit: false, loaded: false, failed: false, punching: false, inside: false, feed: false };
  const U = {
    uTime: { value: 0 }, uFire: { value: 0 }, uReveal: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 0.35 },
    uGlitch: { value: 0 }, uCrack: { value: 0 }, uWhite: { value: 0 }, uScan: { value: 0 }, uCenter: { value: new THREE.Vector2(0.62, 0.55) },
  };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const lerp = (a, b, t) => a + (b - a) * t, sm = (t) => t * t * (3 - 2 * t), clamp01 = (t) => Math.min(1, Math.max(0, t)), rad = Math.PI / 180, fract = (x) => x - Math.floor(x);

  /* =================== ESCENA 1: DIORAMA =================== */
  const dio = new THREE.Scene();
  dio.background = new THREE.Color(0x120d16);
  dio.fog = new THREE.Fog(0x120d16, 220, 520);
  const dioCam = new THREE.PerspectiveCamera(34, 1, 1, 900);
  const TABLE_Y = 60;
  const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, extra || {}));
  const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = !mobile; (parent || dio).add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, parent, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = !mobile; (parent || dio).add(o); return o; };

  // suelo (moqueta) y pared
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = !mobile; dio.add(floor);
  const wall = box(600, 260, 4, new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 1 }), 0, 130, -70); wall.castShadow = false;
  // glow de los neones sobre la pared (planos aditivos baratos)
  const glowMat = (c) => new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(c) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 uColor; void main(){ float d = abs(vUv.x - 0.5) * 2.0; float a = exp(-d * d * 5.0) * 0.55 * smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.9, vUv.y); gl_FragColor = vec4(uColor * a, a); }' });
  const glowB = new THREE.Mesh(new THREE.PlaneGeometry(90, 190), glowMat(0x3b82f6)); glowB.position.set(-118, 125, -67.6); dio.add(glowB);
  const glowR = new THREE.Mesh(new THREE.PlaneGeometry(90, 190), glowMat(0xe11d48)); glowR.position.set(118, 125, -67.6); dio.add(glowR);
  // póster del torneo (textura canvas propia) con marco
  box(40, 54, 1.2, mat(0x15151c), 62, 148, -67.2).castShadow = false;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(36, 50), new THREE.MeshLambertMaterial({ map: posterTexture() })); poster.position.set(62, 148, -66.5); dio.add(poster);
  // cajas de juegos apiladas y un vaso
  [0, 1, 2].forEach((i) => box(14, 1.6, 19, mat([0x1d4ed8, 0xe11d48, 0x312e81][i]), -62 + i * 0.8, TABLE_Y + 0.8 + i * 1.7, -14 + i * 0.6));
  cyl(2.4, 2.0, 7, mat(0xe5e7eb, { roughness: 0.4 }), 64, TABLE_Y + 3.5, 24); cyl(2.1, 2.1, 0.4, mat(0x3f3f46), 64, TABLE_Y + 7.1, 24);
  box(600, 6, 6, mat(0x2b1e2c), 0, 3, -68);                                   // zócalo
  // neones (tubos + luces)
  const neonM = (c) => new THREE.MeshBasicMaterial({ color: c });
  box(2.4, 150, 2.4, neonM(0x3b82f6), -118, 115, -66); box(2.4, 150, 2.4, neonM(0xe11d48), 118, 115, -66);
  box(2.4, 2.4, 10, neonM(0x3b82f6), -118, 190, -62); box(2.4, 2.4, 10, neonM(0xe11d48), 118, 190, -62);
  const neonB = new THREE.PointLight(0x3b82f6, mobile ? 1600 : 2400, 420, 1.8); neonB.position.set(-112, 120, -52); dio.add(neonB);
  const neonR = new THREE.PointLight(0xe11d48, mobile ? 1600 : 2400, 420, 1.8); neonR.position.set(112, 120, -52); dio.add(neonR);
  dio.add(new THREE.HemisphereLight(0x6a5a7a, 0x1a1016, 1.0));
  const dioFill = new THREE.DirectionalLight(0xd8d0ff, 0.9); dioFill.position.set(-80, 90, 170); dio.add(dioFill);
  const dioKey = new THREE.DirectionalLight(0xffd9a8, 3.4); dioKey.position.set(60, 190, 120); dioKey.target.position.set(0, TABLE_Y, 0); dio.add(dioKey, dioKey.target);
  if (!mobile) { dioKey.castShadow = true; dioKey.shadow.mapSize.set(1024, 1024); const sc = dioKey.shadow.camera; sc.left = sc.bottom = -120; sc.right = sc.top = 120; sc.near = 20; sc.far = 500; dioKey.shadow.bias = -0.0015; dioKey.shadow.normalBias = 1.0; }
  const screenLight = new THREE.PointLight(0x8fb4ff, 300, 160, 1.7); screenLight.position.set(0, TABLE_Y + 28, 45); dio.add(screenLight);
  // bandera RD ondeando en la pared
  const flagM = new THREE.MeshLambertMaterial({ map: flagTexture(), side: THREE.DoubleSide });
  flagM.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n uniform float uTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += sin(uv.x * 7.0 - uTime * 2.2) * 2.4 * uv.x + sin(uv.y * 5.0 + uTime * 1.6) * 0.8 * uv.x;');
  };
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(78, 49, 24, 12), flagM); flag.position.set(-52, 150, -64); dio.add(flag);
  cyl(1.2, 1.2, 90, mat(0x9ca3af, { metalness: 0.6, roughness: 0.4 }), -92, 150, -64).rotation.z = 0;   // asta
  // mesa
  const wood = mat(0x6b4a32), woodD = mat(0x4a3222);
  box(150, 6, 70, wood, 0, TABLE_Y - 3, 5);
  [[-70, -25], [70, -25], [-70, 35], [70, 35]].forEach(([x, z]) => box(5, TABLE_Y - 6, 5, woodD, x, (TABLE_Y - 6) / 2, z));
  // CRT
  const crt = new THREE.Group(); crt.position.set(0, TABLE_Y, -8); dio.add(crt);
  const crtBody = mat(0x3b3b47, { roughness: 0.7 }), crtDark = mat(0x15151c, { roughness: 0.6 });
  box(58, 46, 46, crtBody, 0, 23, -4, crt);
  box(60, 48, 6, crtDark, 0, 23, 20, crt);                                      // bisel frontal
  box(50, 36, 2, mat(0x0c1733), 0, 25, 23.2, crt);                              // marco interior
  box(58, 4, 46, mat(0x5a5a70, { roughness: 0.6 }), 0, 46.2, -4, crt).castShadow = false;
  for (let i = 0; i < 4; i++) box(1, 1, 1, neonM(0x6b6b80), 18 + i * 2.4, 3.6, 23.6, crt);
  box(1.2, 1.2, 1.2, neonM(0xef4444), -22, 3.6, 23.6, crt);                     // LED
  cyl(1.8, 1.8, 1.4, mat(0x8a8aa0, { metalness: 0.5, roughness: 0.4 }), 25, 3.6, 23.4, crt).rotation.x = Math.PI / 2;
  cyl(1.8, 1.8, 1.4, mat(0x8a8aa0, { metalness: 0.5, roughness: 0.4 }), 25, 8.6, 23.4, crt).rotation.x = Math.PI / 2;
  // pantalla curva (plano abombado) con shader CRT
  const SCREEN_W = 46, SCREEN_H = 34;
  const scrGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 10, 8);
  { const p = scrGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (SCREEN_W / 2), y = p.getY(i) / (SCREEN_H / 2); p.setZ(i, (1 - (x * x + y * y) * 0.5) * 2.2); } scrGeo.computeVertexNormals(); }
  const noiseTex = noiseTexture();
  // OSD estilo VCR (canvas con la fuente pixel): "PLAY ▶" arriba-izquierda, "SP 0:00:xx" abajo-derecha
  const osdC = document.createElement('canvas'); osdC.width = 512; osdC.height = 384; const osdG = osdC.getContext('2d');
  const osdTex = new THREE.CanvasTexture(osdC); osdTex.magFilter = THREE.NearestFilter; osdTex.minFilter = THREE.LinearFilter; osdTex.generateMipmaps = false; osdTex.colorSpace = THREE.SRGBColorSpace;
  let osdSec = -1;
  function drawOSD(sec) {
    osdG.clearRect(0, 0, 512, 384); osdG.font = '20px "Press Start 2P", monospace'; osdG.textBaseline = 'top';
    const txt = (t, x, y, right) => { osdG.textAlign = right ? 'right' : 'left'; osdG.fillStyle = 'rgba(0,0,0,.55)'; osdG.fillText(t, x + 2, y + 2); osdG.fillStyle = '#f4f4f8'; osdG.fillText(t, x, y); };
    txt('PLAY', 34, 30); osdG.fillStyle = 'rgba(0,0,0,.55)'; osdG.beginPath(); osdG.moveTo(142, 32); osdG.lineTo(162, 42); osdG.lineTo(142, 52); osdG.fill();
    osdG.fillStyle = '#f4f4f8'; osdG.beginPath(); osdG.moveTo(140, 30); osdG.lineTo(160, 40); osdG.lineTo(140, 50); osdG.fill();
    const mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
    txt(`SP 0:${mm}:${ss}`, 478, 328, true);
    osdTex.needsUpdate = true;
  }
  drawOSD(0);
  if (document.fonts && document.fonts.load) document.fonts.load('20px "Press Start 2P"').then(() => { osdSec = -1; }).catch(() => {});
  const screenU = { tTex: { value: noiseTex }, tOsd: { value: osdTex }, uTime: U.uTime, uGlitch: { value: 0 }, uBright: { value: 1.0 }, uFeed: { value: 0 }, uTrack: { value: 0 } };
  const screenMat = new THREE.ShaderMaterial({
    uniforms: screenU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D tTex, tOsd; uniform float uTime, uGlitch, uBright, uFeed, uTrack;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 c = vUv * 2.0 - 1.0; c *= 1.0 + 0.06 * dot(c, c); vec2 uv = c * 0.5 + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        float row = floor(uv.y * 48.0);
        uv.x += (h(vec2(row, floor(uTime * 24.0))) - 0.5) * 0.25 * uGlitch;
        // banda de tracking VCR que baja de vez en cuando
        float band = smoothstep(0.0, 0.025, uTrack - abs(uv.y - (1.3 - fract(uTime * 0.11) * 1.6)));
        uv.x += band * (h(vec2(floor(uv.y * 240.0), floor(uTime * 30.0))) - 0.5) * 0.06;
        // leve aberración cromática
        vec2 ca = vec2(0.0012 + band * 0.004, 0.0);
        vec3 col = vec3(texture2D(tTex, uv + ca).r, texture2D(tTex, uv).g, texture2D(tTex, uv - ca).b);
        col = mix(pow(col, vec3(2.2)), col * 1.25, uFeed);   // vídeo/póster (sRGB) vs señal en vivo (lineal)
        col = mix(col, col * (0.6 + 0.8 * h(vec2(floor(uv.y * 240.0), floor(uTime * 20.0)))), band * 0.8);
        float n = h(uv * 300.0 + uTime * 60.0);
        col = mix(col, vec3(n * 0.9), uGlitch * 0.7);
        col *= 0.9 + 0.1 * sin(uv.y * 480.0 * 3.14159);         // scanlines finas (480 líneas)
        col *= 1.0 - 0.35 * dot(c, c);                          // viñeta
        vec4 osd = texture2D(tOsd, uv); col = mix(col, pow(osd.rgb, vec3(2.2)), osd.a * 0.92);
        col *= uBright * 1.3;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  // capa 1: se dibuja a resolución nativa encima del pase pixel; en el pase de baja resolución queda un placeholder negro
  const screen = new THREE.Mesh(scrGeo, screenMat); screen.position.set(0, 25, 23.6); screen.layers.set(1); crt.add(screen);
  const screenLow = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ color: 0x000000 })); screenLow.position.set(0, 25, 23.5); crt.add(screenLow);
  const SCREEN_CENTER = new THREE.Vector3(); // se calcula en el loop (world)
  // GameCube (proporciones reales 15×11×16 cm, sin logos)
  const con = new THREE.Group(); con.position.set(44, TABLE_Y, 14); dio.add(con);
  const indigo = mat(0x4f4198, { roughness: 0.55 }), indigoHi = mat(0x5d4fae, { roughness: 0.5 }), indigoDk = mat(0x3a2f78, { roughness: 0.6 }), greyBtn = mat(0x9ca3af, { roughness: 0.5 });
  box(15, 10.4, 15.5, indigo, 0, 0.6 + 5.2, 0, con);                       // cuerpo
  box(12.6, 0.7, 12.6, indigoHi, 0, 11.15, 0.3, con);                       // tapa
  cyl(4.9, 4.9, 0.5, indigoDk, 0, 11.7, 0.3, con, 28);                      // cubierta del disco
  cyl(3.6, 3.6, 0.25, indigoHi, 0, 12.0, 0.3, con, 28);
  box(1.8, 0.5, 1.1, greyBtn, 4.6, 11.6, 5.4, con);                          // Open
  box(2.6, 0.6, 1.3, greyBtn, -5.0, 11.4, 6.0, con);                         // Power
  box(1.0, 0.6, 1.0, greyBtn, -2.4, 11.4, 6.1, con);                         // Reset
  box(11.5, 3.8, 0.5, indigoHi, 0, 7.4, 7.9, con);                           // panel de puertos
  const portXs = [-4.2, -1.4, 1.4, 4.2];
  portXs.forEach((x) => { cyl(0.95, 0.95, 0.7, mat(0x1e1b4b), x, 7.4, 8.2, con, 12).rotation.x = Math.PI / 2; });
  box(2.6, 1.2, 0.4, mat(0x1e1b4b), -2.2, 3.9, 7.95, con); box(2.6, 1.2, 0.4, mat(0x1e1b4b), 2.2, 3.9, 7.95, con);   // ranuras memory card
  box(1.0, 0.5, 0.3, neonM(0xf97316), -6.2, 9.6, 7.9, con);                  // LED
  box(9.5, 1.3, 1.3, indigoDk, 0, 10.4, -9.0, con);                          // asa trasera
  box(1.3, 1.3, 2.4, indigoDk, -4.1, 10.4, -8.2, con); box(1.3, 1.3, 2.4, indigoDk, 4.1, 10.4, -8.2, con);
  [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([x, z]) => cyl(0.9, 0.9, 0.6, mat(0x2a2438), x, 0.3, z, con, 8));   // patas
  for (let i = 0; i < 5; i++) box(0.3, 4, 8, indigoDk, 7.6, 5.5, -3 + i * 1.5, con).castShadow = false;             // rejilla lateral
  // mandos de GameCube con cable a los puertos 1 y 2
  const padColors = [0x4f4198, 0xea580c];
  const ports = portXs.slice(0, 2).map((x) => new THREE.Vector3(44 + x, TABLE_Y + 7.4, 14 + 8.3));
  [[-40, 22, 0.38], [-8, 31, -0.22]].forEach(([x, z, ry], i) => {
    const g = new THREE.Group(); g.position.set(x, TABLE_Y + 2.2, z); g.rotation.y = ry; dio.add(g);
    const pm = mat(padColors[i], { roughness: 0.55 }), pmDk = mat(i ? 0xc2410c : 0x3a2f78, { roughness: 0.6 });
    box(7.6, 3.0, 6.4, pm, 0, 0, -0.2, g);                                                                    // cuerpo central
    cyl(2.3, 2.3, 3.0, pm, -4.2, 0, -0.4, g, 14); cyl(2.3, 2.3, 3.0, pm, 4.2, 0, -0.4, g, 14);                 // lóbulos
    const grip = (sx) => { const c = cyl(1.5, 1.25, 7.5, pm, sx * 3.9, -1.6, 2.6, g, 12); c.rotation.set(1.15, 0, -sx * 0.32); };
    grip(-1); grip(1);
    cyl(1.25, 1.25, 0.5, mat(0x22c55e), 3.2, 1.7, -0.8, g, 16);                                              // A
    cyl(0.65, 0.65, 0.5, mat(0xef4444), 1.7, 1.7, 0.6, g, 10);                                               // B
    box(0.6, 0.5, 1.8, greyBtn, 5.0, 1.7, -0.8, g); box(1.8, 0.5, 0.6, greyBtn, 3.2, 1.7, -2.5, g);           // X / Y
    cyl(0.8, 0.8, 0.9, mat(0xfbbf24), 3.6, 1.95, 1.9, g, 10);                                                // C-stick
    cyl(0.45, 0.45, 0.4, greyBtn, 0, 1.7, -0.3, g, 8);                                                       // Start
    cyl(1.6, 1.6, 0.3, mat(0x2a2438), -3.4, 1.6, -1.0, g, 8); cyl(0.95, 0.95, 1.3, greyBtn, -3.4, 2.2, -1.0, g, 10);   // stick
    box(2.0, 0.5, 0.7, greyBtn, -2.6, 1.7, 1.6, g); box(0.7, 0.5, 2.0, greyBtn, -2.6, 1.7, 1.6, g);           // cruceta
    box(2.4, 1.2, 1.6, greyBtn, -4.2, 0.9, -3.2, g); box(2.4, 1.2, 1.6, greyBtn, 4.2, 0.9, -3.2, g);          // L / R
    box(1.6, 0.6, 1.0, mat(0x6d28d9), 4.2, 1.7, -3.0, g);                                                    // Z
    const start = g.localToWorld(new THREE.Vector3(0, 0.6, -3.5)), end = ports[i];
    const curve = new THREE.CatmullRomCurve3([start, new THREE.Vector3(start.x + 4, TABLE_Y + 0.7, start.z - 10), new THREE.Vector3((start.x + end.x) / 2, TABLE_Y + 0.5, 4), new THREE.Vector3(end.x - 3, TABLE_Y + 1.2, end.z + 7), end]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, mobile ? 24 : 48, 0.42, 6, false), mat(0x2a2438, { roughness: 0.6 })); cable.castShadow = !mobile; dio.add(cable);
    pmDk.dispose();
  });
  // cable de corriente de la consola hacia la pared
  { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(44, TABLE_Y + 3, 6), new THREE.Vector3(60, TABLE_Y + 0.6, -14), new THREE.Vector3(74, TABLE_Y - 20, -50), new THREE.Vector3(80, 2, -66)]);
    dio.add(new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.5, 6, false), mat(0x1c1a2a, { roughness: 0.7 }))); }
  // trofeo dorado
  const gold = mat(0xfbbf24, { metalness: 0.7, roughness: 0.3 });
  cyl(3.2, 2.2, 1.6, mat(0x78350f), 68, TABLE_Y + 0.8, -12); cyl(0.7, 0.7, 4, gold, 68, TABLE_Y + 3.6, -12); cyl(3.4, 1.6, 5.5, gold, 68, TABLE_Y + 8, -12);
  // polvo en la luz
  const nDust = mobile ? 90 : 220;
  {
    const p = new Float32Array(nDust * 3), ph = new Float32Array(nDust);
    for (let i = 0; i < nDust; i++) { p.set([-120 + Math.random() * 240, 20 + Math.random() * 170, -60 + Math.random() * 130], i * 3); ph[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const dust = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aPhase; uniform float uTime; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * 0.4 + aPhase * 30.0) * 4.0; p.x += cos(uTime * 0.3 + aPhase * 20.0) * 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (1.0 + aPhase) * (160.0 / max(1.0, -mv.z)); vA = 0.25 + 0.25 * sin(uTime * 2.0 + aPhase * 50.0); }`,
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(0.9, 0.8, 0.65) * vA, 1.0); }',
    }));
    dust.frustumCulled = false; dio.add(dust);
  }
  // clip real del canal en loop (VideoTexture); póster = frame fijo del vídeo (reduced-motion / antes de cargar)
  const video = document.createElement('video');
  video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'metadata'; video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  video.src = 'media/crt-loop.mp4';
  const videoTex = new THREE.VideoTexture(video); videoTex.colorSpace = THREE.SRGBColorSpace; videoTex.minFilter = videoTex.magFilter = THREE.LinearFilter; videoTex.generateMipmaps = false; videoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  let videoOK = false, posterTex = null;
  video.addEventListener('loadeddata', () => { videoOK = true; start(); });
  video.addEventListener('playing', () => { videoOK = true; start(); });
  video.addEventListener('error', () => { videoOK = false; });
  if (!reduced) video.load();
  new THREE.TextureLoader().load('media/crt-loop.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); posterTex = t; start(); }, undefined, () => {});
  function videoWant(on) { if (reduced || video.error) return; if (on && video.paused) video.play().catch(() => {}); else if (!on && !video.paused) video.pause(); }

  /* =================== ESCENA 2: DENTRO DE LA CRT (Falcon) =================== */
  const stage = new THREE.Scene();
  stage.fog = new THREE.FogExp2(0x05060c, 0.004);
  const stageCam = new THREE.PerspectiveCamera(mobile ? 48 : 36, 1, 2, 600);
  const feedCam = new THREE.PerspectiveCamera(36, 4 / 3, 2, 600);
  stage.add(new THREE.HemisphereLight(0xb8c0d0, 0x3a2a24, 0.8));
  const key = new THREE.DirectionalLight(0xfff0dc, ST.key); key.position.set(-24, 80, 70); key.target.position.set(0, 28, 0); stage.add(key, key.target);
  if (!mobile) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); const sc = key.shadow.camera; sc.left = sc.bottom = -50; sc.right = sc.top = 50; sc.near = 10; sc.far = 240; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.6; }
  const fillL = new THREE.DirectionalLight(0xc8d0e8, ST.fill); fillL.position.set(50, 30, 80); stage.add(fillL);
  const rimBlue = new THREE.DirectionalLight(0x3b7bff, 2.2 * ST.rim); rimBlue.position.set(-60, 40, -50); stage.add(rimBlue);
  const rimRed = new THREE.DirectionalLight(0xff2b3d, 2.4 * ST.rim); rimRed.position.set(60, 30, -50); stage.add(rimRed);
  const fireLight = new THREE.PointLight(0xff8a2a, 0, 70, 2.0); stage.add(fireLight);
  const stageFloor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0b0c18, roughness: 0.95 })); stageFloor.rotation.x = -Math.PI / 2; stageFloor.receiveShadow = !mobile; stage.add(stageFloor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uRes: U.uRes, uFire: U.uFire, uCharge: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime, uFire, uCharge; uniform vec2 uRes;
      void main(){ vec2 asp = vec2(uRes.x / max(1.0, uRes.y), 1.0); vec2 uv = vUv;
        vec3 col = vec3(0.02, 0.022, 0.045);
        float gb = exp(-length((uv - vec2(0.1, 0.9)) * asp) * 2.2), gr = exp(-length((uv - vec2(0.95, 0.1)) * asp) * 2.4);
        float gg = exp(-length((uv - vec2(0.62, 0.5)) * asp * vec2(1.0, 1.4)) * 2.2);
        col += (vec3(0.0, 0.12, 0.34) * gb * 0.8 + vec3(0.6, 0.05, 0.1) * gr * 0.5) * (1.0 - 0.7 * uCharge) + vec3(0.9, 0.55, 0.18) * gg * (0.08 + 0.45 * uFire);
        col *= 1.0 - 0.45 * length((uv - 0.5) * vec2(1.1, 1.0));
        gl_FragColor = vec4(col, 1.0); }`,
  }));
  back.frustumCulled = false; back.renderOrder = -10; stage.add(back);
  // brasas
  const nE = mobile ? 100 : 260;
  {
    const p = new Float32Array(nE * 3), col = new Float32Array(nE * 3), sz = new Float32Array(nE), ph = new Float32Array(nE);
    const pal = [[1, 0.78, 0.35], [1, 0.35, 0.2], [0.35, 0.6, 1], [1, 1, 1]];
    for (let i = 0; i < nE; i++) { p.set([-50 + Math.random() * 110, Math.random() * 80, -40 + Math.random() * 70], i * 3); col.set(pal[Math.floor(Math.random() * 4)], i * 3); sz[i] = 1.0 + Math.random() * 1.6; ph[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const embers = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uAmt: U.uAmt }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aPhase; uniform float uTime, uAmt; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y + uTime * (1.5 + aPhase * 3.0), 80.0) - 15.0; p.x += sin(uTime * 0.6 + aPhase * 20.0) * 3.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * (90.0 / max(1.0, -mv.z));
          vC = aCol; vA = (0.45 + 0.55 * sin(uTime * 3.0 + aPhase * 50.0)) * uAmt * smoothstep(-15.0, 0.0, p.y) * smoothstep(65.0, 40.0, p.y); }`,
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.0); }',
    }));
    embers.frustumCulled = false; stage.add(embers);
  }

  /* ---------- Falcon (GLB) ---------- */
  const MODEL_SCALE = 2.6;
  const rig = new THREE.Group(); stage.add(rig);
  const toonGrad = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
  toonGrad.minFilter = toonGrad.magFilter = THREE.NearestFilter; toonGrad.needsUpdate = true;
  const toonGrad2 = new THREE.DataTexture(new Uint8Array([175, 255]), 2, 1, THREE.RedFormat);   // Animelee: 2 tonos
  toonGrad2.minFilter = toonGrad2.magFilter = THREE.NearestFilter; toonGrad2.needsUpdate = true;
  const matReveal = (shader) => {
    shader.uniforms.uReveal = U.uReveal;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n uniform float uReveal;\n float fhash(vec2 p){ return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (fhash(gl_FragCoord.xy) > uReveal) discard;');
  };
  let mixer = null, actIdle = null, actPunch = null, handBone = null, hipBone = null, yawBase = Math.PI / 2;
  const hipPos = new THREE.Vector3(), hipPos0 = new THREE.Vector3(), follow = new THREE.Vector3();
  const fireGroup = new THREE.Group(); fireGroup.visible = false; stage.add(fireGroup);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, (g) => {
    const model = g.scene; model.scale.setScalar(MODEL_SCALE);
    const hulls = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = !mobile; o.frustumCulled = false;
      const src = o.material, map = src.map || null; if (map) { map.anisotropy = 1; map.minFilter = THREE.LinearMipmapLinearFilter; }
      let m;
      if (ST.mat === 'toon') m = new THREE.MeshToonMaterial({ map, color: map ? 0xffffff : src.color, gradientMap: toonGrad });
      else if (ST.mat === 'toon2') { m = new THREE.MeshToonMaterial({ map, color: map ? 0xffffff : src.color, gradientMap: toonGrad2 }); if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; } }
      else if (ST.mat === 'lambert') m = new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : src.color });
      else m = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : src.color, roughness: 0.82, metalness: 0.0 });
      m.side = THREE.FrontSide; m.transparent = false; m.depthWrite = true; if (map) m.alphaTest = 0.5;
      m.onBeforeCompile = matReveal; o.material = m;
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); depth.onBeforeCompile = matReveal; o.customDepthMaterial = depth;
      if (ST.hull && o.isSkinnedMesh) {
        // hull invertido: hijo del mesh (hereda la descuantización de gltf-transform); desplazamiento en unidades del modelo
        const hm = new THREE.MeshBasicMaterial({ color: 0x07060a, side: THREE.BackSide });
        const k = ST.hull / (o.scale.x || 1);
        hm.onBeforeCompile = (sh) => { matReveal(sh); sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${k.toFixed(5)};`); };
        const h = new THREE.SkinnedMesh(o.geometry, hm); h.bind(o.skeleton, o.bindMatrix); h.frustumCulled = false; hulls.push([o, h]);
      }
    });
    hulls.forEach(([o, h]) => o.add(h));
    rig.add(model);
    mixer = new THREE.AnimationMixer(model);
    const clip = (n) => g.animations.find((c) => c.name === n);
    actIdle = mixer.clipAction(clip('Wait1')); actIdle.setLoop(THREE.LoopRepeat); actIdle.play();
    actPunch = mixer.clipAction(clip('SpecialN')); actPunch.setLoop(THREE.LoopOnce); actPunch.clampWhenFinished = true;
    hipBone = model.getObjectByName('joint04') || model.getObjectByName('joint01');
    rig.rotation.y = 0; rig.updateMatrixWorld(true);
    actIdle.weight = 0; actPunch.weight = 1; actPunch.play(); actPunch.time = HOLD_T; mixer.update(0); model.updateMatrixWorld(true);
    const tmp = new THREE.Vector3(), hp = new THREE.Vector3(); let best = -1e9; hipBone.getWorldPosition(hp);
    model.traverse((o) => { if (o.isBone && !/^joint0[0-4]$/.test(o.name)) { o.getWorldPosition(tmp); if (tmp.y < hp.y * 0.5) return; const d = Math.hypot(tmp.x - hp.x, tmp.z - hp.z); if (d > best) { best = d; handBone = o; } } });
    handBone.getWorldPosition(tmp); tmp.sub(hp); yawBase = Math.atan2(-tmp.x, tmp.z) + (mobile ? 0.12 : 0.28);
    actPunch.stop(); actIdle.weight = 1; actIdle.play(); mixer.update(0); model.updateMatrixWorld(true);
    rig.rotation.y = yawBase; rig.updateMatrixWorld(true); hipBone.getWorldPosition(hipPos0); follow.set(0, 0, 0);
    S.loaded = true;
    if (reduced) { S.reveal = 1; }
    else if (motion) gsap.to(S, { reveal: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: start });
    else S.reveal = 1;
    start();
  }, undefined, (e) => {
    console.warn('[melee/falcon3d] no se pudo cargar el modelo; el hero se queda en el diorama:', e && e.message ? e.message : e);
    S.failed = true;
  });

  /* ---------- Fuego del Falcon Punch ---------- */
  const F = buildFire(mobile ? 0.8 : 0.62, mobile ? 1 : 3);
  const fgeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
  const fmat = new THREE.MeshBasicMaterial({ fog: false, toneMapped: false });
  fmat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uFire: U.uFire, uTime: U.uTime });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n attribute vec4 aFire; uniform float uFire; uniform float uTime; vec3 fOff;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float kind = aFire.y;
        float on = clamp((uFire * 1.6 - aFire.z) / 0.6, 0.0, 1.0);
        float life = fract(uTime * 0.45 * aFire.w + aFire.x);
        float plumeS = (1.0 - kind) * sin(life * 3.14159) * (0.5 + 0.7 * aFire.x);
        float birdS = kind * (0.86 + 0.22 * sin(uTime * 7.0 + aFire.x * 40.0));
        transformed *= on * (plumeS + birdS);
        fOff = (1.0 - kind) * vec3(sin(uTime * 2.0 + aFire.x * 30.0) * 0.8, life * 7.0, cos(uTime * 1.7 + aFire.x * 20.0) * 0.8)
             + kind * vec3(0.0, sin(uTime * 2.2 + aFire.x * 6.0) * 0.5, 0.0) + kind * (1.0 - on) * vec3(0.0, -7.0, 0.0);`)
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace('mvPosition = instanceMatrix * mvPosition;', 'mvPosition = instanceMatrix * mvPosition; mvPosition.xyz += fOff;'));
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 1.9;');
  };
  const fire = new THREE.InstancedMesh(fgeo, fmat, F.count); fire.frustumCulled = false;
  { const m4 = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < F.count; i++) { m4.makeTranslation(F.pos[i * 3], F.pos[i * 3 + 1], F.pos[i * 3 + 2]); fire.setMatrixAt(i, m4); c.setRGB(F.col[i * 3], F.col[i * 3 + 1], F.col[i * 3 + 2], THREE.SRGBColorSpace); fire.setColorAt(i, c); }
    fgeo.setAttribute('aFire', new THREE.InstancedBufferAttribute(F.seed, 4)); fire.instanceMatrix.needsUpdate = true; if (fire.instanceColor) fire.instanceColor.needsUpdate = true; }
  fireGroup.add(fire);

  /* =================== PASE PIXEL =================== */
  let PIX = mobile ? ST.pixMobile : ST.pix;
  const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) });
  rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
  const feedRT = new THREE.WebGLRenderTarget(mobile ? 320 : 512, mobile ? 240 : 384, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType });
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pixMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, tDepth: { value: rt.depthTexture }, uRes: U.uRes, uNear: { value: 1 }, uFar: { value: 900 }, uTime: U.uTime,
      uLevels: { value: ST.levels }, uOutline: { value: ST.outline }, uGlitch: U.uGlitch, uCrack: U.uCrack, uWhite: U.uWhite, uScan: U.uScan, uCenter: U.uCenter, uGamma: { value: 1.0 } },
    depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes, uCenter; uniform float uNear, uFar, uTime, uLevels, uOutline, uGlitch, uCrack, uWhite, uScan, uGamma;
      float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 px = 1.0 / uRes;
        vec2 uv = (floor(vUv * uRes) + 0.5) * px;
        float row = floor(vUv.y * uRes.y);
        uv.x += (h(vec2(row, floor(uTime * 30.0))) - 0.5) * 0.3 * uGlitch;
        vec3 c = texture2D(tDiffuse, uv).rgb;
        c = mix(c, vec3(h(uv * 200.0 + uTime * 50.0)), uGlitch * 0.8);
        // contorno 1px por profundidad (estilo C)
        if (uOutline > 0.0) {
          vec2 o = px * uOutline;
          float d0 = lin(texture2D(tDepth, uv).x); float e = 0.0;
          e = max(e, abs(lin(texture2D(tDepth, uv + vec2(o.x, 0.0)).x) - d0)); e = max(e, abs(lin(texture2D(tDepth, uv - vec2(o.x, 0.0)).x) - d0));
          e = max(e, abs(lin(texture2D(tDepth, uv + vec2(0.0, o.y)).x) - d0)); e = max(e, abs(lin(texture2D(tDepth, uv - vec2(0.0, o.y)).x) - d0));
          c = mix(c, vec3(0.0), step(3.0, e) * step(d0, 500.0));
        }
        c = aces(c * uGamma);
        c = pow(c, vec3(1.0 / 2.2));
        if (uLevels > 0.0) c = floor(c * uLevels + 0.5) / uLevels;      // paleta limitada (estilo C)
        c *= 1.0 - uScan * 0.22 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159));
        // grietas de la pantalla (desde el puño)
        if (uCrack > 0.0) {
          vec2 d = (vUv - uCenter) * vec2(uRes.x / uRes.y, 1.0); float r = length(d); float a = atan(d.y, d.x);
          float lines = 0.0;
          for (int i = 0; i < 7; i++) { float ai = float(i) * 0.897 + h(vec2(float(i), 3.0)) * 0.6; float w = abs(sin(a - ai)) * r; float len = uCrack * (0.09 + 0.2 * h(vec2(float(i), 7.0)));
            lines += step(w, 0.0022 + 0.0015 * sin(r * 60.0 + float(i) * 2.0)) * step(r, len) * step(0.01, r); }
          float ring = step(abs(r - uCrack * 0.09), 0.0018) * step(h(floor(vec2(a * 6.0, 1.0))), 0.7);
          c = mix(c, vec3(1.0, 0.97, 0.9), clamp(lines + ring, 0.0, 1.0) * 0.75 * uCrack);
        }
        c = mix(c, vec3(1.0, 0.96, 0.85), uWhite);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pixMat));

  /* =================== CÁMARAS =================== */
  const target = new THREE.Vector3(), tmpV = new THREE.Vector3(), camDir = new THREE.Vector3();
  let W = 1, H = 1;
  function orbit(cam, tgt, dist, az, el, roll, t) {
    cam.position.set(tgt.x + dist * Math.cos(el) * Math.sin(az), tgt.y + dist * Math.sin(el), tgt.z + dist * Math.cos(el) * Math.cos(az));
    if (S.shake > 0.001) { tmpV.set(Math.sin(t * 61.0), Math.cos(t * 53.0), Math.sin(t * 47.0)).multiplyScalar(S.shake * 1.4); cam.position.add(tmpV); }
    cam.up.set(0, 1, 0); cam.lookAt(tgt); cam.rotateZ(roll);
  }
  const LOOK = (new URLSearchParams(location.search).get('look') || '').split(',').map(Number);   // ?look=x,y,z,tx,ty,tz solo para QA (close-ups)
  function dioCamera(t) {
    if (LOOK.length === 6 && LOOK.every((n) => !isNaN(n))) { dioCam.position.set(LOOK[0], LOOK[1], LOOK[2]); dioCam.up.set(0, 1, 0); dioCam.lookAt(LOOK[3], LOOK[4], LOOK[5]); dioCam.setViewOffset(W, H, 0, 0, W, H); dioCam.updateProjectionMatrix(); return; }
    const q = sm(clamp01(S.p / P_IN));                       // 0 plano general → 1 pantalla llena
    const q2 = clamp01((S.p - 0.3) / (P_IN - 0.3)); const dive = q2 * q2 * q2;
    screen.getWorldPosition(SCREEN_CENTER);
    const tf = Math.tan(dioCam.fov * rad / 2);
    const far = mobile ? 300 : 236, near = Math.min((SCREEN_H / 2) / tf, (SCREEN_W / 2) / (tf * dioCam.aspect)) + 1.5;
    const dist = lerp(far, near, q);
    const az = lerp(mobile ? -18 : -30, 0, q) * rad + ptr.x * 0.08 * (1 - q);
    const el = lerp(10, 0, q) * rad - ptr.y * 0.05 * (1 - q);
    const roll = lerp(-6, 0, q) * rad;
    target.set(lerp(12, SCREEN_CENTER.x, q), lerp(TABLE_Y + (mobile ? 30 : 22), SCREEN_CENTER.y, q), lerp(0, SCREEN_CENTER.z, q));
    orbit(dioCam, target, dist, az, el, roll, t);
    const ox = mobile ? 0 : -W * 0.2 * (1 - dive), oy = mobile ? H * 0.2 * (1 - dive) : -H * 0.02 * (1 - dive);
    dioCam.setViewOffset(W, H, ox, oy, W, H); dioCam.updateProjectionMatrix();
  }
  function stageParams(q) {
    const az = lerp(-14, 14, q) * rad + ptr.x * 0.08, el = lerp(10, -4, q) * rad - ptr.y * 0.05;
    const dist = mobile ? lerp(96, 70, q) : lerp(90, 62, q), roll = lerp(0, -12, q) * rad;
    if (mobile) target.set(lerp(0, 2, q), lerp(29, 36, q), lerp(0, 3, q)); else target.set(lerp(1, 4, q), lerp(29, 36, q), lerp(1, 4, q));
    target.add(follow);
    return { az, el, dist, roll };
  }
  function stageCamera(t) {
    const q = sm(clamp01((S.p - P_IN) / (1 - P_IN)));
    const o = stageParams(q); orbit(stageCam, target, o.dist, o.az, o.el, o.roll, t);
    const ox = mobile ? 0 : -W * 0.13, oy = mobile ? H * 0.14 : -H * 0.02;
    stageCam.setViewOffset(W, H, ox, oy, W, H); stageCam.updateProjectionMatrix();
  }
  function feedCamera(t) { const o = stageParams(0); o.dist *= 1.15; orbit(feedCam, target, o.dist, o.az, o.el, 0, 0); }

  /* =================== TAMAÑO =================== */
  function resize() {
    W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    const lw = Math.max(64, Math.round(W / PIX)), lh = Math.max(64, Math.round(H / PIX));
    rt.setSize(lw, lh); U.uRes.value.set(lw, lh);
    dioCam.aspect = stageCam.aspect = W / H;
    dioCam.updateProjectionMatrix(); stageCam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  /* =================== LOOP =================== */
  let raf = 0, running = false, slow = 0, frames = 0, degraded = 0;
  const degrade = () => {
    degraded++;
    if (degraded === 1) PIX += 1;
    else if (degraded === 2) { renderer.shadowMap.enabled = false; dioKey.castShadow = key.castShadow = false; [dio, stage].forEach((s) => s.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; o.material.needsUpdate = true; } })); }
    slow = 0; resize();
  };
  function update(dt, t) {
    U.uTime.value = t; U.uReveal.value = S.reveal; U.uFire.value = S.fire; U.uGlitch.value = S.glitch; U.uCrack.value = S.crack; U.uWhite.value = S.white;
    U.uAmt.value = 0.3 + S.fire * 0.7;
    S.shake *= Math.exp(-dt * 6);
    S.inside = S.loaded && !S.failed && S.p >= P_IN;
    S.feed = S.loaded && !S.failed && S.p >= P_FEED && !S.inside;
    U.uScan.value = S.inside ? 1 : 0;
    videoWant(S.view && !document.hidden && !S.inside);
    screenU.uGlitch.value = Math.max(0, screenU.uGlitch.value - dt * 4);
    screenU.uTrack.value = reduced ? 0 : (fract(t / 9) < 0.22 ? 0.05 : 0);          // tracking ~2 s cada 9 s
    { const sec = videoOK && !reduced ? Math.floor(video.currentTime) : 0; if (sec !== osdSec) { osdSec = sec; drawOSD(sec); } }
    screenU.uFeed.value = S.feed ? 1 : 0;
    screenU.tTex.value = S.feed ? feedRT.texture : (videoOK && !reduced && video.readyState >= 2 ? videoTex : (posterTex || noiseTex));
    // Falcon
    rig.rotation.y = yawBase + (reduced ? 0 : Math.sin(t * 0.35) * 0.03);
    if (mixer && !reduced) {
      mixer.update(dt);
      if (S.punching && actPunch.time >= HOLD_T) actPunch.paused = true;
      if (S.punching && !S.lit && actPunch.time >= PUNCH_T) ignite(true);
      S.charge = S.punching ? clamp01(actPunch.time / PUNCH_T) : 0;
    }
    const dim = 1 - 0.42 * S.charge * (1 - S.fire);           // se baja la luz mientras carga; vuelve con el fuego
    key.intensity = ST.key * dim; fillL.intensity = ST.fill * dim;
    rimBlue.intensity = 2.2 * ST.rim * (1 + 0.4 * S.charge); rimRed.intensity = 2.0 * ST.rim * (1 + 0.4 * S.charge);
    back.material.uniforms.uCharge.value = S.charge;
    if (hipBone) { rig.updateMatrixWorld(true); hipBone.getWorldPosition(hipPos).sub(hipPos0); hipPos.y *= 0.3; hipPos.multiplyScalar(mobile ? 0.55 : 0.8); if (reduced) follow.copy(hipPos); else follow.lerp(hipPos, Math.min(1, dt * 5)); }
    if (handBone) {
      handBone.getWorldPosition(fireGroup.position);
      const cam = S.inside ? stageCam : feedCam;
      camDir.subVectors(cam.position, fireGroup.position); fireGroup.rotation.y = Math.atan2(camDir.x, camDir.z);
      fireGroup.visible = S.fire > 0.001; fireLight.position.copy(fireGroup.position).add(tmpV.set(0, 4, 4));
    }
    fireLight.intensity = S.fire * 110;
    if (S.crack > 0.001 && handBone) { fireGroup.getWorldPosition(tmpV).project(stageCam); U.uCenter.value.set(clamp01(tmpV.x * 0.5 + 0.5), clamp01(tmpV.y * 0.5 + 0.5)); }
    // cámaras
    if (S.inside) stageCamera(t); else dioCamera(t);
    if (S.feed) feedCamera(t);
    screenLight.intensity = S.feed ? 420 : 300;
  }
  function render() {
    if (S.feed) { renderer.setRenderTarget(feedRT); renderer.render(stage, feedCam); }
    const cam = S.inside ? stageCam : dioCam;
    pixMat.uniforms.uNear.value = cam.near; pixMat.uniforms.uFar.value = cam.far;
    renderer.setRenderTarget(rt); renderer.render(S.inside ? stage : dio, cam);
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
    if (!S.inside) {   // pantalla de la CRT a resolución nativa (capa 1) encima del pase pixel
      const bg = dio.background; dio.background = null;   // un background Color fuerza clear aunque autoClear sea false
      renderer.autoClear = false; renderer.clearDepth(); dioCam.layers.set(1); renderer.render(dio, dioCam); dioCam.layers.set(0); renderer.autoClear = true;
      dio.background = bg;
    }
  }
  const frame = () => {
    raf = 0;
    if (!S.view || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (degraded < 2 && ++frames > 90) { if (dt > 0.024) slow++; else slow = Math.max(0, slow - 1); if (slow > 24) degrade(); }
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    update(dt, t); render();
    if (reduced) { running = false; return; }
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver((en) => { S.view = en[0].isIntersecting; if (S.view) start(); }, { threshold: 0 });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  if (fine) hero.addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth - 0.5; ptr.ty = e.clientY / innerHeight - 0.5; });

  /* ---------- Primer frame → activar modo 3D ---------- */
  window.__falcon = { S, rig, dioCam, stageCam, fireGroup, video, hand: () => handBone, actPunch: () => actPunch, STYLE };
  update(0, 0); render();
  if (renderer.getContext().getError() !== 0) throw new Error('gl error');
  hero.classList.add('has-3d'); document.documentElement.classList.add('has-3d');
  if (ST.model) hero.classList.add('is-animelee');   // muestra el crédito del modelo
  resize();

  /* =================== HISTORIA DE SCROLL =================== */
  let wasInside = false, wasFeed = false;
  function punch(on) {
    if (!mixer || S.punching === on) return;
    S.punching = on;
    if (on) { actPunch.reset(); actPunch.paused = false; actPunch.enabled = true; actPunch.setEffectiveWeight(1); actPunch.play(); actIdle.crossFadeTo(actPunch, 0.18, false); }
    else { actIdle.reset(); actIdle.setEffectiveWeight(1); actIdle.play(); actPunch.paused = false; actPunch.crossFadeTo(actIdle, 0.35, false); ignite(false); }
  }
  function ignite(on) {
    if (S.lit === on) return; S.lit = on;
    if (!motion) { S.fire = on ? 1 : 0; S.crack = on ? 1 : 0; return; }
    gsap.to(S, { fire: on ? 1 : 0, duration: on ? 0.9 : 0.5, ease: on ? 'power3.out' : 'power2.in', overwrite: 'auto' });
    gsap.to(S, { crack: on ? 1 : 0, duration: on ? 0.5 : 0.3, ease: 'power4.out', overwrite: 'auto' });
    if (on) {
      S.shake = 1.4;
      // el puño en pantalla → centro de las grietas
      fireGroup.getWorldPosition(tmpV).project(stageCam); U.uCenter.value.set(clamp01(tmpV.x * 0.5 + 0.5), clamp01(tmpV.y * 0.5 + 0.5));
      gsap.fromTo(S, { white: 0.8 }, { white: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(S, { crack: 0.35, duration: 1.2, delay: 1.0, ease: 'power2.inOut', overwrite: false });
      gsap.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 1.1, ease: 'power2.out', overwrite: true });
      hero.classList.add('is-punched'); gsap.to('.hero-copy', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in', overwrite: 'auto' });
    } else { hero.classList.remove('is-punched'); gsap.to('.hero-copy', { opacity: 1, y: 0, duration: 0.5, overwrite: 'auto' }); }
  }
  function glitchBurst(a) { S.glitch = a; motion && gsap.to(S, { glitch: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }); }
  if (motion) {
    const tl = gsap.timeline({ paused: true });
    tl.to('.hero .lede, .hero .cta', { opacity: 0, y: -10, ease: 'power2.in', duration: 0.18 }, 0.3)
      .to('.hero .kicker, .hero .flag', { opacity: 0, ease: 'power2.in', duration: 0.12 }, 0.42);
    ScrollTrigger.create({
      trigger: hero, start: () => 'top ' + navH(), end: () => '+=' + Math.round(innerHeight * (mobile ? 1.2 : 1.35)),
      pin: true, scrub: 0.25, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 5, animation: tl,
      onUpdate: (self) => {
        S.p = self.progress;
        const inside = S.loaded && !S.failed && S.p >= P_IN, feed = S.loaded && !S.failed && S.p >= P_FEED;
        if (inside !== wasInside) { glitchBurst(1); wasInside = inside; }
        if (feed !== wasFeed) { screenU.uGlitch.value = 1; wasFeed = feed; }
        if (S.p >= P_PUNCH) punch(true); else if (S.p < P_IN - 0.06) punch(false);
        start();
      },
      onRefresh: (self) => { S.p = self.progress; document.documentElement.style.setProperty('--navh', navH() + 'px'); },
    });
    gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.4, clearProps: 'opacity,transform' });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  } else {
    // Movimiento reducido / sin GSAP: diorama estático con el clip en la CRT
    S.p = 0.08; S.reveal = 1;
    addEventListener('resize', start);
  }
  start();
  return true;
}

try { setupScroll(); } catch (e) { console.warn('[melee/falcon3d] sin ScrollTrigger:', e && e.message ? e.message : e); }
try {
  main();
} catch (e) {
  console.warn('[melee/falcon3d] hero estático (sin 3D):', e && e.message ? e.message : e);
  hero && hero.classList.remove('has-3d');
  document.documentElement.classList.remove('has-3d');
  host && (host.innerHTML = '');
}
