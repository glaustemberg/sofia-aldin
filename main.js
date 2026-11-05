/* Abertura (cap. 0) e passagem (cap. 0b) · Sofia Aldin
   Cena: WebGL desenha linhas (bordas da foto) e revela a foto por ordem de luminância;
   canvas 2D desenha a Sofia em malha triangulada (pontos e arestas); SVG desenha cabos, grade e colunas da passagem.
   Assets gerados da própria image2: linhas.png e ordem.png (desenho.py), malha-sofia*.bin (malha_sofia.py). */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W0 = 1280, H0 = 853, FOCO = 500;
  const $ = (s) => document.querySelector(s);
  const palco = $('.palco'), cena = $('.cena'), bloco = $('.bloco'), foto = $('.cena-foto');
  const glc = $('.cena-gl'), dc = $('.cena-pontos');
  const svgC = $('.tracos-claros'), svgE = $('.tracos-escuros'), svgG = $('.tracos-gancho');
  const cortina = $('.cortina'), nav = $('.nav');
  const NS = 'http://www.w3.org/2000/svg';
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // mesma curva do shader: quanto da foto já apareceu num ponto de ordem k
  const revelado = (k, r) => smooth(k - 0.05, k + 0.05, r);
  const K_SOFIA = 0.12; // momento da Sofia em ordem.png (desenho.py): ela se revela inteira de uma vez

  // estado único da cena; intro e rolagem escrevem em campos separados
  const S = { line: 0, dots: 0, mf: 0, si: 0, reveal: 0, ci: 0, cs: 0, grid: 0, fall: 0, morph: 0, curtain: 0 };
  let M = null, mobile = innerWidth <= 760, dpr = 1, gl = null, glU = {}, ctx = null, pts = [];
  let malha = null, figA = null, figP = null, fx = 0, fy = 0; // arestas e pontos da figura parada (pré-desenhados)
  const NF = 12, faixas = Array.from({ length: NF }, () => []);
  let cabos = [], grade = [], gCabos = null, gGrade = null, linhasPilar = [];
  let ultimo = '';
  const CHAVES = Object.keys(S);

  const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });

  Promise.all([
    carregar('assets/sofia-janela.jpg'), carregar('assets/linhas.png'), carregar('assets/ordem.png'), document.fonts.ready
  ]).then(iniciar).catch(() => { doc.classList.add('sem-gl'); try { layout(); } catch (e) {} pronta(); });

  // avisa a página integrada que a abertura já criou o pin (capítulos iniciam depois)
  function pronta() { document.dispatchEvent(new Event('abertura:pronta')); }

  function iniciar([imFoto, imLinhas, imOrdem]) {
    if (!iniciarGL(imFoto, imLinhas, imOrdem)) doc.classList.add('sem-gl');
    ctx = dc.getContext('2d');
    layout();
    addEventListener('resize', debounce(() => { layout(); ultimo = ''; }, 150));

    if (RM) { estadoFinal(); render(); pronta(); return; } // estado final: a foto, sem malha
    gsap.registerPlugin(ScrollTrigger, SplitText);
    intro();
    rolagem();
    gancho();
    gsap.ticker.add(render);
    pronta();
    // a malha não segura a cena: chega depois e entra com fade
    fetch(mobile ? 'assets/malha-sofia-celular.bin' : 'assets/malha-sofia.bin')
      .then((r) => r.arrayBuffer()).then(lerMalha).catch(() => {});
  }

  function lerMalha(bin) {
    // malha: Uint32 nP, nE · Uint16 xy*20 · Uint16 j-i por aresta · Uint8 alfa ponto, alfa linha, arestas por i
    const [nP, nE] = new Uint32Array(bin, 0, 2), o = 8 + nP * 4 + nE * 2;
    const xy = new Uint16Array(bin, 8, nP * 2), dj = new Uint16Array(bin, 8 + nP * 4, nE);
    const ap = new Uint8Array(bin, o, nP), la = new Uint8Array(bin, o + nP, nP), cnt = new Uint8Array(bin, o + 2 * nP, nP);
    for (let i = 0; i < nP; i++) {
      const ang = Math.random() * Math.PI * 2, dist = 6 + Math.pow(Math.random(), 2) * 44;
      pts.push({ x: xy[i * 2] / 20, y: xy[i * 2 + 1] / 20,
        ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist - 10, px: 0, py: 0 });
      if (ap[i] > 7) faixas[Math.min(NF - 1, (ap[i] * NF) >> 8)].push(pts[i]); // pontos em faixas de alfa
    }
    // arestas em 8 faixas de alfa (alfa = o menor das duas pontas): um traçado por faixa
    malha = Array.from({ length: 8 }, () => []);
    for (let i = 0, e = 0; i < nP; i++) for (let c = 0; c < cnt[i]; c++, e++) {
      const j = i + dj[e], a = Math.min(la[i], la[j]);
      if (a > 6) malha[Math.min(7, a >> 5)].push(i, j);
    }
    for (const p of pts) { p.px = (p.x - M.sx0) * M.s; p.py = (p.y - M.sy0) * M.s; }
    desenharFigura();
    gsap.to(S, { mf: 1, duration: 1.2, ease: 'power2.out' });
  }

  /* ---------- WebGL ---------- */
  function iniciarGL(imFoto, imLinhas, imOrdem) {
    gl = glc.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return false;
    const vs = `attribute vec2 p;uniform vec2 uA,uB;varying vec2 v;
      void main(){v=mix(uA,uB,vec2(p.x*.5+.5,.5-p.y*.5));gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision mediump float;varying vec2 v;
      uniform sampler2D uFoto,uLinhas,uOrdem;uniform float uRev,uLin;
      void main(){
        vec4 o=texture2D(uOrdem,v);float k=o.r;float w=mix(.004,.05,o.g);
        float f=smoothstep(k-w,k+w,uRev);
        float tr=smoothstep(0.,.14,uLin*1.3-(.72*v.y+.28*k));
        vec4 lc=texture2D(uLinhas,v);
        float la=lc.a*tr*(1.-smoothstep(k+w*.5,k+w+.06,uRev));
        vec3 c=mix(vec3(.0667,.0745,.0824),texture2D(uFoto,v).rgb,f);
        gl_FragColor=vec4(mix(c,lc.rgb,la),1.); // cor do traço vem do desenho: marfim na figura, #F3F3F0 na cena
      }`;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    [['uFoto', imFoto], ['uLinhas', imLinhas], ['uOrdem', imOrdem]].forEach(([nome, im], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      const filtro = nome === 'uOrdem' ? gl.NEAREST : gl.LINEAR; // ordem: camadas com borda nítida
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(pr, nome), i);
    });
    ['uA', 'uB', 'uRev', 'uLin'].forEach((u) => glU[u] = gl.getUniformLocation(pr, u));
    return true;
  }

  /* ---------- layout: foto em cover, pontos e SVG no mesmo mapeamento ---------- */
  function layout() {
    mobile = innerWidth <= 760;
    const pr = palco.getBoundingClientRect(), cr = cena.getBoundingClientRect(), br = bloco.getBoundingClientRect();
    const w = cr.width, h = cr.height, L = cr.left - pr.left, T = cr.top - pr.top;
    const s = Math.max(w / W0, h / H0), vw = w / s, vh = h / s;
    const sx0 = Math.min(Math.max(FOCO - vw / 2, 0), W0 - vw), sy0 = Math.max(0, (H0 - vh) * 0.25);
    M = { s, sx0, sy0, L, T, w, h, PW: pr.width, PH: pr.height };
    foto.style.width = W0 * s + 'px';
    foto.style.transform = `translate(${-sx0 * s}px,${-sy0 * s}px)`;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    if (gl) {
      glc.width = Math.round(w * dpr); glc.height = Math.round(h * dpr);
      gl.viewport(0, 0, glc.width, glc.height);
      gl.uniform2f(glU.uA, sx0 / W0, sy0 / H0);
      gl.uniform2f(glU.uB, (sx0 + vw) / W0, (sy0 + vh) / H0);
    }
    dc.width = Math.round(w * dpr); dc.height = Math.round(h * dpr);
    for (const p of pts) { p.px = (p.x - sx0) * s; p.py = (p.y - sy0) * s; }
    if (malha) desenharFigura();
    desenharTracos(pr, br);
  }

  // a figura parada é pré-desenhada uma vez (arestas; pontos): a rolagem só copia as duas imagens
  function desenharFigura() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { if (p.px < x0) x0 = p.px; if (p.px > x1) x1 = p.px; if (p.py < y0) y0 = p.py; if (p.py > y1) y1 = p.py; }
    fx = Math.floor(x0 * dpr) - 2; fy = Math.floor(y0 * dpr) - 2;
    const cw = Math.ceil(x1 * dpr) - fx + 4, ch = Math.ceil(y1 * dpr) - fy + 4;
    const nova = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
    figA = nova(); figP = nova();
    const g = figA.getContext('2d');
    g.strokeStyle = '#EDE4CF'; g.lineWidth = 0.65 * dpr;
    malha.forEach((lista, b) => {
      if (!lista.length) return;
      g.globalAlpha = (b + 0.5) / 8;
      g.beginPath();
      for (let k = 0; k < lista.length; k += 2) {
        const p = pts[lista[k]], q = pts[lista[k + 1]];
        g.moveTo(p.px * dpr - fx, p.py * dpr - fy); g.lineTo(q.px * dpr - fx, q.py * dpr - fy);
      }
      g.stroke();
    });
    pontos(figP.getContext('2d'), 1, 0, -fx, -fy, 1);
  }

  function pontos(g, alfa, off, dx, dy, passo) {
    const sz = Math.max(1, 0.8 * dpr);
    g.fillStyle = '#EDE4CF'; // marfim quente, como as arestas
    faixas.forEach((lista, b) => { // um alfa por faixa: o canvas agrupa os retângulos
      g.globalAlpha = alfa * (b + 0.5) / NF;
      if (g.globalAlpha < 0.03) return;
      for (let i = 0; i < lista.length; i += passo) {
        const p = lista[i];
        g.fillRect((p.px + p.ox * off) * dpr + dx, (p.py + p.oy * off) * dpr + dy, sz, sz);
      }
    });
    g.globalAlpha = 1;
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

    if (gl) {
      gl.uniform1f(glU.uRev, S.reveal); gl.uniform1f(glU.uLin, S.line);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Sofia em malha: na entrada os pontos chegam e as arestas acendem; parada, é uma cópia da figura pronta
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dc.width, dc.height);
    const fa = S.dots * S.mf * (1 - revelado(K_SOFIA, S.reveal));
    if (fa > 0.005 && figP) {
      // em voo vai um terço dos pontos (leve); no pouso entra a camada completa
      const pouso = S.si > 0.999 ? 1 : smooth(0.72, 1, S.si);
      ctx.globalAlpha = fa * smooth(0.4, 1, S.si); ctx.drawImage(figA, fx, fy);
      if (pouso > 0) { ctx.globalAlpha = fa * pouso; ctx.drawImage(figP, fx, fy); }
      if (pouso < 1) pontos(ctx, fa * (1 - pouso), 1 - S.si, 0, 0, 3);
      ctx.globalAlpha = 1;
    }

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
    if (!RM) {
      const lis = document.querySelectorAll('.pilares li');
      lis.forEach((li, i) => {
        const v = clamp01(S.grid * 1.5 - (linhasPilar[i] + 1) * 0.08 - (mobile ? i * 0.06 : 0));
        li.style.opacity = v;
        li.style.transform = `translateY(${(1 - v) * 8}px)`;
      });
    }
    gGrade.style.opacity = 1 - S.fall;
    cortina.style.clipPath = `inset(0 0 ${((1 - S.curtain) * 100).toFixed(2)}% 0)`;
  }

  /* ---------- entrada ---------- */
  function intro() {
    const st = new SplitText('.titulo', { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => st.revert() });
    tl.to(S, { line: 1, duration: 3.4, ease: 'power3.out' }, 0)
      .to(S, { dots: 1, duration: 2.6, ease: 'power2.out' }, 0.5)
      .to(S, { si: 1, duration: 3.2 }, 0.5)
      .to(S, { ci: 1, duration: 2.4 }, 1.1)
      .from(nav, { autoAlpha: 0, duration: 1.4 }, 0.4)
      .from(st.lines, { yPercent: 105, duration: 1.6, stagger: 0.11 }, 0.35)
      .from('.filete', { scaleX: 0, transformOrigin: 'left center', duration: 1.4 }, 1.0)
      .from('.dica-in', { autoAlpha: 0, y: 10, duration: 1.2 }, 1.7);
  }

  /* ---------- rolagem: construção e passagem ---------- */
  function rolagem() {
    gsap.set('.legenda', { autoAlpha: 0, y: 14 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.abertura', pin: palco, start: 'top top', end: () => '+=' + innerHeight * (mobile ? 2.6 : 3.0), scrub: 1.1, anticipatePin: 1, invalidateOnRefresh: true }
    });
    // construção: camadas nítidas (céu e cidade, ponte e fundo, Sofia); passagem em menos de 1 tela
    tl.to('.dica', { autoAlpha: 0, y: -8, duration: 0.5 }, 0)
      .to(S, { reveal: 1, duration: 3.4, ease: 'none' }, 0.2)
      .to(S, { cs: 1, duration: 2, ease: 'power2.inOut' }, 0.8)
      .to('.legenda', { autoAlpha: 1, y: 0, duration: .8, ease: 'expo.out' }, 1.6)
      .to(S, { grid: 1, duration: 1.6, ease: 'power1.inOut' }, 1.8)
      // pausa curta no estado r2-03; os cabos descem e viram a grade sobre o amarelo
      .to(S, { morph: 1, duration: 1.4, ease: 'none' }, 4.0)
      .to(S, { fall: 1, duration: .6, ease: 'power1.in' }, 4.0)
      .to(S, { curtain: 1, duration: 1.3, ease: 'power2.inOut' }, 4.3)
      .to(nav, { color: '#14213D', duration: 0.2 }, 4.35)
      .to({}, { duration: 0.2 }, 5.4);
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

  function estadoFinal() {
    Object.assign(S, { line: 0, dots: 0, si: 1, reveal: 1, ci: 1, cs: 1, grid: 1, fall: 0, morph: 0, curtain: 0 });
  }

  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
