/* =====================================================================
   Melee Dominicana — hero 3D: Captain Falcon (modelo del juego, GLB en
   models/falcon.glb con skin + animaciones Wait1 / SpecialN / AppealR).
   Render "pixel": la escena se dibuja a baja resolución y se escala con
   nearest, con posterizado ligero y contorno por profundidad; sombreado
   toon. Cámara en diagonal con dutch angle ligada al scroll (GSAP
   ScrollTrigger, scroll nativo). Beat final: Falcon Punch real + ave de
   fuego voxel en el puño. Si falla WebGL / el módulo / el modelo, el hero
   se queda con la bandera y el título (sin clase .has-3d).
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

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
const MODEL_URL = 'models/falcon.glb';
const PUNCH_T = 0.86;   // segundo del clip SpecialN en que sale el puño (frame ~52)
const HOLD_T = 1.12;    // se congela aquí con el brazo extendido

/* ---------- ScrollTrigger con scroll nativo (Lenis se quitó: hacía el scroll lento) ---------- */
function setupScroll() {
  if (!motion) return;
  gsap.registerPlugin(ScrollTrigger);
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
  const pos = [], col = [], seed = []; // seed: rand, kind (0 pluma / 1 ave), stagger, speed
  const nPlume = Math.round(170 / (thick === 1 ? 1.8 : 1));
  for (let n = 0; n < nPlume; n++) {
    const a = hash3(n, 7, 1) * Math.PI * 2, b = hash3(n, 3, 9) * Math.PI, r = 1.0 + hash3(n, 11, 5) * 3.5;
    pos.push(Math.sin(b) * Math.cos(a) * r * 0.9, Math.cos(b) * r * 1.2 + 1.0, Math.sin(b) * Math.sin(a) * r + 1);
    const t = hash3(n, 2, 2); col.push(1, 0.55 + 0.4 * t, 0.12 + 0.2 * t);
    seed.push(hash3(n, 5, 5), 0, r / 8, 0.6 + hash3(n, 8, 8) * 0.9);
  }
  const rows = FIREBIRD.length, cols = FIREBIRD[0].length;
  const cy = 7.5, cz = -1.5;
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

/* ---------- Escena ---------- */
function main() {
  if (!hero || !host) return false;
  if (!window.WebGL2RenderingContext) throw new Error('no webgl2');
  {
    // Sonda silenciosa: evita los console.error de Three cuando WebGL está deshabilitado
    const probe = document.createElement('canvas');
    const ctx = probe.getContext('webgl2');
    if (!ctx) throw new Error('webgl deshabilitado');
    const lose = ctx.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
  }
  document.documentElement.style.setProperty('--navh', navH() + 'px');

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.getContext()) throw new Error('no context');
  renderer.setPixelRatio(1);                       // el look pixel no necesita DPR alto
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NoToneMapping;      // el tone mapping lo hace el pase pixel
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(canvas);
  host.insertAdjacentHTML('beforeend', '<div class="falcon3d__flash"></div>');
  const flash = host.querySelector('.falcon3d__flash');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, mobile ? 0.004 : 0.0034);
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 36, 1, 2, 600);
  const clock = new THREE.Clock();

  // Estado (tweens de GSAP escriben aquí)
  const S = { p: 0, reveal: 0, fire: 0, shake: 0, view: true, lit: false, loaded: false, punching: false };
  const U = {
    uTime: { value: 0 }, uFire: { value: 0 }, uReveal: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 0.35 },
  };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------- Luces: key dorada, contorno azul RD y rojo RD ---------- */
  scene.add(new THREE.HemisphereLight(0x6f86d0, 0x1a0c10, 1.25));
  const key = new THREE.DirectionalLight(0xffd79a, 3.0);
  key.position.set(-30, 70, 70); key.target.position.set(0, 28, 0);
  scene.add(key, key.target);
  if (!mobile) {
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = sc.bottom = -46; sc.right = sc.top = 46; sc.near = 10; sc.far = 220;
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.6;
  }
  const rimBlue = new THREE.DirectionalLight(0x3b7bff, 3.0); rimBlue.position.set(-70, 26, -34); scene.add(rimBlue);
  const rimRed = new THREE.DirectionalLight(0xff2b3d, 3.2); rimRed.position.set(70, 8, -46); scene.add(rimRed);
  const fill = new THREE.DirectionalLight(0x8fa4e0, 0.7); fill.position.set(40, 10, 70); scene.add(fill);
  const fireLight = new THREE.PointLight(0xff7a1a, 0, 90, 1.6); scene.add(fireLight);

  /* ---------- Falcon (GLB) ---------- */
  const MODEL_SCALE = 2.6;                          // 22 unidades Melee → ~57 unidades de escena
  const rig = new THREE.Group(); scene.add(rig);
  const grad = new THREE.DataTexture(new Uint8Array([95, 150, 205, 255]), 4, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const matReveal = (shader) => {
    shader.uniforms.uReveal = U.uReveal;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n uniform float uReveal;\n float fhash(vec2 p){ return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (fhash(gl_FragCoord.xy) > uReveal) discard;');
  };
  let mixer = null, actIdle = null, actPunch = null, handBone = null, hipBone = null, yawBase = Math.PI / 2;
  const hipPos = new THREE.Vector3(), hipPos0 = new THREE.Vector3(), follow = new THREE.Vector3();
  const fireGroup = new THREE.Group(); fireGroup.visible = false; scene.add(fireGroup);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, (g) => {
    const model = g.scene;
    model.scale.setScalar(MODEL_SCALE);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = !mobile;
      o.frustumCulled = false;
      const src = o.material;
      const m = new THREE.MeshToonMaterial({ map: src.map || null, color: src.map ? 0xffffff : src.color, gradientMap: grad });
      if (m.map) { m.map.anisotropy = 1; m.map.minFilter = THREE.LinearMipmapLinearFilter; }
      m.onBeforeCompile = matReveal;
      o.material = m;
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      depth.onBeforeCompile = matReveal; o.customDepthMaterial = depth;
    });
    rig.add(model);
    mixer = new THREE.AnimationMixer(model);
    const clip = (n) => g.animations.find((c) => c.name === n);
    actIdle = mixer.clipAction(clip('Wait1')); actIdle.setLoop(THREE.LoopRepeat); actIdle.play();
    actPunch = mixer.clipAction(clip('SpecialN')); actPunch.setLoop(THREE.LoopOnce); actPunch.clampWhenFinished = true;
    // Cadera (HipN) y puño: en la pose del golpe, el hueso más alejado horizontalmente de la cadera.
    // La dirección cadera→puño define el yaw del rig para que el puñetazo salga hacia la cámara (+z).
    hipBone = model.getObjectByName('joint04') || model.getObjectByName('joint01');
    rig.rotation.y = 0; rig.updateMatrixWorld(true);   // medir en espacio local del modelo
    actIdle.weight = 0; actPunch.weight = 1; actPunch.play(); actPunch.time = HOLD_T; mixer.update(0); model.updateMatrixWorld(true);
    const tmp = new THREE.Vector3(), hp = new THREE.Vector3(); let best = -1e9;
    hipBone.getWorldPosition(hp);
    model.traverse((o) => { if (o.isBone && !/^joint0[0-4]$/.test(o.name)) { o.getWorldPosition(tmp); if (tmp.y < hp.y * 0.5) return; const d = Math.hypot(tmp.x - hp.x, tmp.z - hp.z); if (d > best) { best = d; handBone = o; } } });
    handBone.getWorldPosition(tmp); tmp.sub(hp); yawBase = Math.atan2(-tmp.x, tmp.z) + (mobile ? 0.15 : 0.42); // el puño sale hacia la derecha del titular
    actPunch.stop(); actIdle.weight = 1; actIdle.play(); mixer.update(0); model.updateMatrixWorld(true);
    rig.rotation.y = yawBase; rig.updateMatrixWorld(true); hipBone.getWorldPosition(hipPos0); follow.set(0, 0, 0);
    S.loaded = true;
    if (reduced) { S.reveal = 1; setFinalPose(); update(0, 0); }
    else if (motion) gsap.to(S, { reveal: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: start });
    else S.reveal = 1;
    start();
  }, undefined, (e) => {
    console.warn('[melee/falcon3d] no se pudo cargar el modelo, hero estático:', e && e.message ? e.message : e);
    teardown();
  });

  /* ---------- Fuego del Falcon Punch (voxels emisivos en el puño) ---------- */
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
             + kind * vec3(0.0, sin(uTime * 2.2 + aFire.x * 6.0) * 0.5, 0.0)
             + kind * (1.0 - on) * vec3(0.0, -7.0, 0.0);`)
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace('mvPosition = instanceMatrix * mvPosition;', 'mvPosition = instanceMatrix * mvPosition; mvPosition.xyz += fOff;'));
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 1.9;');
  };
  const fire = new THREE.InstancedMesh(fgeo, fmat, F.count);
  fire.frustumCulled = false;
  {
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < F.count; i++) {
      m4.makeTranslation(F.pos[i * 3], F.pos[i * 3 + 1], F.pos[i * 3 + 2]); fire.setMatrixAt(i, m4);
      c.setRGB(F.col[i * 3], F.col[i * 3 + 1], F.col[i * 3 + 2], THREE.SRGBColorSpace); fire.setColorAt(i, c);
    }
    fgeo.setAttribute('aFire', new THREE.InstancedBufferAttribute(F.seed, 4));
    fire.instanceMatrix.needsUpdate = true;
    if (fire.instanceColor) fire.instanceColor.needsUpdate = true;
  }
  fireGroup.add(fire);

  /* ---------- Brasas / píxeles flotando ---------- */
  const nE = mobile ? 120 : 320;
  {
    const p = new Float32Array(nE * 3), col = new Float32Array(nE * 3), sz = new Float32Array(nE), ph = new Float32Array(nE);
    const pal = [[1, 0.78, 0.35], [1, 0.35, 0.2], [0.35, 0.6, 1], [1, 1, 1]];
    for (let i = 0; i < nE; i++) {
      p.set([-50 + Math.random() * 110, Math.random() * 80, -40 + Math.random() * 70], i * 3);
      const c = pal[Math.floor(Math.random() * pal.length)]; col.set(c, i * 3);
      sz[i] = 1.0 + Math.random() * 1.6; ph[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const embers = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uAmt: U.uAmt },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aPhase; uniform float uTime, uAmt; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y + uTime * (1.5 + aPhase * 3.0), 80.0) - 15.0; p.x += sin(uTime * 0.6 + aPhase * 20.0) * 3.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (90.0 / max(1.0, -mv.z));
          vC = aCol; vA = (0.45 + 0.55 * sin(uTime * 3.0 + aPhase * 50.0)) * uAmt * smoothstep(-15.0, 0.0, p.y) * smoothstep(65.0, 40.0, p.y); }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, 1.0); }`,
    }));
    embers.frustumCulled = false;
    scene.add(embers);
  }

  /* ---------- Fondo: glows RD + haces de luz baratos (quad en NDC) ---------- */
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uRes: U.uRes, uFire: U.uFire },
    depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec2 uRes; uniform float uFire;
      void main(){
        vec2 asp = vec2(uRes.x / max(1.0, uRes.y), 1.0); vec2 uv = vUv;
        vec3 col = vec3(0.0275, 0.0314, 0.0588);
        float gb = exp(-length((uv - vec2(0.12, 0.88)) * asp) * 2.0);
        float gr = exp(-length((uv - vec2(0.92, 0.08)) * asp) * 2.3);
        float gg = exp(-length((uv - vec2(0.66, 0.52)) * asp * vec2(1.0, 1.5)) * 2.4);
        col += vec3(0.0, 0.18, 0.42) * gb * 0.85 + vec3(0.82, 0.07, 0.15) * gr * 0.5 + vec3(0.9, 0.62, 0.22) * gg * (0.11 + 0.32 * uFire);
        float d = (uv.x * asp.x * 0.75 - uv.y * 0.55);
        float sh = pow(max(0.0, sin(d * 7.0 + uTime * 0.12)), 8.0) * 0.07 + pow(max(0.0, sin(d * 13.0 - uTime * 0.09 + 1.3)), 14.0) * 0.05;
        col += vec3(0.95, 0.78, 0.45) * sh * smoothstep(0.0, 0.6, uv.y);
        col *= 1.0 - 0.38 * length((uv - 0.5) * vec2(1.15, 1.0));
        gl_FragColor = vec4(pow(col, vec3(2.2)) * 0.9, 1.0);   // autorado en sRGB; el pase pixel vuelve a codificar
      }`,
  }));
  back.frustumCulled = false; back.renderOrder = -10;
  scene.add(back);

  /* ---------- Pase pixel: baja resolución → nearest + posterizado + contorno ---------- */
  let PIX = mobile ? 2 : 3;                          // tamaño del píxel virtual en px CSS
  const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) });
  rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pixMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, tDepth: { value: rt.depthTexture }, uRes: U.uRes, uNear: { value: camera.near }, uFar: { value: camera.far }, uTime: U.uTime, uFire: U.uFire },
    depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uTime, uFire;
      float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){
        vec2 px = 1.0 / uRes;
        vec2 uv = (floor(vUv * uRes) + 0.5) * px;          // muestreo al centro del píxel virtual
        vec3 c = texture2D(tDiffuse, uv).rgb;
        // glow barato: solo lo que brilla (fuego, brasas)
        vec3 g = vec3(0.0);
        for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
          vec3 s = texture2D(tDiffuse, uv + vec2(float(x), float(y)) * px).rgb;
          g += max(s - 0.85, 0.0) / (1.0 + float(x * x + y * y) * 0.5);
        }
        c += g * 0.22;
        // contorno por profundidad (1 píxel virtual)
        float d0 = lin(texture2D(tDepth, uv).x);
        float e = 0.0;
        e = max(e, abs(lin(texture2D(tDepth, uv + vec2(px.x, 0.0)).x) - d0));
        e = max(e, abs(lin(texture2D(tDepth, uv - vec2(px.x, 0.0)).x) - d0));
        e = max(e, abs(lin(texture2D(tDepth, uv + vec2(0.0, px.y)).x) - d0));
        e = max(e, abs(lin(texture2D(tDepth, uv - vec2(0.0, px.y)).x) - d0));
        float edge = smoothstep(2.5, 6.0, e) * step(d0, 400.0);
        c = mix(c, c * 0.18, edge * 0.9);
        c = aces(c * 1.05);
        c = pow(c, vec3(1.0 / 2.2));
        c = floor(c * 28.0 + 0.5) / 28.0;                      // posterizado ligero
        c += (fract(sin(dot(floor(vUv * uRes), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.012;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pixMat));

  /* ---------- Cámara: órbita diagonal + dutch angle + push-in ---------- */
  const lerp = (a, b, t) => a + (b - a) * t, sm = (t) => t * t * (3 - 2 * t), rad = Math.PI / 180;
  const target = new THREE.Vector3(), tmp = new THREE.Vector3();
  function updateCamera(t) {
    const q = sm(THREE.MathUtils.clamp(S.p, 0, 1));
    const az = lerp(-34, 26, q) * rad + ptr.x * 0.1;
    const el = lerp(12, -4, q) * rad - ptr.y * 0.06;
    const dist = mobile ? lerp(96, 72, q) : lerp(88, 62, q);
    const roll = lerp(-7, -13, q) * rad;
    if (mobile) target.set(lerp(0, 2, q), lerp(29, 36, q), lerp(0, 3, q));
    else target.set(lerp(1, 4, q), lerp(29, 36, q), lerp(1, 4, q));
    target.add(follow);
    camera.position.set(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az));
    if (S.shake > 0.001) {
      tmp.set(Math.sin(t * 61.0), Math.cos(t * 53.0), Math.sin(t * 47.0)).multiplyScalar(S.shake * 1.4);
      camera.position.add(tmp);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.rotateZ(roll);
  }

  /* ---------- Tamaño ---------- */
  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    const lw = Math.max(64, Math.round(w / PIX)), lh = Math.max(64, Math.round(h / PIX));
    rt.setSize(lw, lh);
    U.uRes.value.set(lw, lh);
    camera.aspect = w / h;
    // Falcon desplazado al lado contrario del titular (derecha en desktop, arriba en móvil)
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    else camera.setViewOffset(w, h, -w * 0.2, -h * 0.02, w, h);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  /* ---------- Loop ---------- */
  let raf = 0, running = false, slow = 0, frames = 0, degraded = 0;
  const degrade = () => {
    degraded++;
    if (degraded === 1) PIX += 1;
    else if (degraded === 2) { renderer.shadowMap.enabled = false; key.castShadow = false; rig.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = false; o.material.needsUpdate = true; } }); }
    slow = 0; resize();
  };
  const camDir = new THREE.Vector3();
  function update(dt, t) {
    U.uTime.value = t; U.uReveal.value = S.reveal; U.uFire.value = S.fire;
    U.uAmt.value = 0.3 + S.fire * 0.7;
    rimBlue.intensity = 3.0 + S.p * 1.6; rimRed.intensity = 3.2 + S.p * 2.2;
    S.shake *= Math.exp(-dt * 6);
    rig.rotation.y = yawBase + (reduced ? 0 : Math.sin(t * 0.35) * 0.03);
    if (mixer && !reduced) {
      mixer.update(dt);
      if (S.punching && actPunch.time >= HOLD_T) actPunch.paused = true;
      if (S.punching && !S.lit && actPunch.time >= PUNCH_T) ignite(true);
    }
    if (hipBone) {
      // la cámara sigue el lunge del Falcon Punch (movimiento de raíz del clip)
      rig.updateMatrixWorld(true); hipBone.getWorldPosition(hipPos).sub(hipPos0); hipPos.y *= 0.3; hipPos.multiplyScalar(mobile ? 0.55 : 0.8);
      if (reduced) follow.copy(hipPos); else follow.lerp(hipPos, Math.min(1, dt * 5));
    }
    if (handBone) {
      handBone.getWorldPosition(fireGroup.position);
      camDir.subVectors(camera.position, fireGroup.position);
      fireGroup.rotation.y = Math.atan2(camDir.x, camDir.z);
      fireGroup.visible = S.fire > 0.001;
      fireLight.position.copy(fireGroup.position).add(tmp.set(0, 4, 4));
    }
    fireLight.intensity = S.fire * 120;
    updateCamera(t);
  }
  const render = () => {
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  };
  const frame = () => {
    raf = 0;
    if (!S.view || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (degraded < 2 && ++frames > 90) { if (dt > 0.024) slow++; else slow = Math.max(0, slow - 1); if (slow > 24) degrade(); }
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    update(dt, t);
    render();
    if (reduced) { running = false; return; } // estado final estático: un frame por cambio
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver((en) => { S.view = en[0].isIntersecting; if (S.view) start(); }, { threshold: 0 });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  if (fine) hero.addEventListener('pointermove', (e) => { ptr.tx = e.clientX / innerWidth - 0.5; ptr.ty = e.clientY / innerHeight - 0.5; });

  function teardown() {
    cancelAnimationFrame(raf); running = false; S.view = false;
    hero.classList.remove('has-3d'); document.documentElement.classList.remove('has-3d');
    if (hasGsap) ScrollTrigger.getAll().forEach((st) => { if (st.trigger === hero) { st.animation && st.animation.kill(); st.kill(); } });
    if (hasGsap) gsap.set(['.hero-copy', '.hero .lede', '.hero .cta'], { clearProps: 'all' });
    renderer.dispose(); host.innerHTML = '';
    hasGsap && ScrollTrigger.refresh();
  }

  /* ---------- Primer frame → activar modo 3D ---------- */
  window.__falcon = { S, rig, camera, fireGroup, hand: () => handBone, mixer: () => mixer, actPunch: () => actPunch };
  update(0, 0);
  render();
  if (renderer.getContext().getError() !== 0) throw new Error('gl error');
  hero.classList.add('has-3d');
  document.documentElement.classList.add('has-3d');
  resize();

  /* ---------- Historia de scroll ---------- */
  function punch(on) {
    if (!mixer || S.punching === on) return;
    S.punching = on;
    if (on) {
      actPunch.reset(); actPunch.paused = false; actPunch.enabled = true; actPunch.setEffectiveWeight(1); actPunch.play();
      actIdle.crossFadeTo(actPunch, 0.18, false);
    } else {
      actIdle.reset(); actIdle.setEffectiveWeight(1); actIdle.play();
      actPunch.paused = false; actPunch.crossFadeTo(actIdle, 0.35, false);
      ignite(false);
    }
  }
  function ignite(on) {
    if (S.lit === on) return; S.lit = on;
    if (!motion) { S.fire = on ? 1 : 0; return; }
    gsap.to(S, { fire: on ? 1 : 0, duration: on ? 0.9 : 0.5, ease: on ? 'power3.out' : 'power2.in', overwrite: 'auto' });
    if (on) { S.shake = 1; gsap.fromTo(flash, { opacity: 0.75 }, { opacity: 0, duration: 1.0, ease: 'power2.out', overwrite: true }); }
  }
  function setFinalPose() {
    if (!mixer) return;
    actIdle.stop(); actPunch.reset(); actPunch.play(); actPunch.time = HOLD_T; actPunch.paused = true; mixer.update(0);
    S.fire = 1; S.lit = true; S.punching = true;
  }
  if (motion) {
    const tl = gsap.timeline({ paused: true });
    tl.to('.hero-copy', { y: mobile ? -24 : -48, ease: 'none', duration: 1 }, 0)
      .to('.hero .lede, .hero .cta', { opacity: 0, y: -10, ease: 'power2.in', duration: 0.35 }, 0.55);
    ScrollTrigger.create({
      trigger: hero, start: () => 'top ' + navH(), end: () => '+=' + Math.round(innerHeight * (mobile ? 1.0 : 1.15)),
      pin: true, scrub: 0.25, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 5, animation: tl,
      onUpdate: (self) => { S.p = self.progress; if (self.progress >= 0.6) punch(true); else if (self.progress < 0.5) punch(false); start(); },
      onRefresh: (self) => { S.p = self.progress; document.documentElement.style.setProperty('--navh', navH() + 'px'); },
    });
    gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.5, clearProps: 'opacity,transform' });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  } else {
    // Movimiento reducido / sin GSAP: estado final, estático
    S.p = 0.86; S.reveal = 1; S.fire = 1; S.lit = true;
    addEventListener('resize', start);
  }
  start();
  return true;
}

try {
  setupScroll();
} catch (e) {
  console.warn('[melee/falcon3d] sin ScrollTrigger:', e && e.message ? e.message : e);
}
try {
  main();
} catch (e) {
  console.warn('[melee/falcon3d] hero estático (sin 3D):', e && e.message ? e.message : e);
  hero && hero.classList.remove('has-3d');
  document.documentElement.classList.remove('has-3d');
  host && (host.innerHTML = '');
}
