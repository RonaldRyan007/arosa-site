// Interações da home: abertura, cursor, cards 3D, letras embaralhadas, entrada ao rolar.
(() => {
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s) => document.querySelectorAll(s);

  // Abertura: some quando a rosa 3D estiver pronta (ou depois de 2,5 s, o que vier antes).
  const abrir = () => document.body.classList.add("pronto");
  addEventListener("rosa-pronta", abrir, { once: true });
  setTimeout(abrir, 2500);

  // Letras do título entram uma por vez.
  $$(".titulo span").forEach((s, i) => s.style.setProperty("--i", i));

  // Alfabeto: cada letra vira um elemento para animar no hover.
  $$(".alfabeto").forEach((el) => { el.innerHTML = [...el.textContent].map((c) => `<span>${c}</span>`).join(""); });

  // Testador da fonte: só o que a Rosa Brava desenha.
  const teste = document.getElementById("teste");
  teste?.addEventListener("input", () => {
    const limpo = teste.value.toUpperCase().replace(/[^A-Z0-9ÁÀÂÃÉÊÍÓÔÕÚÜÇÑ .,:;!?'"\/+()*#✿-]/g, "");
    if (limpo !== teste.value) teste.value = limpo;
  });
  teste?.addEventListener("focus", () => { if (teste.value === "ESCREVA AQUI") teste.select(); });

  // Easter egg: escrever TLLN no testador quebra o site e leva para o jardim (fica salvo no navegador).
  let quebrou = false;
  teste?.addEventListener("input", () => { if (!quebrou && teste.value.includes("TLLN")) quebrar(); });
  function quebrar() {
    quebrou = true;
    teste.blur();
    try { localStorage.setItem("tlln", "1"); } catch {}
    dispatchEvent(new Event("quebrar"));               // a rosa 3D enlouquece
    document.documentElement.classList.add("quebrando");

    // fatias da tela deslocadas, com cores invertidas, trocando de lugar sem parar
    const camada = document.createElement("div");
    camada.className = "quebra";
    camada.innerHTML = "<i></i>".repeat(14);
    document.body.append(camada);
    const fatias = [...camada.children];
    const sortear = () => fatias.forEach((f) => {
      f.style.top = Math.random() * 100 + "%";
      f.style.height = 2 + Math.random() * 12 + "%";
      f.style.transform = `translateX(${(Math.random() - 0.5) * 30}%)`;
      f.style.backdropFilter = `invert(1) hue-rotate(${Math.random() * 360}deg) contrast(${1 + Math.random() * 3})`;
    });
    const ciclo = setInterval(sortear, 70);

    // os textos viram lixo, letra por letra
    const textos = [];
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (andar.nextNode()) if (andar.currentNode.nodeValue.trim()) textos.push(andar.currentNode);
    const LIXO = "▓▒░█▄▀■□◆◇†‡¥§¤ØTLLN";
    const corromper = setInterval(() => textos.forEach((n) => {
      n.nodeValue = [...n.nodeValue].map((c) => (c !== " " && Math.random() < 0.18 ? LIXO[(Math.random() * LIXO.length) | 0] : c)).join("");
    }), 90);

    setTimeout(() => document.documentElement.classList.add("apagando"), 2200);
    setTimeout(() => { clearInterval(ciclo); clearInterval(corromper); location.replace("/jardim/"); }, 3200);
  }

  // Cursor próprio (só com mouse).
  const cursor = document.querySelector(".cursor");
  if (cursor && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
    addEventListener("pointerover", (e) => cursor.classList.toggle("em-link", !!e.target.closest("a, input, .card")));
    const anel = cursor.querySelector("i");
    (function seguir() {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      anel.style.transform = `translate(${cx - x}px, ${cy - y}px)`;
      requestAnimationFrame(seguir);
    })();
  }

  // Cards inclinam em 3D seguindo o mouse; o brilho holográfico vai junto.
  $$(".card").forEach((card) => {
    if (calmo) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", px * 100 + "%");
      card.style.setProperty("--my", py * 100 + "%");
      card.style.setProperty("--ry", (px - 0.5) * 16 + "deg");
      card.style.setProperty("--rx", (0.5 - py) * 14 + "deg");
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  });

  // Títulos se embaralham antes de aparecer (bem weird-core).
  const SIMBOLOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789✿*#?!";
  function embaralhar(el) {
    const final = el.dataset.final ??= el.textContent;
    if (calmo) { el.textContent = final; return; }
    let quadro = 0;
    const total = 22;
    const passo = () => {
      el.textContent = [...final].map((c, i) =>
        c === " " || i < (quadro / total) * final.length ? c : SIMBOLOS[(Math.random() * SIMBOLOS.length) | 0]).join("");
      if (++quadro <= total) requestAnimationFrame(passo); else el.textContent = final;
    };
    passo();
  }

  // Entrada ao rolar.
  const obs = new IntersectionObserver((itens) => {
    for (const it of itens) {
      if (!it.isIntersecting) continue;
      it.target.classList.add("visto");
      if (it.target.hasAttribute("data-embaralhar")) embaralhar(it.target);
      obs.unobserve(it.target);
    }
  }, { threshold: 0.2 });
  $$(".revelar, [data-embaralhar]").forEach((el) => obs.observe(el));
  $$("[data-embaralhar]").forEach((el) => el.addEventListener("pointerenter", () => embaralhar(el)));
})();
