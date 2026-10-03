/* =====================================================================
   Melee Dominicana — hero 3D: Captain Falcon en voxels (escultura
   original, ver falcon-voxels.js). Three.js r169 por importmap.
   Cámara en diagonal con dutch angle ligada al scroll (GSAP
   ScrollTrigger + Lenis); al final el puño se enciende (ave de fuego).
   Si falla WebGL / el módulo, el hero se queda con la bandera y el
   título (sin clase .has-3d).
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildFalcon } from './falcon-voxels.js';

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

/* ---------- Lenis + ScrollTrigger (scroll suave de toda la página) ---------- */
let lenis = null;
function setupScroll() {
  if (!motion) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    document.documentElement.classList.add('has-lenis');
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -navH(), duration: 1.2 });
    });
  }
}

/* ---------- Escena ---------- */
function main() {
  if (!hero || !host) return false;
  if (!window.WebGL2RenderingContext && !window.WebGLRenderingContext) throw new Error('no webgl');
  {
    // Sonda silenciosa: evita los console.error de Three cuando WebGL está deshabilitado
    const probe = document.createElement('canvas');
    const ctx = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!ctx) throw new Error('webgl deshabilitado');
    const lose = ctx.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
  }
  document.documentElement.style.setProperty('--navh', navH() + 'px');

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.getContext()) throw new Error('no context');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(canvas);
  host.insertAdjacentHTML('beforeend', '<div class="falcon3d__flash"></div>');
  const flash = host.querySelector('.falcon3d__flash');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, mobile ? 0.0042 : 0.0036);
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 36, 1, 1, 700);
  const clock = new THREE.Clock();

  // Estado (tweens de GSAP escriben aquí)
  const S = { p: 0, assemble: 0, fire: 0, glow: 0, shake: 0, view: true, lit: false };
  const U = {
    uAssemble: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 }, uFire: { value: 0 },
    uPr: { value: renderer.getPixelRatio() }, uRes: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 0.35 },
  };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------- Luces: key dorada, contorno azul RD y rojo RD ---------- */
  scene.add(new THREE.HemisphereLight(0x3a5aa8, 0x120a10, 0.55));
  const key = new THREE.DirectionalLight(0xffd79a, 2.4);
  key.position.set(42, 70, 58);
  key.target.position.set(0, 22, 0);
  scene.add(key, key.target);
  if (!mobile) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = sc.bottom = -52; sc.right = sc.top = 52; sc.near = 10; sc.far = 220;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.9;
  }
  const rimBlue = new THREE.DirectionalLight(0x3b7bff, 3.2); rimBlue.position.set(-70, 26, -34); scene.add(rimBlue);
  const rimRed = new THREE.DirectionalLight(0xff2b3d, 3.4); rimRed.position.set(70, 8, -46); scene.add(rimRed);
  const fill = new THREE.DirectionalLight(0x6a86d8, 0.5); fill.position.set(-20, -10, 60); scene.add(fill);
  const fireLight = new THREE.PointLight(0xff7a1a, 0, 90, 1.6); scene.add(fireLight);

  /* ---------- Falcon voxel (un draw call) ---------- */
  const M = buildFalcon(mobile ? 1.5 : 0.8);
  const step = M.step;
  const geo = new THREE.BoxGeometry(step * 0.9, step * 0.9, step * 0.9);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.52, metalness: 0.12, flatShading: true });
  const patchVoxel = (shader) => {
    Object.assign(shader.uniforms, { uAssemble: U.uAssemble, uTime: U.uTime, uGlow: U.uGlow });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aSeed; attribute vec3 aScatter; uniform float uAssemble; uniform float uTime; varying vec2 vGlow; vec3 fOff;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float la = clamp((uAssemble - aSeed.y * 0.55 - aSeed.x * 0.15) / 0.3, 0.0, 1.0); la = la * la * (3.0 - 2.0 * la);
        transformed *= la;
        float wob = 1.0 - la;
        fOff = aScatter * wob + vec3(sin(uTime * 1.7 + aSeed.x * 20.0), cos(uTime * 1.3 + aSeed.x * 13.0), 0.0) * wob * 3.0;
        vGlow = aSeed.zw;`)
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace('mvPosition = instanceMatrix * mvPosition;', 'mvPosition = instanceMatrix * mvPosition; mvPosition.xyz += fOff;'))
      .replace('#include <worldpos_vertex>', THREE.ShaderChunk.worldpos_vertex.replace('worldPosition = instanceMatrix * worldPosition;', 'worldPosition = instanceMatrix * worldPosition; worldPosition.xyz += fOff;'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n varying vec2 vGlow; uniform float uGlow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vGlow.x * vec3(1.0, 0.30, 0.08) * (0.45 + 2.4 * uGlow) + vGlow.y * vec3(1.0, 0.72, 0.25) * (0.12 + 1.4 * uGlow);`);
  };
  mat.onBeforeCompile = patchVoxel;
  const falcon = new THREE.InstancedMesh(geo, mat, M.count);
  falcon.castShadow = falcon.receiveShadow = !mobile;
  {
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    const seed = new Float32Array(M.count * 4), scatter = new Float32Array(M.count * 3);
    for (let i = 0; i < M.count; i++) {
      const x = M.pos[i * 3], y = M.pos[i * 3 + 1], z = M.pos[i * 3 + 2];
      m4.makeTranslation(x, y, z); falcon.setMatrixAt(i, m4);
      c.setRGB(M.col[i * 3], M.col[i * 3 + 1], M.col[i * 3 + 2], THREE.SRGBColorSpace); falcon.setColorAt(i, c);
      const r = M.seed[i * 2], hN = M.seed[i * 2 + 1];
      seed.set([r, hN, M.glow[i * 2], M.glow[i * 2 + 1]], i * 4);
      // los voxels llegan desde fuera (arriba-derecha y laterales), más lejos cuanto más altos
      const ang = r * Math.PI * 2, rad = 40 + r * 90;
      scatter.set([Math.cos(ang) * rad * 0.8 + 30, 40 + hN * 80 + r * 30, Math.sin(ang) * rad * 0.5 - 20], i * 3);
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aScatter', new THREE.InstancedBufferAttribute(scatter, 3));
    falcon.instanceMatrix.needsUpdate = true;
    if (falcon.instanceColor) falcon.instanceColor.needsUpdate = true;
  }
  if (!mobile) {
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = patchVoxel;
    falcon.customDepthMaterial = depth;
  }
  const rig = new THREE.Group();
  rig.add(falcon);
  scene.add(rig);

  /* ---------- Fuego del Falcon Punch (voxels emisivos) ---------- */
  const F = M.fire;
  const fgeo = new THREE.BoxGeometry(step * 1.1, step * 1.1, step * 1.1);
  const fmat = new THREE.MeshBasicMaterial({ fog: false });
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
        fOff = (1.0 - kind) * vec3(sin(uTime * 2.0 + aFire.x * 30.0) * 1.6, life * 16.0, cos(uTime * 1.7 + aFire.x * 20.0) * 1.6)
             + kind * vec3(0.0, sin(uTime * 2.2 + aFire.x * 6.0) * 0.7, 0.0)
             + kind * (1.0 - on) * vec3(-9.0, -12.0, -7.0);`)
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace('mvPosition = instanceMatrix * mvPosition;', 'mvPosition = instanceMatrix * mvPosition; mvPosition.xyz += fOff;'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 1.5;');
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
  rig.add(fire);
  fireLight.position.set(M.fist[0] + 2, M.fist[1] + 4, M.fist[2] + 6);

  /* ---------- Brasas / píxeles flotando ---------- */
  const nE = mobile ? 140 : 420;
  {
    const p = new Float32Array(nE * 3), col = new Float32Array(nE * 3), sz = new Float32Array(nE), ph = new Float32Array(nE);
    const pal = [[1, 0.78, 0.35], [1, 0.35, 0.2], [0.35, 0.6, 1], [1, 1, 1]];
    for (let i = 0; i < nE; i++) {
      p.set([-50 + Math.random() * 110, Math.random() * 80, -40 + Math.random() * 70], i * 3);
      const c = pal[Math.floor(Math.random() * pal.length)]; col.set(c, i * 3);
      sz[i] = 1.2 + Math.random() * 2.6; ph[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    const embers = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uPr: U.uPr, uAmt: U.uAmt },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aPhase; uniform float uTime, uPr, uAmt; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y + uTime * (1.5 + aPhase * 3.0), 80.0) - 15.0; p.x += sin(uTime * 0.6 + aPhase * 20.0) * 3.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPr * (240.0 / max(1.0, -mv.z));
          vC = aCol; vA = (0.45 + 0.55 * sin(uTime * 3.0 + aPhase * 50.0)) * uAmt * smoothstep(-15.0, 0.0, p.y) * smoothstep(65.0, 40.0, p.y); }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q = abs(gl_PointCoord - 0.5); if (max(q.x, q.y) > 0.5) discard; gl_FragColor = vec4(vC * vA, 1.0); }`,
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
      float hs(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
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
        col += (hs(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  back.frustumCulled = false; back.renderOrder = -10;
  scene.add(back);

  /* ---------- Post (bloom solo desktop) ---------- */
  let composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.2, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- Cámara: órbita diagonal + dutch angle + push-in ---------- */
  const lerp = (a, b, t) => a + (b - a) * t, sm = (t) => t * t * (3 - 2 * t), rad = Math.PI / 180;
  const target = new THREE.Vector3(), tmp = new THREE.Vector3();
  function updateCamera(t) {
    const q = sm(THREE.MathUtils.clamp(S.p, 0, 1));
    const az = lerp(-36, 30, q) * rad + ptr.x * 0.1;
    const el = lerp(14, -5, q) * rad - ptr.y * 0.06;
    const dist = mobile ? lerp(122, 94, q) : lerp(104, 72, q);
    const roll = lerp(-7, -14, q) * rad;
    if (mobile) target.set(lerp(0, 5, q), lerp(20, 28, q), lerp(0, 4, q));
    else target.set(lerp(2, 8, q), lerp(25, 31, q), lerp(2, 6, q));
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
    camera.aspect = w / h;
    // Falcon desplazado al lado contrario del titular (derecha en desktop, arriba en móvil)
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    else camera.setViewOffset(w, h, -w * 0.2, -h * 0.02, w, h);
    camera.updateProjectionMatrix();
    composer && composer.setSize(w, h);
    const dpr = renderer.getPixelRatio();
    U.uPr.value = dpr; U.uRes.value.set(w * dpr, h * dpr);
  }
  resize();
  addEventListener('resize', resize);

  /* ---------- Loop ---------- */
  let raf = 0, running = false, slow = 0, frames = 0, degraded = 0;
  const degrade = () => {
    degraded++;
    if (degraded === 1) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25)); if (bloom) { composer.removePass(bloom); bloom.dispose(); bloom = null; } }
    else if (degraded === 2) { renderer.shadowMap.enabled = false; key.castShadow = false; falcon.castShadow = falcon.receiveShadow = false; mat.needsUpdate = true; }
    slow = 0; resize();
  };
  function update(dt, t) {
    U.uTime.value = t; U.uAssemble.value = S.assemble; U.uGlow.value = S.glow; U.uFire.value = S.fire;
    U.uAmt.value = 0.3 + S.fire * 0.7;
    fireLight.intensity = S.fire * 110;
    rimBlue.intensity = 3.2 + S.p * 1.6; rimRed.intensity = 3.4 + S.p * 2.2;
    S.shake *= Math.exp(-dt * 6);
    rig.position.y = reduced ? 0 : Math.sin(t * 0.8) * 0.5;
    rig.rotation.y = reduced ? 0 : Math.sin(t * 0.35) * 0.02;
    updateCamera(t);
  }
  const render = () => (composer ? composer.render() : renderer.render(scene, camera));
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

  /* ---------- Primer frame → activar modo 3D ---------- */
  update(0, 0);
  renderer.compile(scene, camera);
  render();
  if (renderer.getContext().getError() !== 0) throw new Error('gl error');
  hero.classList.add('has-3d');
  document.documentElement.classList.add('has-3d');
  resize();

  /* ---------- Historia de scroll ---------- */
  const ignite = (on) => {
    if (S.lit === on) return; S.lit = on;
    if (!motion) { S.fire = S.glow = on ? 1 : 0; return; }
    gsap.to(S, { fire: on ? 1 : 0, duration: on ? 1.1 : 0.6, ease: on ? 'power3.out' : 'power2.in', overwrite: 'auto' });
    gsap.to(S, { glow: on ? 1 : 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    if (on) { S.shake = 1; gsap.fromTo(flash, { opacity: 0.75 }, { opacity: 0, duration: 1.0, ease: 'power2.out', overwrite: true }); }
  };
  if (motion) {
    const tl = gsap.timeline({ paused: true });
    tl.to('.hero-copy', { y: mobile ? -24 : -48, ease: 'none', duration: 1 }, 0)
      .to('.hero .lede, .hero .cta', { opacity: 0, y: -10, ease: 'power2.in', duration: 0.35 }, 0.55);
    ScrollTrigger.create({
      trigger: hero, start: () => 'top ' + navH(), end: () => '+=' + Math.round(innerHeight * (mobile ? 1.0 : 1.15)),
      pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 5, animation: tl,
      onUpdate: (self) => { S.p = self.progress; ignite(self.progress >= 0.64 ? true : self.progress < 0.56 ? false : S.lit); start(); },
      onRefresh: (self) => { S.p = self.progress; document.documentElement.style.setProperty('--navh', navH() + 'px'); },
    });
    // Los voxels se ensamblan al cargar; el texto entra después
    gsap.to(S, { assemble: 1, duration: 2.4, ease: 'power2.inOut', delay: 0.15, onUpdate: start });
    gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.7, clearProps: 'opacity,transform' });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  } else {
    // Movimiento reducido / sin GSAP: estado final, estático
    S.p = 0.86; S.assemble = 1; S.lit = true; S.fire = 1; S.glow = 1;
    addEventListener('resize', start);
  }
  start();
  return true;
}

try {
  setupScroll();
} catch (e) {
  console.warn('[melee/falcon3d] sin scroll suave:', e && e.message ? e.message : e);
}
try {
  main();
} catch (e) {
  console.warn('[melee/falcon3d] hero estático (sin 3D):', e && e.message ? e.message : e);
  hero && hero.classList.remove('has-3d');
  document.documentElement.classList.remove('has-3d');
  host && (host.innerHTML = '');
}
