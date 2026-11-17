// A rosa 3D cromada da home: pétalas geradas por código, dispostas em espiral (ângulo de ouro),
// com caule, folhas e espinhos. Gira devagar, segue o mouse e reage à rolagem.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { criarRosa, geoPetala } from "./rosa-geo.js";

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

const { rosa, petalas } = criarRosa({ petala: cromoRosa, miolo: cromoMiolo, verde: cromoVerde });
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
let caos = 0; // easter egg TLLN: a rosa gira, treme e se despedaça
addEventListener("quebrar", () => { caos = 1; });

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
  for (const p of petalas) p.rotation.x = p.userData.abertura * respira + caos * (Math.random() - 0.3) * 3;
  if (caos) {
    rosa.rotation.y += 0.6; rosa.rotation.z = (Math.random() - 0.5) * 0.8;
    rosa.scale.setScalar(1.15 * (1 + (Math.random() - 0.5) * 0.5));
    cromoRosa.color.setHex(Math.random() < 0.5 ? 0xffffff : 0x111111);
  }

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
