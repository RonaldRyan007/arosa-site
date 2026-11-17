// Geometria da rosa 3D, usada na home (rosa3d.js) e no jardim do easter egg (jardim.js).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Pétala: plano deformado em concha, com a borda de cima virando para fora.
export function geoPetala({ comp = 1, larg = 0.7, concha = 0.35, virada = 0.35 } = {}) {
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

// Rosa inteira: 30 pétalas em espiral (ângulo de ouro), caule com espinhos e duas folhas.
// Devolve o grupo e a lista de pétalas (para animar a abertura).
export function criarRosa({ petala, miolo, verde }) {
  const rosa = new THREE.Group();
  const flor = new THREE.Group();
  rosa.add(flor);

  const N = 30, OURO = 137.508 * Math.PI / 180;
  const petalas = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const geo = geoPetala({ comp: 0.5 + 0.7 * t, larg: 0.55 + 0.85 * t, concha: 0.75 - 0.3 * t, virada: 0.05 + 0.4 * t * t });
    const malha = new THREE.Mesh(geo, t < 0.25 ? miolo : petala);
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

  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.08, -0.6, 0.05), new THREE.Vector3(-0.12, -1.7, -0.05), new THREE.Vector3(0.05, -3.1, 0),
  ]);
  rosa.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 60, 0.07, 12), verde));
  for (let i = 0; i < 6; i++) {
    const t = 0.2 + i * 0.13, ponto = curva.getPoint(t);
    const espinho = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 10), verde);
    const lado = i % 2 ? 1 : -1;
    espinho.position.copy(ponto).add(new THREE.Vector3(0.08 * lado, 0, 0.02));
    espinho.rotation.z = -lado * (Math.PI / 2 - 0.5);
    rosa.add(espinho);
  }
  const geoFolha = geoPetala({ comp: 0.9, larg: 0.5, concha: 0.25, virada: -0.15 });
  [[0.42, 1], [0.66, -1]].forEach(([t, lado]) => {
    const folha = new THREE.Mesh(geoFolha, verde);
    folha.position.copy(curva.getPoint(t));
    folha.rotation.set(0.3, lado > 0 ? 0.4 : Math.PI - 0.4, -lado * 1.05);
    rosa.add(folha);
  });
  return { rosa, petalas };
}

// Junta as malhas do grupo numa geometria por material (para desenhar muitas rosas com InstancedMesh).
export function fundirPorMaterial(grupo) {
  grupo.updateMatrixWorld(true);
  const baldes = new Map();
  grupo.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    (baldes.get(m.material) ?? baldes.set(m.material, []).get(m.material)).push(g);
  });
  return new Map([...baldes].map(([mat, gs]) => [mat, mergeGeometries(gs)]));
}
