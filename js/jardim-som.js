// Som do jardim, todo sintetizado (sem arquivos): zumbido grave de fundo, chiado de rádio que sobe
// perto da rosa preta e a sirene da virada para o "outro mundo".
// O navegador só deixa tocar depois de um gesto: o primeiro clique/toque/tecla liga tudo.
const botao = document.querySelector(".radio");
let ctx = null, mestre, chiado, ligado = false, alvoChiado = 0;

function ruido(seg) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function iniciar() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  mestre = ctx.createGain(); mestre.gain.value = 0; mestre.connect(ctx.destination);

  // zumbido: duas senoides graves quase iguais (batimento lento) + vento filtrado
  const zumbido = ctx.createGain(); zumbido.gain.value = 0.07; zumbido.connect(mestre);
  for (const f of [49, 49.6]) { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(zumbido); o.start(); }
  const vento = ctx.createBufferSource(); vento.buffer = ruido(4); vento.loop = true;
  const fv = ctx.createBiquadFilter(); fv.type = "lowpass"; fv.frequency.value = 380;
  const gv = ctx.createGain(); gv.gain.value = 0.05;
  vento.connect(fv).connect(gv).connect(mestre); vento.start();

  // chiado de rádio: ruído numa faixa estreita, volume controlado por estatica()
  const fonte = ctx.createBufferSource(); fonte.buffer = ruido(3); fonte.loop = true;
  const fb = ctx.createBiquadFilter(); fb.type = "bandpass"; fb.frequency.value = 1700; fb.Q.value = 0.7;
  chiado = ctx.createGain(); chiado.gain.value = 0;
  fonte.connect(fb).connect(chiado).connect(mestre); fonte.start();
}

function ligar(sim) {
  if (sim && !ctx) iniciar();
  ligado = sim;
  if (ctx) { ctx.resume(); mestre.gain.setTargetAtTime(sim ? 0.9 : 0, ctx.currentTime, 0.3); }
  botao.setAttribute("aria-pressed", String(sim));
  botao.setAttribute("aria-label", sim ? "Desligar o som" : "Ligar o som");
}

botao.addEventListener("click", (e) => { e.stopPropagation(); ligar(!ligado); });
// primeiro gesto em qualquer lugar liga o som (uma vez só)
const primeiro = (e) => { if (!ctx && !botao.contains(e.target)) ligar(true); }; // no botão, quem decide é o clique
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, primeiro, { once: true, capture: true });

export const som = {
  // 0..1: quão perto a lanterna está da rosa preta. Estala aleatoriamente, como rádio velho.
  estatica(n) {
    if (!ctx || !ligado) return;
    alvoChiado += (n - alvoChiado) * 0.1;
    const estalo = Math.random() < 0.06 ? Math.random() * 0.25 : 0;
    chiado.gain.setTargetAtTime(Math.min(0.5, alvoChiado * 0.32 + estalo * alvoChiado), ctx.currentTime, 0.03);
  },
  // sirene de ataque aéreo: sobe devagar, oscila e desce
  sirene(dur = 9) {
    if (!ctx || !ligado) return;
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 1.5); g.gain.setValueAtTime(0.16, t + dur - 3); g.gain.linearRampToValueAtTime(0, t + dur);
    const filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 1400;
    filtro.connect(g).connect(mestre);
    for (const [tipo, desv] of [["sawtooth", 0], ["square", 4]]) {
      const o = ctx.createOscillator(); o.type = tipo; o.detune.value = desv * 10;
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(560, t + 3.2);
      o.frequency.linearRampToValueAtTime(600, t + dur - 3.5);
      o.frequency.exponentialRampToValueAtTime(70, t + dur);
      o.connect(filtro); o.start(t); o.stop(t + dur + 0.1);
    }
  },
};
