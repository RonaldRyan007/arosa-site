// A árvore 3D (modelos/arvore.glb, feita no Meshy) no fim do jardim TLLN: plantada num mar de galáxia
// que gira devagar, com frutos de luz na copa que se soltam, caem e abrem anéis na água.
// Gira devagar e a câmera inclina com o mouse. Só desenha quando a seção está na tela.
// Se não houver WebGL ou o modelo não carregar, fica a ilustração (img/arvore.*) que está por baixo.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const secao = document.querySelector(".arvore");
const canvas = secao.querySelector(".arvore3d");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch { canvas.remove(); throw new Error("sem WebGL: fica a ilustração"); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const CEU = new THREE.Color(0x06050c);
const cena = new THREE.Scene();
cena.background = CEU;
cena.fog = new THREE.FogExp2(0x0d0e18, 0.035);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

// luz fria de lua por trás + preenchimento azulado vindo do mar
cena.add(new THREE.HemisphereLight(0x6a7aa8, 0x3a1f5a, 0.9));
const lua = new THREE.DirectionalLight(0xbfd6ff, 2.2); lua.position.set(-6, 10, -8); cena.add(lua);
const frente = new THREE.DirectionalLight(0x8fb8c8, 0.6); frente.position.set(4, 3, 10); cena.add(frente);
const brilhoCopa = new THREE.PointLight(0xbfefff, 18, 12, 1.5); cena.add(brilhoCopa);

// ── céu estrelado ──
{
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.9 + 0.05;
    v.normalize().multiplyScalar(90); pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  cena.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.35, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.8 })));
}

// ── mar de galáxia: espiral de nebulosa, estrelas piscando e anéis onde os frutos caem ──
const MAX_ANEIS = 8;
const aneis = Array.from({ length: MAX_ANEIS }, () => new THREE.Vector3(0, 0, -99)); // x, z, instante
const mar = new THREE.Mesh(
  new THREE.CircleGeometry(60, 96),
  new THREE.ShaderMaterial({
    uniforms: { uTempo: { value: 0 }, uAneis: { value: aneis }, uCeu: { value: new THREE.Color(0x0d0e18) } },
    vertexShader: `
      varying vec2 vP; varying float vDist;
      void main() {
        vP = position.xy;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTempo; uniform vec3 uAneis[${MAX_ANEIS}]; uniform vec3 uCeu;
      varying vec2 vP; varying float vDist;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec2 p = vec2(vP.x, -vP.y);
        float r = length(p), ang = atan(p.y, p.x);
        float espiral = ang + log(r + 0.5) * 1.8 - uTempo * 0.04;
        vec2 q = vec2(cos(espiral), sin(espiral)) * (1.5 + r * 0.25);
        float n = fbm(q * 1.4 + uTempo * 0.02);
        float braco = smoothstep(0.35, 0.85, n) * (0.6 + 0.4 * sin(espiral * 2.0));
        vec3 fundo = vec3(0.03, 0.025, 0.08);
        vec3 cor = mix(fundo, vec3(0.30, 0.13, 0.48), braco);
        cor = mix(cor, vec3(0.62, 0.18, 0.45), smoothstep(0.62, 0.95, n) * 0.7);
        cor = mix(cor, vec3(0.10, 0.40, 0.42), smoothstep(0.5, 0.9, fbm(q * 2.3 - 3.0)) * 0.35);
        // estrelas dentro da água
        vec2 celula = floor(p * 7.0); float e = h(celula);
        if (e > 0.965) {
          vec2 c = (celula + 0.5) / 7.0; float d = length(p - c);
          cor += vec3(0.9, 0.95, 1.0) * smoothstep(0.035, 0.0, d) * (0.6 + 0.4 * sin(uTempo * 2.0 + e * 60.0));
        }
        // ondinhas
        cor += 0.03 * sin(r * 9.0 - uTempo * 1.2) * smoothstep(12.0, 2.0, r);
        // anéis dos frutos
        for (int i = 0; i < ${MAX_ANEIS}; i++) {
          float idade = uTempo - uAneis[i].z;
          if (idade < 0.0 || idade > 4.0) continue;
          float d = length(p - uAneis[i].xy);
          for (float k = 0.0; k < 2.0; k++) {
            float a = idade - k * 0.35;
            if (a < 0.0) continue;
            cor += vec3(0.75, 0.9, 1.0) * exp(-pow((d - a * 0.9) * 7.0, 2.0)) * exp(-a * 1.1) * 0.9;
          }
        }
        // some na névoa ao longe
        float nevoa = 1.0 - exp(-pow(vDist * 0.028, 2.0));
        gl_FragColor = vec4(mix(cor * 1.7, uCeu, nevoa), 1.0);
      }`,
  }),
);
mar.rotation.x = -Math.PI / 2;
cena.add(mar);

// ── brilho dos frutos (sprite com gradiente feito no canvas) ──
const tex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, "rgba(220,248,255,.95)");
  r.addColorStop(0.4, "rgba(150,215,240,.35)"); r.addColorStop(1, "rgba(120,180,230,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const matFruto = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

const arvore = new THREE.Group();
cena.add(arvore);
const frutos = [];
const respingos = [];
const ALTURA = 7;

new GLTFLoader().load("/modelos/arvore.glb", (gltf) => {
  const modelo = gltf.scene;
  // ajusta a escala para ALTURA e apoia as raízes na água
  const caixa = new THREE.Box3().setFromObject(modelo), tam = caixa.getSize(new THREE.Vector3()), centro = caixa.getCenter(new THREE.Vector3());
  const k = ALTURA / tam.y;
  modelo.scale.setScalar(k);
  modelo.position.set(-centro.x * k, -caixa.min.y * k - 0.15, -centro.z * k);
  modelo.traverse((m) => { if (m.isMesh) { m.material.side = THREE.DoubleSide; m.material.envMapIntensity = 0.4; } });
  arvore.add(modelo);

  // frutos espalhados num elipsoide dentro da copa (parte de cima da árvore)
  const raioX = tam.x * k * 0.42, raioZ = tam.z * k * 0.42;
  const yCopa = ALTURA * 0.72, altCopa = ALTURA * 0.2;
  brilhoCopa.position.set(0, yCopa, 0);
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    const casa = new THREE.Vector3(Math.cos(a) * raioX * r, yCopa + (Math.random() - 0.5) * 2 * altCopa, Math.sin(a) * raioZ * r);
    const s = new THREE.Sprite(matFruto.clone());
    s.position.copy(casa); s.scale.setScalar(0.55);
    arvore.add(s);
    frutos.push({ s, casa, estado: "preso", vy: 0, espera: 3 + Math.random() * 20, fase: Math.random() * 6 });
  }
  secao.classList.add("arvore-3d-pronta");
}, undefined, () => canvas.remove()); // sem modelo: fica a ilustração

// poeira de estrela que sobe quando um fruto toca a água
const QTD_P = 300, posP = new Float32Array(QTD_P * 3).fill(-99), velP = new Float32Array(QTD_P * 3), vidaP = new Float32Array(QTD_P);
const geoP = new THREE.BufferGeometry(); geoP.setAttribute("position", new THREE.BufferAttribute(posP, 3));
cena.add(new THREE.Points(geoP, new THREE.PointsMaterial({ color: 0xdff4ff, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
let proxP = 0, proxAnel = 0;
function respingar(x, z, t) {
  aneis[proxAnel].set(x, z, t); proxAnel = (proxAnel + 1) % MAX_ANEIS;
  for (let k = 0; k < 24; k++) {
    const i = proxP; proxP = (proxP + 1) % QTD_P;
    posP.set([x, 0.05, z], i * 3);
    velP.set([(Math.random() - 0.5) * 1.2, 1 + Math.random() * 1.8, (Math.random() - 0.5) * 1.2], i * 3);
    vidaP[i] = 1 + Math.random();
  }
}

// ── interação, tamanho e visibilidade ──
let mx = 0, my = 0, visivel = false;
addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(secao);
function ajustar() {
  const r = secao.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
addEventListener("resize", ajustar);
ajustar();

const relogio = new THREE.Clock();
const mundo = new THREE.Vector3();
function quadro() {
  requestAnimationFrame(quadro);
  const dt = Math.min(relogio.getDelta(), 0.05), t = relogio.elapsedTime, vel = calmo ? 0 : 1;
  if (!visivel) return;

  // câmera: mais longe no celular (tela em pé), inclina com o mouse
  const longe = camera.aspect < 0.8 ? 21 : 14;
  camera.position.x += (mx * 4 - camera.position.x) * 0.04;
  camera.position.y += (5.2 - my * 2.5 - camera.position.y) * 0.04; // de cima: o mar aparece
  camera.position.z = longe;
  camera.lookAt(0, ALTURA * 0.36, 0);

  arvore.rotation.y += 0.05 * dt * vel;
  mar.material.uniforms.uTempo.value = t;
  brilhoCopa.intensity = 18 + Math.sin(t * 1.3) * 4;

  for (const f of frutos) {
    if (f.estado === "preso") {
      f.s.position.y = f.casa.y + Math.sin(t * 1.4 + f.fase) * 0.04;
      f.s.material.opacity = 0.75 + 0.25 * Math.sin(t * 2 + f.fase);
      if (vel && (f.espera -= dt) <= 0) { f.estado = "caindo"; f.vy = 0; }
    } else if (f.estado === "caindo") {
      f.vy = Math.min(f.vy + 2.2 * dt, 4);             // queda lenta, de sonho
      f.s.position.y -= f.vy * dt;
      if (f.s.position.y <= 0.1) {
        f.s.getWorldPosition(mundo);
        respingar(mundo.x, mundo.z, t);
        f.estado = "brotando"; f.s.position.copy(f.casa); f.s.scale.setScalar(0.001);
      }
    } else { // volta a crescer na copa
      const s = Math.min(0.55, f.s.scale.x + dt * 0.12);
      f.s.scale.setScalar(s);
      if (s >= 0.55) { f.estado = "preso"; f.espera = 6 + Math.random() * 18; }
    }
  }

  for (let i = 0; i < QTD_P; i++) {
    if (vidaP[i] <= 0) continue;
    vidaP[i] -= dt;
    velP[i * 3 + 1] -= 1.6 * dt;
    for (let k = 0; k < 3; k++) posP[i * 3 + k] += velP[i * 3 + k] * dt;
    if (vidaP[i] <= 0 || posP[i * 3 + 1] < 0) { posP[i * 3 + 1] = -99; vidaP[i] = 0; }
  }
  geoP.attributes.position.needsUpdate = true;

  renderer.render(cena, camera);
}
quadro();
