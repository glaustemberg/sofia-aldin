/* Abertura (cap. 0) e passagem (cap. 0b) · Sofia Aldin
   Cena: o projeto e a obra. Um desenho em linha (SVG, ferramentas/desenho_svg.py) traça janela, cidade e ponte estaiada
   com a rolagem; depois a foto real entra inteira, em cor, numa moldura com filete laranja que se abre a partir do
   mastro da ponte. A foto cresce com o mastro fixo, então a ponte da foto pousa exatamente sobre a ponte desenhada.
   A foto nunca é recortada nem mascarada: só escala uniforme, e o rosto fica dentro da cena em todos os quadros.
   SVG à parte desenha os cabos laranja, a grade e a passagem. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  // movimento reduzido: a construção guiada pela rolagem fica (o visitante controla); a entrada automática fica curta
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W0 = 1280, H0 = 853, FOCO = 500;
  const MASTRO = [664, 240]; // ponto fixo da abertura da moldura (coordenadas da foto)
  const K0 = 0.14; // tamanho da moldura quando a obra começa a abrir
  const $ = (s) => document.querySelector(s);
  const palco = $('.palco'), cena = $('.cena'), bloco = $('.bloco'), foto = $('.cena-foto');
  const desenho = $('.cena-desenho'), moldura = $('.cena-moldura');
  const svgC = $('.tracos-claros'), svgE = $('.tracos-escuros'), svgG = $('.tracos-gancho');
  const cortina = $('.cortina'), nav = $('.nav');
  const NS = 'http://www.w3.org/2000/svg';
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // estado único da cena; intro e rolagem escrevem em campos separados
  const S = { line: 0, draw: 0, obra: 0, ci: 0, cs: 0, grid: 0, fall: 0, morph: 0, curtain: 0 };
  let M = null, mobile = innerWidth <= 760;
  let cabos = [], grade = [], gCabos = null, gGrade = null, linhasPilar = [];
  let ultimo = '';
  const CHAVES = Object.keys(S);
  const tracos = [...desenho.querySelectorAll('path')].map((e) => ({ e, i: e.dataset.f === 'i', k: +e.dataset.k, v: -1 }));

  // fontes lentas não seguram a cena: no máximo 2,5 s
  const fontes = Promise.race([document.fonts ? document.fonts.ready : null, new Promise((ok) => setTimeout(ok, 2500))]);
  const fotoPronta = foto.complete ? Promise.resolve() : new Promise((ok) => { foto.onload = ok; foto.onerror = ok; });
  Promise.all([fotoPronta, fontes]).then(iniciar).catch((e) => {
    console.error('[sofia] abertura:', e);
    doc.classList.add('sem-cena'); try { layout(); } catch (e2) {} pronta();
  });

  // avisa a página integrada que a abertura já criou o pin (capítulos iniciam depois)
  function pronta() { document.dispatchEvent(new Event('abertura:pronta')); }

  function iniciar() {
    layout();
    addEventListener('resize', debounce(() => { layout(); ultimo = ''; }, 150));
    gsap.registerPlugin(ScrollTrigger, SplitText);
    if (RM) introCalma(); else intro();
    rolagem();
    gancho();
    gsap.ticker.add(render);
    pronta();
  }

  /* ---------- layout: foto em cover, desenho e SVG no mesmo mapeamento ---------- */
  function layout() {
    mobile = innerWidth <= 760;
    const pr = palco.getBoundingClientRect(), cr = cena.getBoundingClientRect(), br = bloco.getBoundingClientRect();
    const w = cr.width, h = cr.height, L = cr.left - pr.left, T = cr.top - pr.top;
    const s = Math.max(w / W0, h / H0), vw = w / s, vh = h / s;
    const sx0 = Math.min(Math.max(FOCO - vw / 2, 0), W0 - vw), sy0 = Math.max(0, (H0 - vh) * 0.25);
    M = { s, sx0, sy0, L, T, w, h, PW: pr.width, PH: pr.height,
      px: (MASTRO[0] - sx0) * s, py: (MASTRO[1] - sy0) * s };
    foto.style.width = W0 * s + 'px';
    desenho.style.width = W0 * s + 'px'; desenho.style.height = H0 * s + 'px';
    desenho.style.transform = `translate(${-sx0 * s}px,${-sy0 * s}px)`;
    desenharTracos(pr, br);
  }

  function el(tag, attrs, pai) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    pai && pai.appendChild(e);
    return e;
  }

  function desenharTracos(pr, br) {
    const { s, sx0, sy0, L, T, PW, PH } = M;
    const P = (x, y) => [L + (x - sx0) * s, T + (y - sy0) * s];
    [svgC, svgE, svgG].filter(Boolean).forEach((v) => { v.innerHTML = ''; v.setAttribute('viewBox', `0 0 ${PW} ${PH}`); });
    const tit = $('.titulo').getBoundingClientRect();
    const gx = Math.round(tit.left - pr.left - (mobile ? 0 : 28)) + 0.5;
    const gy = br.top - pr.top;

    // cabos da ponte: segmento real sobre a foto (A até o tabuleiro D), depois a extensão até a grade
    gCabos = el('g', {}, svgC);
    cabos = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const A = P(676, 160 + (N - 1 - i) * 10), D = P(705 + i * 20, 386);
      const dx = D[0] - A[0], dy = D[1] - A[1];
      let t = mobile ? (gy - A[1]) / dy : (gx - A[0]) / dx;
      const tMax = (PH - A[1]) / dy;
      if (!(t > 1) || t > tMax) t = tMax;
      const E = [A[0] + dx * t, A[1] + dy * t];
      const seg = 1 / t;
      // passagem: cada cabo desce e vira uma vertical da grade (abaixo da faixa do menu)
      const xv = Math.round(mobile ? PW * (1 + (i % 4)) / 5 : PW * (i + 2) / 12) + 0.5;
      const alvo = [[xv, M.T], [xv, (M.T + PH) / 2], [xv, PH]];
      const path = el('path', { d: `M${A}L${D}L${E}`, pathLength: 1, 'stroke-width': 1, 'stroke-opacity': 0.82, 'stroke-dasharray': '0 2' }, gCabos);
      const pathE = el('path', { d: `M${A}L${D}L${E}`, 'stroke-width': 1, 'stroke-opacity': 0.55 }, svgE);
      cabos.push({ path, pathE, seg, pts: [A, D, E], alvo });
    }
    gGrade = el('g', {}, svgC);

    // grade do bloco: vertical na margem do título e linhas das fileiras dos pilares
    grade = [];
    const lis = [...document.querySelectorAll('.pilares li')];
    if (!mobile) {
      grade.push({ e: el('line', { x1: gx, y1: M.T, x2: gx, y2: PH, pathLength: 1 }, gGrade), op: 0.22 });
    } else {
      grade.push({ e: el('line', { x1: 0, y1: gy, x2: PW, y2: gy, pathLength: 1 }, gGrade), op: 0.3 });
    }
    const topos = [...new Set(lis.map((li) => Math.round(li.getBoundingClientRect().top - pr.top)))];
    const ultimoLi = lis[lis.length - 1].getBoundingClientRect();
    const fim = Math.round(ultimoLi.bottom - pr.top);
    linhasPilar = lis.map((li) => topos.indexOf(Math.round(li.getBoundingClientRect().top - pr.top)));
    const x1 = mobile ? 20 : gx, x2 = mobile ? PW - 20 : PW;
    [...topos, fim].forEach((y) => grade.push({ e: el('line', { x1, y1: y + 0.5, x2, y2: y + 0.5, pathLength: 1 }, gGrade), op: 0.2 }));
    grade.forEach((g) => { g.e.setAttribute('stroke-opacity', g.op); g.e.setAttribute('stroke-dasharray', '0 2'); });

  }

  /* ---------- render ---------- */
  function render() {
    const chave = CHAVES.map((k) => S[k].toFixed(4)).join();
    if (chave === ultimo || !M) return;
    ultimo = chave;

    // desenho: cada traço se estende na sua vez (data-k); entrada automática (i) e rolagem (r)
    for (const t of tracos) {
      const v = clamp01(((t.i ? S.line : S.draw) * 1.25 - t.k) / 0.25);
      if (v === t.v) continue;
      t.v = v; t.e.style.strokeDashoffset = (1 - v).toFixed(4);
    }

    // obra: a foto inteira cresce com o mastro fixo e pousa sobre o desenho; a moldura acompanha a borda
    const { s, sx0, sy0, px, py, w, h } = M;
    const k = K0 + (1 - K0) * smooth(0, 1, S.obra);
    const tx = px - (sx0 * s + px) * k, ty = py - (sy0 * s + py) * k;
    foto.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${k.toFixed(5)})`;
    foto.style.opacity = smooth(0, 0.06, S.obra).toFixed(3);
    const x0 = Math.max(0, tx), y0 = Math.max(0, ty);
    const x1 = Math.min(w, tx + W0 * s * k), y1 = Math.min(h, ty + H0 * s * k);
    moldura.style.transform = `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px)`;
    moldura.style.width = (x1 - x0).toFixed(1) + 'px'; moldura.style.height = (y1 - y0).toFixed(1) + 'px';
    moldura.style.opacity = (smooth(0, 0.06, S.obra) * (1 - smooth(0.86, 1, S.obra))).toFixed(3);

    // cabos
    const c = 0.5 * S.ci + 0.5 * S.cs;
    const m = S.morph * S.morph * (3 - 2 * S.morph);
    for (const k of cabos) {
      const vis = c <= 0.5 ? (c / 0.5) * k.seg : k.seg + ((c - 0.5) / 0.5) * (1 - k.seg);
      k.path.setAttribute('stroke-dasharray', `${Math.max(vis, m > 0 ? 1 : 0).toFixed(4)} 2`);
      const d = 'M' + k.pts.map((p, j) => [p[0] + (k.alvo[j][0] - p[0]) * m, p[1] + (k.alvo[j][1] - p[1]) * m].map((v) => v.toFixed(1)).join(',')).join('L');
      k.path.setAttribute('d', d);
      k.pathE.setAttribute('d', d);
      k.path.setAttribute('stroke-opacity', (0.82 - 0.32 * m).toFixed(3));
    }
    grade.forEach((g, i) => g.e.setAttribute('stroke-dasharray', `${clamp01(S.grid * 1.5 - i * 0.08).toFixed(4)} 2`));
    const lis = document.querySelectorAll('.pilares li');
    lis.forEach((li, i) => {
      const v = clamp01(S.grid * 1.5 - (linhasPilar[i] + 1) * 0.08 - (mobile ? i * 0.06 : 0));
      li.style.opacity = v;
      li.style.transform = RM ? '' : `translateY(${(1 - v) * 8}px)`;
    });
    gGrade.style.opacity = 1 - S.fall;
    cortina.style.clipPath = `inset(0 0 ${((1 - S.curtain) * 100).toFixed(2)}% 0)`;
  }

  /* ---------- entrada ---------- */
  function intro() {
    const st = new SplitText('.titulo', { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => st.revert() });
    tl.to(S, { line: 1, duration: 3.0, ease: 'power3.out' }, 0.2)
      .to(S, { ci: 1, duration: 2.4 }, 1.1)
      .from(nav, { autoAlpha: 0, duration: 1.4 }, 0.4)
      .from(st.lines, { yPercent: 105, duration: 1.6, stagger: 0.11 }, 0.35)
      .from('.filete', { scaleX: 0, transformOrigin: 'left center', duration: 1.4 }, 1.0)
      .from('.dica-in', { autoAlpha: 0, y: 10, duration: 1.2 }, 1.7);
  }

  /* ---------- rolagem: projeto, obra e passagem ---------- */
  function rolagem() {
    gsap.set(['.legenda', '.cena-leg'], { autoAlpha: 0, y: 14 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.abertura', pin: palco, start: 'top top', end: () => '+=' + innerHeight * (mobile ? 3.0 : 3.4), scrub: 1.1, anticipatePin: 1, invalidateOnRefresh: true }
    });
    // 1. o projeto se traça (cidade, ponte antiga, estaiada, viadutos); 2. a obra abre a partir do mastro; 3. passagem
    tl.to('.dica', { autoAlpha: 0, y: -8, duration: 0.5 }, 0)
      .to(S, { draw: 1, duration: 1.9 }, 0.1)
      .to(S, { cs: 1, duration: 2, ease: 'power2.inOut' }, 0.6)
      .to('.legenda', { autoAlpha: 1, y: 0, duration: .8, ease: 'expo.out' }, 1.4)
      .to(S, { obra: 1, duration: 1.7 }, 1.8)
      .to('.cena-leg', { autoAlpha: 1, y: 0, duration: .8, ease: 'expo.out' }, 3.0)
      .to('.cena-leg', { autoAlpha: 0, duration: .4 }, 4.5)
      .to(S, { grid: 1, duration: 1.6, ease: 'power1.inOut' }, 1.8)
      // pausa com a foto inteira; a obra volta para dentro da moldura (inteira, sem corte) antes de qualquer
      // traço ou papel passar por ela; depois os cabos descem, viram a grade, e o papel da prancha sobe
      .to(S, { obra: 0, duration: .5, ease: 'power1.in' }, 4.6)
      .to(S, { morph: 1, duration: 1.3, ease: 'none' }, 5.0)
      .to(S, { fall: 1, duration: .6, ease: 'power1.in' }, 5.0)
      .to(S, { curtain: 1, duration: 1.2, ease: 'power2.inOut' }, 5.2)
      .to(nav, { color: '#0F2433', duration: 0.2 }, 5.25)
      .from('.carimbo', { yPercent: 40, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, 5.7)
      .to({}, { duration: 0.3 }, 6.4);
  }

  function gancho() {
    if (!$('.gancho')) return; // página integrada: a passagem desemboca direto no capítulo 1
    const gatilho = { trigger: '.gancho', start: 'top 62%', toggleActions: 'play none none reverse' };
    gsap.from('.rotulo', { autoAlpha: 0, y: 12, duration: 1.2, ease: 'expo.out', scrollTrigger: gatilho });
    SplitText.create('.frase', {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.6, stagger: 0.14, delay: 0.15, ease: 'expo.out', scrollTrigger: { ...gatilho } })
    });
  }

  // movimento reduzido: a entrada chega em 0,8 s por fade, sem texto subindo
  function introCalma() {
    gsap.timeline({ defaults: { duration: 0.8, ease: 'power1.out' } })
      .to(S, { line: 1, ci: 1 }, 0)
      .from([nav, '.titulo', '.filete', '.dica-in'], { autoAlpha: 0 }, 0);
  }

  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
