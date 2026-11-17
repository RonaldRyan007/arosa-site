// Jardim do easter egg TLLN: rosas brancas em volta, uma rosa preta no meio, névoa e pétalas caindo.
// Saída escondida: clicar 5 vezes na rosa preta desfaz e devolve a home.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { criarRosa, fundirPorMaterial, geoPetala } from "./rosa-geo.js";

const canvas = document.getElementById("jardim");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x050505);
cena.fog = new THREE.FogExp2(0x050505, 0.075);
cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
cena.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

// luar frio de cima e uma luz vermelha baixa só na rosa preta
const lua = new THREE.DirectionalLight(0xcfd8ff, 1.6); lua.position.set(-3, 8, 4); cena.add(lua);
cena.add(new THREE.AmbientLight(0xffffff, 0.08));
const brasa = new THREE.PointLight(0xff1030, 14, 6); brasa.position.set(0, 0.9, 1.3); cena.add(brasa);

// ── materiais ──
const branca = new THREE.MeshPhysicalMaterial({ color: 0xf3efeb, roughness: 0.5, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4, side: THREE.DoubleSide });
const brancaMiolo = branca.clone(); brancaMiolo.color = new THREE.Color(0xd9cfc6);
const caule = new THREE.MeshStandardMaterial({ color: 0x1d2a1c, roughness: 0.6, side: THREE.DoubleSide });
const preta = new THREE.MeshPhysicalMaterial({
  color: 0x030303, metalness: 0.1, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.1,
  iridescence: 0.25, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 700], side: THREE.DoubleSide,
});
const pretaMiolo = preta.clone(); pretaMiolo.color = new THREE.Color(0x2a0006);
const cauleEscuro = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.4, side: THREE.DoubleSide });

const CHAO = -3.1;

// ── as rosas brancas: uma rosa fundida por material e repetida com InstancedMesh ──
const modelo = criarRosa({ petala: branca, miolo: brancaMiolo, verde: caule });
const partes = fundirPorMaterial(modelo.rosa);
const lugares = [];
let semente = 7;
const sorte = () => ((semente = (semente * 16807) % 2147483647) / 2147483647); // mesmo jardim sempre
for (let anel = 0; anel < 5; anel++) { // até r≈6.5: a câmera gira por fora, numa clareira
  const raio = 1.5 + anel * 1.2, qtd = 10 + anel * 8;
  for (let i = 0; i < qtd; i++) {
    const a = (i / qtd) * Math.PI * 2 + sorte() * 0.5 + anel;
    const r = raio + (sorte() - 0.5) * 0.7, s = 0.42 + sorte() * 0.2;
    lugares.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s, giro: sorte() * 6.28, inclina: (sorte() - 0.5) * 0.35, fase: sorte() * 6.28 });
  }
}
const brancas = [...partes].map(([mat, geo]) => {
  const im = new THREE.InstancedMesh(geo, mat, lugares.length);
  cena.add(im);
  return im;
});
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

// ── a rosa preta no centro (inteira, para "respirar" e reagir ao clique) ──
const negra = criarRosa({ petala: preta, miolo: pretaMiolo, verde: cauleEscuro });
negra.rosa.scale.setScalar(0.95);   // mais alta que o canteiro: a flor preta fica acima das brancas
negra.rosa.position.y = CHAO + 3.1 * 0.95;
cena.add(negra.rosa);

// chão: um disco escuro que some na névoa
const chao = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 }));
chao.rotation.x = -Math.PI / 2; chao.position.y = CHAO; cena.add(chao);

// pétalas brancas caindo
const QTD = 60;
const soltas = new THREE.InstancedMesh(geoPetala({ comp: 0.3, larg: 0.26, concha: 0.3, virada: 0.2 }), branca, QTD);
const queda = Array.from({ length: QTD }, () => ({
  x: (sorte() - 0.5) * 16, y: sorte() * 9 - 3, z: (sorte() - 0.5) * 16, vy: 0.2 + sorte() * 0.3,
  rx: sorte() * 6, ry: sorte() * 6, vr: (sorte() - 0.5) * 1.6, fase: sorte() * 6,
}));
cena.add(soltas);

// ── saída escondida: 5 cliques na rosa preta ──
const raio = new THREE.Raycaster(), ponteiro = new THREE.Vector2();
let cliques = 0, susto = 0;
canvas.addEventListener("pointerdown", (e) => {
  ponteiro.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  if (!raio.intersectObject(negra.rosa, true).length) return;
  susto = 1;
  if (++cliques >= 5) {
    try { localStorage.removeItem("tlln"); } catch {}
    document.body.style.transition = "filter .8s"; document.body.style.filter = "brightness(0)";
    setTimeout(() => location.replace("/"), 800);
  }
});

let mx = 0;
addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; });

function ajustar() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", ajustar);
ajustar();

const relogio = new THREE.Clock();
function quadro() {
  requestAnimationFrame(quadro);
  const dt = Math.min(relogio.getDelta(), 0.05), t = relogio.elapsedTime, vel = calmo ? 0 : 1;

  // câmera dando a volta devagar, baixa, olhando a rosa preta
  const longe = innerWidth < 700 ? 13 : 10;
  const a = t * 0.06 * vel + mx * 0.4;
  camera.position.set(Math.sin(a) * longe, 1.6 + Math.sin(t * 0.2) * 0.25 * vel, Math.cos(a) * longe);
  camera.lookAt(0, -0.5, 0);

  balancar(t * vel);
  const respira = 1 + Math.sin(t * 0.9) * 0.08 * vel + susto * 0.6;
  for (const p of negra.petalas) p.rotation.x = p.userData.abertura * respira;
  negra.rosa.rotation.y = t * 0.15 * vel + (Math.random() - 0.5) * susto * 0.4;
  brasa.intensity = 14 + Math.sin(t * 2.3) * 3 * vel + susto * 40;
  susto *= 0.9;

  queda.forEach((s, i) => {
    if (vel) { s.y -= s.vy * dt; s.rx += s.vr * dt; s.ry += s.vr * dt * 0.7; if (s.y < CHAO) s.y = 6; }
    m4.position.set(s.x + Math.sin(t * 0.5 + s.fase) * 0.5, s.y, s.z);
    m4.rotation.set(s.rx, s.ry, 0); m4.scale.setScalar(1);
    m4.updateMatrix();
    soltas.setMatrixAt(i, m4.matrix);
  });
  soltas.instanceMatrix.needsUpdate = true;

  renderer.render(cena, camera);
}
quadro();
