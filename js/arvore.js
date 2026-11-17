// Frutos de luz caindo da árvore (img/arvore.*) no mar de galáxia: brilham, caem devagar
// e, ao tocar a água, abrem anéis e soltam poeira de estrela. Só anima quando a árvore está na tela.
const secao = document.querySelector(".arvore");
const canvas = secao.querySelector(".frutos");
const g = canvas.getContext("2d");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

// a imagem original tem 1376x768; estas zonas estão em coordenadas dela
const IMG = { w: 1376, h: 768 };
const COPA = { x0: 260, x1: 1130, y0: 60, y1: 300 };
const MAR = { y0: 430, y1: 640 };

let esc = 1, ox = 0, oy = 0, dpr = 1;
function ajustar() { // mesma conta do object-fit: cover
  const r = secao.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio, 2);
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  esc = Math.max(r.width / IMG.w, r.height / IMG.h);
  ox = (r.width - IMG.w * esc) / 2; oy = (r.height - IMG.h * esc) / 2;
}
addEventListener("resize", ajustar);
ajustar();
const X = (x) => (ox + x * esc) * dpr, Y = (y) => (oy + y * esc) * dpr;

const frutos = [], aneis = [], poeira = [];
const entre = (a, b) => a + Math.random() * (b - a);
function soltar() {
  const x = entre(COPA.x0, COPA.x1);
  frutos.push({ x, y: entre(COPA.y0, COPA.y1), vy: 0, chao: entre(MAR.y0, MAR.y1), r: entre(5, 9), deriva: entre(-6, 6), fase: Math.random() * 6 });
}

let visivel = false, ultimo = performance.now(), proximo = 0;
new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(secao);

function quadro(agora) {
  requestAnimationFrame(quadro);
  const dt = Math.min((agora - ultimo) / 1000, 0.05); ultimo = agora;
  if (!visivel || calmo) return;
  if ((proximo -= dt) <= 0) { soltar(); proximo = entre(0.6, 1.6); }

  g.clearRect(0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = "lighter";

  for (let i = frutos.length - 1; i >= 0; i--) {
    const f = frutos[i];
    f.vy = Math.min(f.vy + 60 * dt, 140);               // cai devagar, como num sonho
    f.y += f.vy * dt; f.x += Math.sin(agora / 600 + f.fase) * f.deriva * dt;
    const rx = X(f.x), ry = Y(f.y), r = f.r * esc * dpr;
    const brilho = g.createRadialGradient(rx, ry, 0, rx, ry, r * 4);
    brilho.addColorStop(0, "rgba(235,250,255,.95)"); brilho.addColorStop(0.25, "rgba(170,225,240,.55)"); brilho.addColorStop(1, "rgba(120,180,220,0)");
    g.fillStyle = brilho; g.beginPath(); g.arc(rx, ry, r * 4, 0, Math.PI * 2); g.fill();
    if (f.y >= f.chao) {                                  // tocou o mar
      aneis.push({ x: f.x, y: f.chao, t: 0 });
      for (let k = 0; k < 14; k++) poeira.push({ x: f.x, y: f.chao, vx: entre(-30, 30), vy: entre(-70, -20), t: 0, vida: entre(0.8, 1.8) });
      frutos.splice(i, 1);
    }
  }

  for (let i = aneis.length - 1; i >= 0; i--) {
    const a = aneis[i]; a.t += dt;
    const k = a.t / 2.6;
    if (k >= 1) { aneis.splice(i, 1); continue; }
    for (const atraso of [0, 0.25]) {
      const kk = Math.max(0, k - atraso);
      g.strokeStyle = `rgba(190,220,255,${(1 - kk) * 0.6})`; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.ellipse(X(a.x), Y(a.y), (10 + kk * 90) * esc * dpr, (3 + kk * 22) * esc * dpr, 0, 0, Math.PI * 2); g.stroke();
    }
  }

  for (let i = poeira.length - 1; i >= 0; i--) {
    const p = poeira[i]; p.t += dt;
    if (p.t >= p.vida) { poeira.splice(i, 1); continue; }
    p.vy += 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    g.fillStyle = `rgba(220,235,255,${1 - p.t / p.vida})`;
    g.fillRect(X(p.x), Y(p.y), 2 * dpr, 2 * dpr);
  }
  g.globalCompositeOperation = "source-over";
}
requestAnimationFrame(quadro);
