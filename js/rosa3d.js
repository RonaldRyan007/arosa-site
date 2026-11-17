// A rosa 3D cromada da home: pétalas geradas por código, dispostas em espiral (ângulo de ouro),
// com caule, folhas e espinhos. Gira devagar, segue o mouse e reage à rolagem.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("rosa3d");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch {
  dispatchEvent(new Event("rosa-pronta")); // sem WebGL: a página funciona sem a rosa
  throw new Error("WebGL indisponível");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const cena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0.4, 9);

// Luzes coloridas para tingir os reflexos do cromo com a paleta da ROSA.
const luzRosa = new THREE.PointLight(0xff2e88, 60, 30); luzRosa.position.set(-4, 2, 4); cena.add(luzRosa);
const luzVerde = new THREE.PointLight(0xc6ff3d, 40, 30); luzVerde.position.set(4, -2, 3); cena.add(luzVerde);
cena.add(new THREE.AmbientLight(0xffffff, 0.15));

// ── materiais ──
const cromoRosa = new THREE.MeshPhysicalMaterial({
  color: 0xff2e88, metalness: 0.55, roughness: 0.22, iridescence: 0.55, iridescenceIOR: 1.4,
  iridescenceThicknessRange: [180, 620], clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide,
});
const cromoMiolo = cromoRosa.clone(); cromoMiolo.color = new THREE.Color(0xa80d52);
const cromoVerde = new THREE.MeshPhysicalMaterial({
  color: 0xb8f53a, metalness: 0.9, roughness: 0.22, iridescence: 0.6, clearcoat: 1, side: THREE.DoubleSide,
});

// ── pétala: plano deformado em concha, com a borda de cima virando para fora ──
function geoPetala({ comp = 1, larg = 0.7, concha = 0.35, virada = 0.35 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, 22, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2;          // -1..1 (largura)
    const v = p.getY(i) + 0.5;        // 0..1 (da base para a ponta)
    const perfil = Math.pow(Math.sin(Math.PI * (0.06 + 0.86 * v)), 0.65) * (0.45 + 0.55 * v);
    const x = u * larg * 0.5 * perfil;
    const y = v * comp;
    let z = -concha * u * u * perfil * 0.6;          // bordas curvam para o centro da flor
    z += virada * Math.pow(v, 3) * comp;              // ponta vira para fora
    z += 0.08 * Math.pow(Math.abs(u), 4) * v * v;     // borda enrola levemente
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

const rosa = new THREE.Group();
const flor = new THREE.Group();
rosa.add(flor);

const N = 30, OURO = 137.508 * Math.PI / 180;
const petalas = [];
for (let i = 0; i < N; i++) {
  const t = i / (N - 1);
  const geo = geoPetala({ comp: 0.5 + 0.7 * t, larg: 0.55 + 0.85 * t, concha: 0.75 - 0.3 * t, virada: 0.05 + 0.4 * t * t });
  const malha = new THREE.Mesh(geo, t < 0.25 ? cromoMiolo : cromoRosa);
  const giro = new THREE.Group();
  giro.rotation.y = i * OURO;
  malha.position.z = 0.03 + 0.26 * t;           // pétalas de fora mais afastadas do centro
  malha.position.y = -0.3 * t;
  malha.userData.abertura = 0.02 + 0.95 * Math.pow(t, 2.2); // miolo fechado como botão, fora mais aberto
  malha.rotation.x = malha.userData.abertura;
  giro.add(malha);
  flor.add(giro);
  petalas.push(malha);
}
flor.position.y = 0.55;

// ── caule com espinhos e duas folhas ──
const curva = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.08, -0.6, 0.05), new THREE.Vector3(-0.12, -1.7, -0.05), new THREE.Vector3(0.05, -3.1, 0),
]);
rosa.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 60, 0.07, 12), cromoVerde));
for (let i = 0; i < 6; i++) {
  const t = 0.2 + i * 0.13, ponto = curva.getPoint(t);
  const espinho = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 10), cromoVerde);
  const lado = i % 2 ? 1 : -1;
  espinho.position.copy(ponto).add(new THREE.Vector3(0.08 * lado, 0, 0.02));
  espinho.rotation.z = -lado * (Math.PI / 2 - 0.5);
  rosa.add(espinho);
}
const geoFolha = geoPetala({ comp: 0.9, larg: 0.5, concha: 0.25, virada: -0.15 });
[[0.42, 1], [0.66, -1]].forEach(([t, lado]) => {
  const folha = new THREE.Mesh(geoFolha, cromoVerde);
  folha.position.copy(curva.getPoint(t));
  folha.rotation.set(0.3, lado > 0 ? 0.4 : Math.PI - 0.4, -lado * 1.05);
  rosa.add(folha);
});
rosa.scale.setScalar(1.15);
cena.add(rosa);

// ── pétalas soltas caindo ao redor ──
const QTD = 36;
const soltas = new THREE.InstancedMesh(geoPetala({ comp: 0.35, larg: 0.3, concha: 0.3, virada: 0.2 }), cromoRosa, QTD);
const estado = Array.from({ length: QTD }, () => ({
  x: (Math.random() - 0.5) * 12, y: Math.random() * 10 - 5, z: (Math.random() - 0.5) * 6 - 1,
  vy: 0.15 + Math.random() * 0.25, rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 1.5, fase: Math.random() * 6,
}));
cena.add(soltas);
const m4 = new THREE.Object3D();

// ── interação ──
let mx = 0, my = 0, rolagem = 0;
addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
addEventListener("scroll", () => { rolagem = scrollY / innerHeight; }, { passive: true });

function ajustar() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.z = w < 700 ? 16 : 9;     // no celular, afasta: a rosa fica atrás do título
  camera.updateProjectionMatrix();
}
addEventListener("resize", ajustar);
ajustar();

const relogio = new THREE.Clock();
let visivel = true;
document.addEventListener("visibilitychange", () => { visivel = !document.hidden; });

function quadro() {
  requestAnimationFrame(quadro);
  if (!visivel) return;
  const t = relogio.getElapsedTime();
  const vel = calmo ? 0 : 1;

  // gira devagar, inclina para o mouse e "respira" (abre e fecha um pouco)
  rosa.rotation.y += (t * 0.25 * vel + mx * 0.9 - rosa.rotation.y) * 0.05;
  rosa.rotation.x += (my * 0.35 + 0.38 - rosa.rotation.x) * 0.05; // levemente de cima: dá para ver a espiral
  const respira = 1 + Math.sin(t * 1.3) * 0.06 * vel;
  for (const p of petalas) p.rotation.x = p.userData.abertura * respira;

  // ao rolar, a rosa sobe, encolhe e vai para o lado
  const r = Math.min(rolagem, 2);
  rosa.position.set(r * 3.4, 0.5 + r * 1.2, -r * 3);
  canvas.style.opacity = String(Math.max(0.18, (innerWidth < 700 ? 0.6 : 1) - r * 0.6));

  estado.forEach((s, i) => {
    if (vel) {
      s.y -= s.vy * 0.016 * 2; s.rx += s.vr * 0.016; s.ry += s.vr * 0.012;
      if (s.y < -6) s.y = 6;
    }
    m4.position.set(s.x + Math.sin(t * 0.6 + s.fase) * 0.4, s.y, s.z);
    m4.rotation.set(s.rx, s.ry, 0);
    m4.updateMatrix();
    soltas.setMatrixAt(i, m4.matrix);
  });
  soltas.instanceMatrix.needsUpdate = true;

  renderer.render(cena, camera);
}
quadro();
dispatchEvent(new Event("rosa-pronta"));
