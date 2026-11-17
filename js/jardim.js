// Jardim do easter egg TLLN, na pegada de horror de névoa: rosas brancas em volta e uma preta no meio,
// cinzas caindo, lanterna que segue o cursor e, de tempos em tempos, a virada para o "outro mundo".
// Rolando a página, a névoa engole tudo e leva até a árvore (arvore.js).
// Saída escondida: clicar 5 vezes na rosa preta desfaz e devolve a home.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { criarRosa, fundirPorMaterial } from "./rosa-geo.js";
import { som } from "./jardim-som.js";

const canvas = document.getElementById("jardim");
const raiz = document.documentElement;
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const nevoaCss = document.querySelector(".nevoa");
const escuro = document.querySelector(".escuro");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const NEVOA = new THREE.Color(0x16181a), NEVOA_OUTRO = new THREE.Color(0x1c0604);
const cena = new THREE.Scene();
cena.background = NEVOA.clone();
cena.fog = new THREE.FogExp2(NEVOA.clone(), 0.12);
cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
cena.environmentIntensity = 0.12;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
cena.add(camera);

// luar fraquíssimo; quem ilumina de verdade é a lanterna presa na câmera
const lua = new THREE.DirectionalLight(0xb8c4d8, 0.35); lua.position.set(-3, 8, 4); cena.add(lua);
cena.add(new THREE.AmbientLight(0xffffff, 0.04));
const lanterna = new THREE.SpotLight(0xfff1d6, 220, 26, 0.34, 0.6, 1.2);
lanterna.position.set(0.25, -0.2, 0); camera.add(lanterna);
cena.add(lanterna.target);
const brasa = new THREE.PointLight(0xff1030, 6, 5); brasa.position.set(0, 0.9, 1.2); cena.add(brasa);

// ── materiais (com a cor do "outro mundo" guardada para misturar) ──
const mat = (cor, outro, extra = {}) => {
  const m = new THREE.MeshPhysicalMaterial({ color: cor, side: THREE.DoubleSide, ...extra });
  m.userData.cores = [new THREE.Color(cor), new THREE.Color(outro)];
  return m;
};
const branca = mat(0xece7e0, 0x5b1d12, { roughness: 0.55, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4 });
const brancaMiolo = mat(0xcfc5ba, 0x2e0804, { roughness: 0.6 });
const caule = mat(0x1a2219, 0x140504, { roughness: 0.7 });
const preta = mat(0x030303, 0x120000, { metalness: 0.1, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.1, iridescence: 0.25, iridescenceIOR: 1.6 });
const pretaMiolo = mat(0x2a0006, 0x8a0a00, { roughness: 0.4 });
const cauleEscuro = mat(0x0c0c0c, 0x0c0303, { roughness: 0.4 });
const chaoMat = mat(0x0d0d0d, 0x1a0805, { roughness: 1 });
const todos = [branca, brancaMiolo, caule, preta, pretaMiolo, cauleEscuro, chaoMat];

const CHAO = -3.1;

// ── rosas brancas: uma rosa fundida por material e repetida com InstancedMesh ──
const partes = fundirPorMaterial(criarRosa({ petala: branca, miolo: brancaMiolo, verde: caule }).rosa);
const lugares = [];
let semente = 7;
const sorte = () => ((semente = (semente * 16807) % 2147483647) / 2147483647); // mesmo jardim sempre
for (let anel = 0; anel < 5; anel++) { // até r≈6.5: a câmera gira por fora, numa clareira
  const raio = 1.5 + anel * 1.2, qtd = 10 + anel * 8;
  for (let i = 0; i < qtd; i++) {
    const a = (i / qtd) * Math.PI * 2 + sorte() * 0.5 + anel;
    const r = raio + (sorte() - 0.5) * 0.7, s = 0.42 + sorte() * 0.2;
    const murcha = sorte() < 0.18 ? 0.5 + sorte() * 0.5 : 0; // algumas tortas, quase caídas
    lugares.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s, giro: sorte() * 6.28, inclina: (sorte() - 0.5) * 0.35 + murcha, fase: sorte() * 6.28 });
  }
}
const brancas = [...partes].map(([m, geo]) => { const im = new THREE.InstancedMesh(geo, m, lugares.length); cena.add(im); return im; });
const m4 = new THREE.Object3D();
function balancar(t) {
  lugares.forEach((l, i) => {
    m4.position.set(l.x, CHAO + 3.1 * l.s, l.z);
    m4.rotation.set(0.15 + Math.sin(t * 0.7 + l.fase) * 0.03, l.giro, l.inclina + Math.sin(t * 0.5 + l.fase) * 0.04);
    m4.scale.setScalar(l.s);
    m4.updateMatrix();
    for (const im of brancas) im.setMatrixAt(i, m4.matrix);
  });
  for (const im of brancas) im.instanceMatrix.needsUpdate = true;
}

// ── a rosa preta no centro, mais alta que o canteiro ──
const negra = criarRosa({ petala: preta, miolo: pretaMiolo, verde: cauleEscuro });
negra.rosa.scale.setScalar(0.95);
negra.rosa.position.y = CHAO + 3.1 * 0.95;
cena.add(negra.rosa);
const florNegra = new THREE.Vector3(0, CHAO + 3.1 * 0.95 + 0.55, 0);

const chao = new THREE.Mesh(new THREE.CircleGeometry(30, 48), chaoMat);
chao.rotation.x = -Math.PI / 2; chao.position.y = CHAO; cena.add(chao);

// ── cinzas caindo (viram brasas subindo no outro mundo) ──
const QTD = 420;
const cinzaMat = new THREE.MeshBasicMaterial({ color: 0xb5b2ad, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
const cinzas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.045), cinzaMat, QTD);
const queda = Array.from({ length: QTD }, () => ({
  x: (sorte() - 0.5) * 18, y: sorte() * 10 + CHAO, z: (sorte() - 0.5) * 18, vy: 0.12 + sorte() * 0.2,
  rx: sorte() * 6, ry: sorte() * 6, vr: (sorte() - 0.5) * 3, fase: sorte() * 6,
}));
cena.add(cinzas);
const CINZA = new THREE.Color(0xb5b2ad), BRASA = new THREE.Color(0xff5a1e);

// ── a lanterna segue o ponteiro ──
const ponteiro = new THREE.Vector2(0, 0.1);
let px = innerWidth / 2, py = innerHeight * 0.45;
function mirar(x, y) {
  px = x; py = y;
  ponteiro.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  escuro.style.setProperty("--lx", x + "px");
  escuro.style.setProperty("--ly", y + "px");
}
addEventListener("pointermove", (e) => mirar(e.clientX, e.clientY));

// ── saída escondida: 5 cliques na rosa preta ──
const raio = new THREE.Raycaster();
let cliques = 0, susto = 0;
addEventListener("pointerdown", (e) => {
  mirar(e.clientX, e.clientY);
  if (e.target.closest(".radio") || rolagem > 0.3) return;
  raio.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  if (!raio.intersectObject(negra.rosa, true).length) return;
  susto = 1;
  if (++cliques >= 5) {
    try { localStorage.removeItem("tlln"); } catch {}
    document.body.style.transition = "filter .8s"; document.body.style.filter = "brightness(0)";
    setTimeout(() => location.replace("/"), 800);
  }
});

// ── outro mundo: de tempos em tempos tudo enferruja, com a sirene, e depois volta ──
let outro = 0, alvoOutro = 0;
function virar() {
  if (calmo || rolagem > 0.5) return agendar(20);
  alvoOutro = 1;
  raiz.classList.remove("voltando"); raiz.classList.add("outro-mundo");
  som.sirene(10);
  setTimeout(() => {
    alvoOutro = 0;
    raiz.classList.remove("outro-mundo"); raiz.classList.add("voltando");
    agendar(35 + Math.random() * 25);
  }, 11000);
}
function agendar(seg) { setTimeout(virar, seg * 1000); }
agendar(16);

// ── rolagem: a névoa engole o jardim e entrega a árvore ──
let rolagem = 0;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rolar() {
  const max = document.documentElement.scrollHeight - innerHeight;
  rolagem = max > 0 ? scrollY / max : 0;
  nevoaCss.style.opacity = String(suave(0.08, 0.45, rolagem) * (1 - suave(0.62, 0.95, rolagem)));
  canvas.style.opacity = String(1 - suave(0.3, 0.5, rolagem));
  escuro.style.opacity = String(1 - suave(0.1, 0.4, rolagem));
}
addEventListener("scroll", rolar, { passive: true });

function ajustar() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  rolar();
}
addEventListener("resize", ajustar);
ajustar();

const relogio = new THREE.Clock();
const alvo = new THREE.Vector3(), tela = new THREE.Vector3(), cor = new THREE.Color();
function quadro() {
  requestAnimationFrame(quadro);
  const dt = Math.min(relogio.getDelta(), 0.05), t = relogio.elapsedTime, vel = calmo ? 0 : 1;
  if (rolagem > 0.55) { som.estatica(0); return; } // o jardim já sumiu na névoa: não desenha

  outro += (alvoOutro - outro) * Math.min(1, dt * 1.6);

  // câmera: volta lenta e baixa, com o tremor de quem segura a lanterna
  const longe = innerWidth < 700 ? 13 : 10;
  const a = t * 0.045 * vel;
  const tremor = vel * (Math.sin(t * 7.1) * 0.012 + Math.sin(t * 3.3) * 0.02);
  camera.position.set(Math.sin(a) * longe, 1.6 + Math.sin(t * 0.2) * 0.2 * vel + tremor, Math.cos(a) * longe);
  camera.lookAt(0, -0.5 + tremor, 0);

  // a lanterna aponta para o cursor e falha de vez em quando (pilha fraca)
  raio.setFromCamera(ponteiro, camera);
  alvo.copy(raio.ray.direction).multiplyScalar(longe).add(raio.ray.origin);
  lanterna.target.position.lerp(alvo, 0.15);
  const pisca = vel && Math.sin(t * 0.37) > 0.985 ? (Math.random() < 0.5 ? 0.1 : 1) : 1;
  lanterna.intensity = 220 * pisca;
  lanterna.color.set(outro > 0.5 ? 0xff9a7a : 0xfff1d6);

  // mistura as cores com as do outro mundo
  for (const m of todos) m.color.lerpColors(m.userData.cores[0], m.userData.cores[1], outro);
  pretaMiolo.emissive.setRGB(0.5 * outro, 0, 0);
  cor.lerpColors(NEVOA, NEVOA_OUTRO, outro);
  cena.fog.color.copy(cor); cena.background.copy(cor);
  cena.fog.density = 0.12 - outro * 0.03;
  lua.intensity = 0.35 * (1 - outro);
  brasa.intensity = 6 + Math.sin(t * 2.3) * 2 * vel + susto * 40 + outro * 30;
  cinzaMat.color.lerpColors(CINZA, BRASA, outro);

  balancar(t * vel);
  const respira = 1 + Math.sin(t * 0.9) * 0.08 * vel + susto * 0.6 + outro * 0.25;
  for (const p of negra.petalas) p.rotation.x = p.userData.abertura * respira;
  negra.rosa.rotation.y = t * 0.15 * vel + (Math.random() - 0.5) * (susto + outro * 0.15) * 0.4;
  susto *= 0.9;

  const sobe = outro > 0.5 ? -1.6 : 1; // no outro mundo as brasas sobem
  queda.forEach((s, i) => {
    if (vel) {
      s.y -= s.vy * dt * sobe; s.rx += s.vr * dt; s.ry += s.vr * dt * 0.7;
      if (s.y < CHAO) s.y = CHAO + 10; else if (s.y > CHAO + 10) s.y = CHAO;
    }
    m4.position.set(s.x + Math.sin(t * 0.4 + s.fase) * 0.6, s.y, s.z + Math.cos(t * 0.3 + s.fase) * 0.3);
    m4.rotation.set(s.rx, s.ry, 0); m4.scale.setScalar(1);
    m4.updateMatrix();
    cinzas.setMatrixAt(i, m4.matrix);
  });
  cinzas.instanceMatrix.needsUpdate = true;

  // chiado do rádio: quanto mais perto a lanterna chega da rosa preta, mais alto
  tela.copy(florNegra).project(camera);
  const dx = (tela.x * 0.5 + 0.5) * innerWidth - px, dy = (-tela.y * 0.5 + 0.5) * innerHeight - py;
  const perto = Math.max(0, 1 - Math.hypot(dx, dy) / (0.4 * Math.min(innerWidth, innerHeight)));
  som.estatica(Math.max(perto, outro * 0.6) * (1 - suave(0.1, 0.4, rolagem)));

  renderer.render(cena, camera);
}
quadro();
