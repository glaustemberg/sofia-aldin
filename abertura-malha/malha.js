/* Abertura opção 3 (v11) · roteiro em 9 batidas num pin único (REFERENCIAS-MOTION-V11.md):
   1 título em pontos · 2 os pontos traçam as caixas na grade de 12 colunas · 3 as fotos se preenchem por células
   · 4 a grade se reorganiza e a janela cresce · 5 plano azul-marinho, bloco por linha, fotos ganham cor
   · 6 prova: troféu, coletiva, manchete e contadores · 7 faixa dos cases · 8 match cut do sofá para o amarelo
   · 9 saída para o capítulo 1.
   Tudo deriva de um único progresso P (0 a 1) ligado à rolagem. Caixas, textos e planos são lidos do HTML por data-k;
   o roteiro de cada um é uma lista de quadros-chave [P, [x, y, w, h], opacidade] calculada na grade (função roteiro).
   Para mais fotos ou batidas: um elemento novo com data-k e uma linha no roteiro.
   Expõe window.initAberturaMalha(root) -> gsap.context; marca root._am3tl quando o pin existe.
   Sem WebGL: os mesmos pontos em canvas 2D. Movimento reduzido: a rolagem constrói tudo; somem mouse e automáticos. */
(function () {
  'use strict';

  var BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^\/]*$/, '');

  // ---------- shader: posições em px de tela (y para baixo), um único Points ----------
  var VERT = [
    'attribute vec2 aFrame; attribute vec4 aInfo;', // cor no texto, livre, atraso, semente
    'uniform float uTime, uVoo, uFade, uSize, uAmp, uBreath;',
    'uniform vec2 uMouse; uniform float uMouseK, uRad, uPush;',
    'uniform vec3 uMarfim, uAmarelo;',
    'varying float vA; varying vec3 vC;',
    'float h(float n){ return fract(sin(n) * 43758.5453); }',
    'void main(){',
    '  float cT = aInfo.x, dl = aInfo.z, sd = aInfo.w;',
    '  vec2 tx = position.xy + vec2(sin(uTime * 0.9 + sd * 40.0), cos(uTime * 0.8 + sd * 33.0)) * uBreath;',
    '  float t = clamp(uVoo * 1.4 - dl, 0.0, 1.0); float e = 1.0 - pow(2.0, -10.0 * t);', // expo.out por ponto
    '  vec2 dv = aFrame - tx; vec2 nv = vec2(-dv.y, dv.x);',
    '  vec2 c1 = (tx + aFrame) * 0.5 + nv * (h(sd * 3.1) - 0.5) * 0.5 - vec2(0.0, uAmp * h(sd * 5.7));',
    '  vec2 p = mix(mix(tx, c1, e), mix(c1, aFrame, e), e);',
    '  vec2 dm = p - uMouse; float r = length(dm);',
    '  float fm = uMouseK * (1.0 - smoothstep(0.0, uRad, r)) * (1.0 - e);',
    '  float lado = h(sd * 13.0) * 6.2832;',
    '  p += (dm / (r + 1e-4) * 0.75 + vec2(cos(lado), sin(lado)) * 0.45) * fm * uPush * (0.5 + h(sd * 11.0));',
    '  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0.0, 1.0);',
    '  gl_PointSize = uSize * (1.0 + 0.4 * fm) * (1.0 - 0.3 * e);',
    '  vA = (0.84 + 0.16 * h(sd * 21.0)) * uFade * (1.0 - smoothstep(0.96, 1.0, t));', // dá lugar à borda real ao pousar
    '  vC = mix(uMarfim, uAmarelo, cT * (1.0 - e));',
    '}'
  ].join('\n');
  var FRAG = [
    'varying float vA; varying vec3 vC;',
    'void main(){ vec2 c = gl_PointCoord - 0.5; float a = vA * (1.0 - smoothstep(0.4, 0.5, length(c)));',
    '  if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }'
  ].join('\n');

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function hash(n) { var s = Math.sin(n) * 43758.5453; return s - Math.floor(s); }

  // tinta do título renderizado em canvas, na posição exata do HTML; o ponto final (.am3-pc) sai marcado em amarelo
  function tintaDoTitulo(el, palco) {
    var pr = palco.getBoundingClientRect(), r = el.getBoundingClientRect();
    var fs = parseFloat(getComputedStyle(el).fontSize);
    var x0 = Math.floor(r.left) - 2, y0 = Math.floor(r.top) - 2;
    var W = Math.ceil(r.width + fs), H = Math.ceil(r.height + fs * 0.4);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d', { willReadFrequently: true }), st = getComputedStyle(el);
    g.textBaseline = 'alphabetic';
    g.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
    if ('letterSpacing' in g) g.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), no, re = /\S+/g, m;
    while ((no = walker.nextNode())) {
      g.fillStyle = (no.parentNode.classList && no.parentNode.classList.contains('am3-pc')) ? '#ff0000' : '#ffffff';
      re.lastIndex = 0;
      while ((m = re.exec(no.data))) {
        var rg = document.createRange(); rg.setStart(no, m.index); rg.setEnd(no, m.index + m[0].length);
        var rects = rg.getClientRects();
        if (rects.length === 1) desenha(m[0], rects[0]);
        else for (var k = 0; k < m[0].length; k++) {
          var r1 = document.createRange(); r1.setStart(no, m.index + k); r1.setEnd(no, m.index + k + 1);
          var rc = r1.getClientRects()[0]; if (rc) desenha(m[0][k], rc);
        }
      }
    }
    function desenha(txt, rc) {
      var mt = g.measureText(txt), asc = mt.fontBoundingBoxAscent || fs * 0.86, desc = mt.fontBoundingBoxDescent || fs * 0.26;
      g.fillText(txt, rc.left - x0, rc.top - y0 + (rc.height - asc - desc) / 2 + asc);
    }
    var d = g.getImageData(0, 0, W, H).data, px = [], cor = [];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = (y * W + x) * 4;
      if (d[i + 3] > 128) { px.push(x + x0 - pr.left, y + y0 - pr.top); cor.push(d[i + 1] < 128 ? 1 : 0); }
    }
    return { px: px, cor: cor };
  }

  // linhas mascaradas: parte cada .am3-mt em linhas reais (pela posição das palavras) e embrulha cada linha
  function mascarar(cont) {
    var i = 0;
    cont.querySelectorAll('.am3-mt').forEach(function (el) {
      if (el._orig === undefined) el._orig = el.innerHTML;
      el.innerHTML = el._orig;
      if (el.children.length) { el.innerHTML = '<span class="am3-ml"><span class="am3-mi" style="--i:' + i + '">' + el._orig + '</span></span>'; i++; return; }
      var palavras = el.textContent.trim().split(/\s+/);
      el.innerHTML = palavras.map(function (w) { return '<span>' + w + '</span>'; }).join(' ');
      var linhas = [], ant = null;
      [].forEach.call(el.children, function (s) {
        if (ant === null || Math.abs(s.offsetTop - ant) > 3) { linhas.push([]); ant = s.offsetTop; }
        linhas[linhas.length - 1].push(s.textContent);
      });
      el.innerHTML = linhas.map(function (l) { return '<span class="am3-ml"><span class="am3-mi" style="--i:' + (i++) + '">' + l.join(' ') + '</span></span>'; }).join('');
    });
    cont.style.setProperty('--n', String(i + 0.6));
  }

  window.initAberturaMalha = function (root) {
    var palco = root.querySelector('.am3-palco');
    var tela = root.querySelector('.am3-tela');
    var titulo = root.querySelector('.am3-titulo');
    var topo = root.querySelector('.am3-topo');
    var svgG = root.querySelector('.am3-grade');
    var medidasEl = root.querySelector('.am3-medidas');
    var azul = root.querySelector('.am3-plano--azul');
    var amarelo = root.querySelector('.am3-plano--amarelo');
    var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var celular = window.matchMedia('(max-width: 767px)').matches;
    var fixos = { role: root.querySelector('.am3-role'), rot0: root.querySelector('.am3-rot0'), filete: root.querySelector('.am3-filete'), resto: root.querySelector('.am3-resto') };

    function carregaFotos() {
      root.querySelectorAll('img[data-src]').forEach(function (im) {
        if (!im.getAttribute('src')) { im.fetchPriority = 'low'; im.src = BASE + im.dataset.src; }
      });
    }

    gsap.registerPlugin(ScrollTrigger);

    return gsap.context(function (self) {
      var vivo = true, visivel = true, motor = null, topoAzul, D = null;
      var toque = window.matchMedia('(hover: none)').matches;
      var semMouse = reduzido || toque || celular;
      var S = { P: 0, entra: reduzido ? 1 : 0 };
      var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, k: 0, v: 0, alvo: 0, nx: 0, ny: 0, sx: 0, sy: 0, px: 0, py: 0, vel: 0 };
      var W = 1, H = 1, R = {}, G = {};

      // ---------- elementos por data-k ----------
      var fotos = [].slice.call(root.querySelectorAll('.am3-cx')).map(function (el) {
        var im = el.querySelector('img');
        return { el: el, k: el.dataset.k, asp: (+im.getAttribute('width')) / (+im.getAttribute('height')), dim: el.dataset.dim,
          pb: el.querySelector('.am3-pb'), cor: el.querySelector('.am3-cor'), amar: el.querySelector('.am3-amar') };
      });
      var textos = [].slice.call(root.querySelectorAll('.am3-cartao, .am3-bloco, .am3-num, .am3-trilho-r')).map(function (el) { return { el: el, k: el.dataset.k }; });
      var celsTr = [].slice.call(root.querySelectorAll('.am3-c')).filter(function (el) { return !(celular && el.dataset.m === '0'); });
      root.querySelectorAll('.am3-c').forEach(function (el) { if (celular && el.dataset.m === '0') el.style.display = 'none'; });
      var cont = [].slice.call(root.querySelectorAll('.am3-num-v span')).map(function (s) {
        return { el: s, k: s.closest('.am3-num').dataset.k, de: +s.dataset.de, ate: +s.dataset.ate, pre: s.dataset.pre || '', suf: s.dataset.suf || '', ult: null };
      });
      var INI = { sofa: 0, janela: 1, recall: 2, coletiva: 3 }; // as 4 caixas que os pontos traçam

      // células grafite sobre cada foto (8 x 10 no desktop, 4 x 5 no celular), apagam a partir do canto superior esquerdo
      fotos.forEach(function (f) {
        var nc = celular ? 3 : 4, nl = celular ? 4 : 5, cel = document.createElement('div'), html = '';
        cel.className = 'am3-cel'; cel.style.gridTemplateColumns = 'repeat(' + nc + ', 1fr)'; cel.style.gridTemplateRows = 'repeat(' + nl + ', 1fr)';
        for (var l = 0; l < nl; l++) for (var c = 0; c < nc; c++) html += '<i style="--o:' + (0.04 + (l + c + hash(l * 7 + c) * 0.6) / (nl + nc - 1.4) * 0.9).toFixed(3) + '"></i>';
        cel.innerHTML = html; f.el.appendChild(cel);
        var m = document.createElement('span'); m.className = 'am3-medida'; m.textContent = f.dim; medidasEl.appendChild(m); f.med = m;
      });
      var gradeL = [];
      for (var gi = 0; gi < 13; gi++) { var gl = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svgG.appendChild(gl); gradeL.push(gl); }

      // ---------- grade e roteiro ----------
      function grade() {
        var m = celular ? 20 : Math.round(W * 0.05), g = celular ? 12 : 16, n = celular ? 4 : 12;
        var cw = (W - 2 * m - (n - 1) * g) / n;
        G = { m: m, g: g, n: n, cw: cw, X: function (c) { return m + c * (cw + g); }, L: function (s) { return s * cw + (s - 1) * g; } };
      }
      function roteiro() {
        var X = G.X, L = G.L, g = G.g, a = {}, r = {};
        fotos.forEach(function (f) { a[f.k] = f.asp; });
        function F(k, w) { return w / a[k]; }
        function fixo(k0, k1, k2, k3, x, y, y2) { return [[k0, [x, y, 0, 0], 0], [k1, [x, y, 0, 0], 1], [k2, [x, y2, 0, 0], 1], [k3, [x, y2 - 0.04 * H, 0, 0], 0]]; }
        if (!celular) {
          var yA = 0.2 * H, wJ = L(5), hJ = F('janela', wJ);
          var A = { sofa: [X(0), yA, L(3), F('sofa', L(3))], janela: [X(4), yA, wJ, hJ], recall: [X(10), yA, L(2), F('recall', L(2))], coletiva: [X(4), yA + hJ + g, L(4), F('coletiva', L(4))] };
          var grande = W > 1440 ? W * 0.88 : W - 2 * G.m, gx = (W - grande) / 2, gy = 0.1 * H, gh = 0.82 * H;
          var sofaB = [X(0), yA, L(2), F('sofa', L(2))], sofaC = [X(8), 0.18 * H, L(2), F('sofa', L(2))], sofa820 = Math.min(820, W);
          var janB = [X(3), yA, L(6), F('janela', L(6))];
          r.sofa = [[0.07, A.sofa, 0], [0.18, A.sofa, 1], [0.30, A.sofa, 1], [0.34, sofaB, 1], [0.36, sofaB, 1], [0.37, sofaB, 0], [0.505, sofaC, 0], [0.53, sofaC, 1], [0.56, sofaC, 1],
            [0.6, sofaC, 0], [0.82, [W / 2 - L(3) / 2, 0.2 * H, L(3), F('sofa', L(3))], 0], [0.84, [W / 2 - L(3) / 2, 0.2 * H, L(3), F('sofa', L(3))], 1],
            [0.875, [W / 2 - sofa820 / 2, 0, sofa820, H], 1], [0.92, [W / 2 - sofa820 / 2, 0, sofa820, H], 1], [0.97, [X(8), 0.2 * H, L(3), F('sofa', L(3))], 1]];
          r.janela = [[0.07, A.janela, 0], [0.18, A.janela, 1], [0.30, A.janela, 1], [0.34, janB, 1], [0.37, janB, 1],
            [0.42, [gx, gy, grande, gh], 1], [0.51, [gx, gy, grande, gh], 1], [0.52, [gx, gy, grande, gh], 0]];
          var hfo = F('folha', L(4)), yfo = H - hfo - G.m;
          var recB = A.recall, recC = [X(10), 0.18 * H, L(2), F('sofa', L(2))], recD = [X(5), 0.14 * H, L(3), Math.min(F('recall', L(3)), yfo - 0.14 * H - 2 * g - 24)];
          r.recall = [[0.07, A.recall, 0], [0.18, A.recall, 1], [0.30, A.recall, 1], [0.34, recB, 1], [0.36, recB, 1], [0.37, recB, 0], [0.505, recC, 0], [0.53, recC, 1], [0.565, recC, 1],
            [0.6, recD, 1], [0.64, recD, 1], [0.68, [recD[0], 0.08 * H, recD[2], recD[3]], 0]];
          var colB = [X(3), yA + janB[3] + g, L(4), F('coletiva', L(4))], colC = [X(8), 0.6 * H, L(4), F('coletiva', L(4))], colD = [X(8), 0.14 * H, L(4), F('coletiva', L(4))];
          r.coletiva = [[0.07, A.coletiva, 0], [0.18, A.coletiva, 1], [0.30, A.coletiva, 1], [0.34, colB, 1], [0.36, colB, 1], [0.37, colB, 0], [0.505, colC, 0], [0.53, colC, 1], [0.565, colC, 1],
            [0.6, colD, 1], [0.64, colD, 1], [0.68, [colD[0], 0.08 * H, colD[2], colD[3]], 0]];
          var bbbB = [X(9), yA + A.recall[3] + 2 * g, L(3), F('bbb', L(3))], bbbD = [X(8), 0.14 * H + F('coletiva', L(4)) + g, L(4), F('bbb', L(4))];
          r.bbb = [[0.31, [bbbB[0], 0.7 * H, bbbB[2], bbbB[3]], 0], [0.34, bbbB, 1], [0.36, bbbB, 1], [0.37, bbbB, 0], [0.58, bbbD, 0], [0.61, bbbD, 1], [0.64, bbbD, 1], [0.68, [bbbD[0], bbbD[1] - 0.06 * H, bbbD[2], bbbD[3]], 0]];
          var wf = L(4), hf = F('folha', wf);
          var yf = H - hf - G.m, xf0 = W - G.m - wf, xf1 = X(5); // a manchete corre inteira dentro da margem
          r.folha = [[0.555, [xf0 + 40, yf, wf, hf], 0], [0.565, [xf0, yf, wf, hf], 1], [0.64, [xf1, yf, wf, hf], 1], [0.66, [xf1, yf, wf, hf], 0]];
          r.cartao = [[0.42, [gx + 32, gy + gh - 230, 0, 0], 0], [0.425, [gx + 32, gy + gh - 230, 0, 0], 1], [0.465, [gx + 32, gy + gh - 230, 0, 0], 1], [0.47, [gx + 32, gy + gh - 230, 0, 0], 0]];
          r.bloco = fixo(0.507, 0.52, 0.562, 0.574, X(0), 0.2 * H, 0.19 * H);
          r.n60 = fixo(0.574, 0.584, 0.64, 0.66, X(0), 0.18 * H, 0.16 * H);
          r.n92 = fixo(0.578, 0.588, 0.64, 0.66, X(0), 0.4 * H, 0.38 * H);
          r.n309 = fixo(0.582, 0.592, 0.64, 0.66, X(0), 0.62 * H, 0.6 * H);
        } else {
          var y0 = 0.15 * H, wj = L(4), hj = F('janela', wj), hs = 0.25 * H;
          var B = { janela: [X(0), y0, wj, hj], sofa: [X(0), y0 + hj + g, L(2), hs], recall: [X(2), y0 + hj + g, L(2), hs],
            coletiva: [X(0), y0 + hj + hs + 2 * g, L(4), Math.min(F('coletiva', L(4)), 0.2 * H)] };
          var jg = [0, 0.12 * H, W, 0.76 * H], sm = [X(0), 0.66 * H, L(2), 0.26 * H], rm = [X(2), 0.66 * H, L(2), 0.26 * H];
          r.janela = [[0.07, B.janela, 0], [0.18, B.janela, 1], [0.30, B.janela, 1], [0.42, jg, 1], [0.51, jg, 1], [0.52, jg, 0]];
          r.sofa = [[0.07, B.sofa, 0], [0.18, B.sofa, 1], [0.30, B.sofa, 1], [0.34, B.sofa, 0], [0.505, sm, 0], [0.53, sm, 1], [0.56, sm, 1], [0.57, sm, 0],
            [0.82, [W / 2 - L(2) / 2, 0.3 * H, L(2), F('sofa', L(2))], 0], [0.84, [W / 2 - L(2) / 2, 0.3 * H, L(2), F('sofa', L(2))], 1],
            [0.875, [0, 0, W, H], 1], [0.92, [0, 0, W, H], 1], [0.97, [X(1), 0.3 * H, L(2), F('sofa', L(2))], 1]];
          var rD = [X(0), 0.54 * H, L(2), 0.36 * H];
          r.recall = [[0.07, B.recall, 0], [0.18, B.recall, 1], [0.30, B.recall, 1], [0.34, B.recall, 0], [0.505, rm, 0], [0.53, rm, 1], [0.565, rm, 1], [0.6, rD, 1], [0.64, rD, 1], [0.67, [rD[0], 0.5 * H, rD[2], rD[3]], 0]];
          var cD = [X(2), 0.54 * H, L(2), 0.17 * H];
          r.coletiva = [[0.07, B.coletiva, 0], [0.18, B.coletiva, 1], [0.30, B.coletiva, 1], [0.34, B.coletiva, 0], [0.58, cD, 0], [0.6, cD, 1], [0.64, cD, 1], [0.67, [cD[0], 0.5 * H, cD[2], cD[3]], 0]];
          var bD = [X(2), 0.73 * H, L(2), 0.17 * H];
          r.bbb = [[0.6, bD, 0], [0.62, bD, 1], [0.64, bD, 1], [0.67, [bD[0], 0.7 * H, bD[2], bD[3]], 0]];
          r.folha = [];
          r.cartao = [[0.42, [32, 0.88 * H - 200, 0, 0], 0], [0.425, [32, 0.88 * H - 200, 0, 0], 1], [0.465, [32, 0.88 * H - 200, 0, 0], 1], [0.47, [32, 0.88 * H - 200, 0, 0], 0]];
          r.bloco = fixo(0.507, 0.52, 0.562, 0.574, X(0), 0.12 * H, 0.11 * H);
          r.n60 = fixo(0.574, 0.584, 0.64, 0.66, X(0), 0.12 * H, 0.11 * H);
          r.n92 = fixo(0.578, 0.588, 0.64, 0.66, X(0), 0.26 * H, 0.25 * H);
          r.n309 = fixo(0.582, 0.592, 0.64, 0.66, X(0), 0.4 * H, 0.39 * H);
        }
        return r;
      }
      // quadro-chave atual: interpola com suavização entre os vizinhos
      function amostrar(kf, P) {
        if (!kf || !kf.length) return null;
        if (P <= kf[0][0]) return { r: kf[0][1], o: 0 };
        for (var i = 0; i < kf.length - 1; i++) {
          var a = kf[i], b = kf[i + 1];
          if (P <= b[0]) {
            var t = suave((P - a[0]) / (b[0] - a[0]));
            return { r: [lerp(a[1][0], b[1][0], t), lerp(a[1][1], b[1][1], t), lerp(a[1][2], b[1][2], t), lerp(a[1][3], b[1][3], t)], o: lerp(a[2], b[2], t) };
          }
        }
        var z = kf[kf.length - 1]; return { r: z[1], o: z[2] };
      }
      function seg(a, b) { return clamp01((S.P - a) / (b - a)); }

      function medir() {
        W = palco.clientWidth; H = palco.clientHeight;
        grade(); R = roteiro();
        // cada foto tem o tamanho do maior quadro que vai ocupar, com folga vertical de 12% para o parallax interno
        fotos.forEach(function (f) {
          var mw = 1, mh = 1;
          (R[f.k] || []).forEach(function (q) { mw = Math.max(mw, q[1][2]); mh = Math.max(mh, q[1][3]); });
          f.W0 = Math.ceil(mw); f.H0 = Math.ceil(mh * (f.k === 'folha' ? 1 : 1.12)); // a manchete nunca é cortada
          f.el.style.width = f.W0 + 'px'; f.el.style.height = f.H0 + 'px';
        });
        // todas as células na mesma altura: a menor foto manda (nunca ampliar além da origem)
        var hTr = Math.min.apply(null, celsTr.map(function (el) { return +el.querySelector('img').getAttribute('height'); }).concat([celular ? 220 : 320]));
        celsTr.forEach(function (el) {
          var im = el.querySelector('img'), nw = +im.getAttribute('width'), nh = +im.getAttribute('height');
          var h = hTr; el._w = Math.round(h * nw / nh); el._h = h; el._open = el._open || 0;
          el.style.width = el._w + 'px'; el.style.height = el._h + 'px';
        });
        textos.forEach(function (t) { mascarar(t.el); });
        for (var i = 0; i < 13; i++) {
          var x = i < G.n ? G.X(i) : G.X(G.n - 1) + G.cw;
          gradeL[i].setAttribute('x1', x.toFixed(1)); gradeL[i].setAttribute('x2', x.toFixed(1));
          gradeL[i].setAttribute('y1', String(-H)); gradeL[i].setAttribute('y2', String(H));
          gradeL[i].style.display = i > G.n ? 'none' : '';
        }
        if (motor) motor.medir();
      }

      // ---------- pontos: título -> perímetros das 4 caixas, uma vaga a cada 6 px (linha pontilhada de gravura) ----------
      function alvos(n) {
        var t = tintaDoTitulo(titulo, palco), px = t.px, nInk = px.length / 2;
        if (!nInk) return null;
        var vagas = [];
        Object.keys(INI).forEach(function (k) {
          var q = amostrar(R[k], 0.18); if (!q) return; var b = q.r, per = 2 * (b[2] + b[3]);
          for (var l = 0; l < per; l += 6) {
            var u = l, X, Y;
            if (u < b[2]) { X = b[0] + u; Y = b[1]; } else if ((u -= b[2]) < b[3]) { X = b[0] + b[2]; Y = b[1] + u; }
            else if ((u -= b[3]) < b[2]) { X = b[0] + b[2] - u; Y = b[1] + b[3]; } else { X = b[0]; Y = b[1] + b[3] - (u - b[2]); }
            vagas.push([X, Y]);
          }
        });
        vagas.sort(function (p, q) { return p[0] - q[0]; });
        var d = { n: n, tx: new Float32Array(n), ty: new Float32Array(n), fx: new Float32Array(n), fy: new Float32Array(n),
          cT: new Float32Array(n), dl: new Float32Array(n), sd: new Float32Array(n) };
        var idx = new Uint32Array(nInk), i, j, tmp;
        for (i = 0; i < nInk; i++) idx[i] = i;
        for (i = nInk - 1; i > 0; i--) { j = (Math.random() * (i + 1)) | 0; tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
        var ox = new Float32Array(n), oy = new Float32Array(n), oc = new Float32Array(n), ord = new Array(n);
        for (i = 0; i < n; i++) { var a = idx[i % nInk]; ox[i] = px[a * 2] + Math.random() - 0.5; oy[i] = px[a * 2 + 1] + Math.random() - 0.5; oc[i] = t.cor[a]; ord[i] = i; }
        ord.sort(function (p, q) { return ox[p] - ox[q]; });
        for (var k = 0; k < n; k++) {
          var s = ord[k], v = vagas[Math.min(vagas.length - 1, Math.floor(k / n * vagas.length))];
          d.tx[k] = ox[s]; d.ty[k] = oy[s]; d.cT[k] = oc[s]; d.fx[k] = v[0]; d.fy[k] = v[1];
          d.dl[k] = 0.32 * (k / n) + 0.08 * Math.random(); // em ordem, da esquerda para a direita, como quem traça
          d.sd[k] = Math.random();
        }
        return d;
      }

      // ---------- motor WebGL ----------
      function motorGL() {
        if (!window.THREE || !window.WebGLRenderingContext) return null;
        var renderer;
        try { renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: false, alpha: true, powerPreference: 'high-performance' }); }
        catch (e) { return null; }
        if (!renderer.getContext()) return null;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        var cena = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10), pts = null, limpo = false;
        cam.position.z = 1;
        var U = {
          uTime: { value: 0 }, uVoo: { value: 0 }, uFade: { value: 0 }, uSize: { value: 2 }, uAmp: { value: 80 }, uBreath: { value: 0.6 },
          uMouse: { value: new THREE.Vector2(-9999, -9999) }, uMouseK: { value: 0 }, uRad: { value: 180 }, uPush: { value: 34 },
          uMarfim: { value: new THREE.Color('#F3F3F0') }, uAmarelo: { value: new THREE.Color('#F2C230') }
        };
        return {
          tipo: 'webgl',
          medir: function () { renderer.setSize(W, H, false); cam.right = W; cam.bottom = H; cam.updateProjectionMatrix(); },
          dados: function (d) {
            if (pts) { cena.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
            var n = d.n, pos = new Float32Array(n * 3), fr = new Float32Array(n * 2), info = new Float32Array(n * 4);
            for (var i = 0; i < n; i++) {
              pos[i * 3] = d.tx[i]; pos[i * 3 + 1] = d.ty[i]; fr[i * 2] = d.fx[i]; fr[i * 2 + 1] = d.fy[i];
              info[i * 4] = d.cT[i]; info[i * 4 + 2] = d.dl[i]; info[i * 4 + 3] = d.sd[i];
            }
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setAttribute('aFrame', new THREE.BufferAttribute(fr, 2));
            g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
            pts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthTest: false, depthWrite: false }));
            pts.frustumCulled = false; cena.add(pts);
          },
          quadro: function (time, voo, mk) {
            if (voo >= 1) { if (!limpo) { renderer.clear(); limpo = true; } return; }
            limpo = false;
            var dpr = renderer.getPixelRatio();
            U.uTime.value = reduzido ? 0 : time; U.uVoo.value = voo; U.uFade.value = S.entra;
            U.uSize.value = (celular ? 2.0 : 2.1) * dpr; U.uBreath.value = reduzido ? 0 : 0.6; U.uAmp.value = H * 0.08;
            U.uMouse.value.set(mouse.x, mouse.y); U.uMouseK.value = mk;
            U.uRad.value = celular ? 110 : 180; U.uPush.value = celular ? 22 : 34;
            renderer.render(cena, cam);
          },
          destruir: function () { if (pts) { pts.geometry.dispose(); pts.material.dispose(); } renderer.dispose(); }
        };
      }

      // ---------- motor canvas 2D (sem WebGL): a mesma coreografia ----------
      function motor2D() {
        var g = tela.getContext('2d'); if (!g) return null;
        var d = null, dpr = Math.min(window.devicePixelRatio || 1, 2), c1x, c1y, limpo = false;
        return {
          tipo: '2d',
          medir: function () { tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr); },
          dados: function (dd) {
            d = dd; c1x = new Float32Array(d.n); c1y = new Float32Array(d.n);
            for (var i = 0; i < d.n; i++) {
              var dx = d.fx[i] - d.tx[i], dy = d.fy[i] - d.ty[i], b = (hash(d.sd[i] * 3.1) - 0.5) * 0.5;
              c1x[i] = (d.tx[i] + d.fx[i]) / 2 - dy * b; c1y[i] = (d.ty[i] + d.fy[i]) / 2 + dx * b - H * 0.08 * hash(d.sd[i] * 5.7);
            }
          },
          quadro: function (time, voo, mk) {
            if (!d) return;
            if (voo >= 1) { if (!limpo) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, tela.width, tela.height); limpo = true; } return; }
            limpo = false;
            g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
            var rad = celular ? 110 : 180, push = celular ? 22 : 34, s = celular ? 2 : 2.4;
            for (var pass = 0; pass < 2; pass++) {
              g.fillStyle = pass ? '#F2C230' : '#F3F3F0'; g.globalAlpha = 0.88 * S.entra;
              for (var i = 0; i < d.n; i++) {
                var t = clamp01(voo * 1.4 - d.dl[i]); if (t > 0.98) continue;
                var e = 1 - Math.pow(2, -10 * t);
                if ((d.cT[i] * (1 - e) > 0.5 ? 1 : 0) !== pass) continue;
                var u = 1 - e, x = u * u * d.tx[i] + 2 * u * e * c1x[i] + e * e * d.fx[i], y = u * u * d.ty[i] + 2 * u * e * c1y[i] + e * e * d.fy[i];
                if (mk > 0.01 && e < 1) {
                  var mx = x - mouse.x, my = y - mouse.y, r = Math.sqrt(mx * mx + my * my);
                  if (r < rad) { var f = mk * (1 - r / rad) * (1 - e) * push / (r + 1e-4); x += mx * f; y += my * f; }
                }
                g.fillRect(x - s / 2, y - s / 2, s, s);
              }
            }
          },
          destruir: function () {}
        };
      }

      // ---------- arranque ----------
      // ?motor=2d força o caminho sem WebGL (teste do fallback)
      motor = (/[?&]motor=2d/.test(location.search) ? null : motorGL()) || motor2D();
      if (!motor) { root.classList.add('am3-final'); carregaFotos(); return; }
      root.dataset.motor = motor.tipo;
      var fontes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px Newsreader'), document.fonts.ready]) : Promise.resolve();
      fontes.then(function () { if (vivo) self.add(comecar); });

      function comecar() {
        medir();
        D = alvos(motor.tipo === '2d' ? (celular ? 2000 : 5000) : (celular ? 4000 : 18000));
        if (!D) { root.classList.add('am3-final'); carregaFotos(); return; }
        motor.dados(D);
        root.dataset.pontos = D.n;
        topoAzul = topo.cloneNode(true); topoAzul.classList.add('am3-topo--azul'); topoAzul.setAttribute('aria-hidden', 'true');
        topoAzul.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
        topo.after(topoAzul);
        gsap.ticker.add(quadro);
        root.classList.add('am3-pontos');
        if (!reduzido) gsap.to(S, { entra: 1, duration: 0.6, ease: 'power1.out' });
        setTimeout(carregaFotos, 400);

        var tl = gsap.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: root, start: 'top top', end: celular ? '+=700%' : '+=900%', scrub: 0.6, pin: palco, anticipatePin: 1 } });
        tl.to(S, { P: 1, duration: 1 }, 0);
        tl.set(root, { '--am3-fundo': '#F2C230' }, 0.97);
        root._am3tl = tl;

        ScrollTrigger.addEventListener('refresh', function () {
          if (!vivo) return;
          medir(); var d = alvos(D.n); if (d) { D = d; motor.dados(D); }
        });
        new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; }).observe(palco);
      }

      // ---------- mouse / toque ----------
      function aponta(cx, cy) {
        var pr = palco.getBoundingClientRect(), x = cx - pr.left, y = cy - pr.top;
        if (y < 0 || y > pr.height) { mouse.alvo = 0; return; }
        mouse.tx = x; mouse.ty = y; mouse.nx = x / pr.width * 2 - 1; mouse.ny = y / pr.height * 2 - 1; mouse.alvo = 1;
        if (mouse.x < -9000) { mouse.x = x; mouse.y = y; mouse.px = x; mouse.py = y; }
      }
      function sai() { mouse.alvo = 0; mouse.nx = 0; mouse.ny = 0; }
      function onMove(e) { aponta(e.clientX, e.clientY); }
      function onTouch(e) { if (e.touches[0]) aponta(e.touches[0].clientX, e.touches[0].clientY); }
      if (!reduzido) {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', sai);
        window.addEventListener('touchstart', onTouch, { passive: true });
        window.addEventListener('touchmove', onTouch, { passive: true });
        window.addEventListener('touchend', sai, { passive: true });
      }

      var ultimo = {};
      function css(el, k, v) { if (ultimo[k] !== v) { ultimo[k] = v; el.style.setProperty(k.split('|')[0], v); } }
      function attr(el, k, v) { if (ultimo[k] !== v) { ultimo[k] = v; el.setAttribute(k.split('|')[0], v); } }
      // momento em que os pontos pousam numa coluna x (o mesmo cálculo do shader, invertido)
      function pouso(x) { var r = clamp01(x / W); return 0.07 + 0.11 * (1 + 0.32 * r + 0.04) / 1.4; }

      function quadro(time, dtMs) {
        if (!visivel || !D) return;
        var dt = Math.min(0.05, (dtMs || 16) / 1000), P = S.P, i;

        // cursor: qualquer gesto afasta os pontos do título (piso 0,45); parado, a mola devolve
        var vel = Math.hypot(mouse.tx - mouse.px, mouse.ty - mouse.py) / dt;
        mouse.px = mouse.tx; mouse.py = mouse.ty;
        mouse.vel += (vel - mouse.vel) * 0.25;
        var energia = (mouse.alvo && mouse.vel > 2) ? Math.min(1, 0.45 + mouse.vel / 1600) : 0;
        var sobe = energia > mouse.k;
        mouse.v += ((energia - mouse.k) * (sobe ? 160 : 20) - mouse.v * (sobe ? 20 : 6.5)) * dt;
        mouse.k = Math.max(0, Math.min(1.15, mouse.k + mouse.v * dt));
        var l = 1 - Math.pow(0.02, dt);
        mouse.x += (mouse.tx - mouse.x) * l; mouse.y += (mouse.ty - mouse.y) * l;
        mouse.sx += ((semMouse ? 0 : mouse.nx) - mouse.sx) * l * 0.5; mouse.sy += ((semMouse ? 0 : mouse.ny) - mouse.sy) * l * 0.5;
        var voo = seg(0.07, 0.18);
        css(tela, 'visibility|tv', voo >= 1 ? 'hidden' : 'visible'); // camada fora de uso não pesa na composição
        motor.quadro(time, voo, reduzido ? 0 : mouse.k);

        // batida 1: rótulo, filete, dica; do título sobra uma linha curta no alto
        css(fixos.role, 'opacity', String(0.65 * (1 - seg(0, 0.03))));
        css(fixos.rot0, 'opacity|r0', String(1 - seg(0.06, 0.1)));
        css(fixos.filete, 'opacity|fl', String(1 - seg(0.06, 0.1)));
        css(fixos.resto, 'opacity|rs', String(seg(0.15, 0.19) * (1 - seg(0.31, 0.34))));

        // planos chapados: azul sobe pela base (batida 5); amarelo assume no match cut (batida 8)
        var az = suave(seg(0.47, 0.505)) * (1 - seg(0.92, 0.93)), am = suave(seg(0.885, 0.915));
        // sobem por transform (composição na GPU), corte reto na borda de cima
        css(azul, 'transform|az', 'translate3d(0,' + ((1 - az) * 100).toFixed(2) + '%,0)');
        css(amarelo, 'transform|am', 'translate3d(0,' + ((1 - am) * 100).toFixed(2) + '%,0)');
        if (topoAzul) css(topoAzul, 'clip-path|ta', 'inset(' + ((1 - am) * H).toFixed(1) + 'px 0 0 0)');

        // grade de 12 colunas: marfim fina na construção, azul-marinho no amarelo, e desce para o capítulo 1
        var gOp = seg(0.08, 0.16) * (1 - seg(0.4, 0.44)) * 0.14 + seg(0.9, 0.94) * 0.35, gDesce = suave(seg(0.94, 1)) * H * 0.6;
        var gCor = P > 0.88 ? '#14213D' : '#F3F3F0';
        css(svgG, 'z-index|gz', P > 0.88 ? '7' : '1'); // no amarelo a grade passa à frente e desce para o capítulo 1
        for (i = 0; i < gradeL.length; i++) {
          css(gradeL[i], 'opacity|g' + i, gOp.toFixed(3)); css(gradeL[i], 'stroke|gc' + i, gCor);
          css(gradeL[i], 'transform|gt' + i, 'translate3d(0,' + (gDesce * (0.6 + 0.2 * (i % 3))).toFixed(1) + 'px,0)');
        }

        // caixas de foto: quadro-chave -> recorte (cover) + escala uniforme + parallax interno + células + cor
        // sem parallax do mouse enquanto a grade de 1 px se constrói e se reorganiza
        var mf = seg(0.5, 0.54), cinza = 1 - suave(seg(0.51, 0.56)), mxp = -mouse.sx * 40 * mf, myp = -mouse.sy * 24 * mf;
        for (i = 0; i < fotos.length; i++) {
          var f = fotos[i], q = amostrar(R[f.k], P);
          if (!q || q.o < 0.002) { css(f.el, 'opacity|f' + i, '0'); css(f.med, 'opacity|fm' + i, '0'); continue; }
          var x = q.r[0], y = q.r[1], w = q.r[2], h = q.r[3];
          var prof = f.k === 'janela' ? 0.6 : f.k === 'recall' ? 1.3 : 1; // três velocidades: 0,6 / 1 / 1,3
          if (P < 0.86 && f.k !== 'folha') { x += mxp * prof; y += myp * prof - (P - 0.5) * H * 0.1 * (prof - 1) * mf; }
          if (P < 0.86 && f.k !== 'folha' && w < W - 2 * G.m) x = Math.max(G.m, Math.min(W - G.m - w, x));
          var s = Math.max(w / f.W0, h / f.H0), insX = (f.W0 - w / s) / 2, insY = (f.H0 - h / s) / 2;
          var py = insY * 0.9 * (1 - 2 * seg(0.16, 0.95)); // a foto anda dentro da moldura
          // saída do sofá sobre o amarelo: entra por corte reto, de baixo para cima
          var corte = 0;
          css(f.el, 'transform|f' + i, 'translate3d(' + (x - insX * s).toFixed(1) + 'px,' + (y - insY * s).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')');
          css(f.el, 'clip-path|fc' + i, 'inset(' + (insY + corte).toFixed(1) + 'px ' + insX.toFixed(1) + 'px ' + insY.toFixed(1) + 'px)');
          css(f.el, 'opacity|f' + i, q.o.toFixed(3));
          css(f.el, '--py|fp' + i, py.toFixed(1) + 'px');
          css(f.el, '--cinza|fg' + i, (f.k === 'folha' ? 0 : cinza).toFixed(3));
          var rev = f.k in INI ? seg(0.18 + INI[f.k] * 0.015, 0.25 + INI[f.k] * 0.015) : f.k === 'bbb' ? seg(0.31, 0.345) : f.k === 'folha' ? seg(0.555, 0.575) : 1;
          if ((f.k === 'bbb' && P > 0.5) || (f.k === 'sofa' && P > 0.8)) rev = 1;
          css(f.el, '--rev|fv' + i, rev.toFixed(3));
          if (f.pb) css(f.pb, 'visibility|vp' + i, cinza < 0.001 ? 'hidden' : 'visible');
          css(f.cor, 'visibility|vc' + i, (cinza > 0.999 || (f.k === 'sofa' && P > 0.888)) ? 'hidden' : 'visible');
          if (f.k === 'janela') css(f.el, 'z-index|fz', (P > 0.32 && P < 0.43) ? '6' : '1');
          if (f.k === 'sofa') { var amw = suave(seg(0.877, 0.887)); css(f.el, '--am|sa', amw.toFixed(3)); if (f.amar) css(f.amar, 'visibility|sv', amw > 0 ? 'visible' : 'hidden'); }
          // moldura de 1 px na janela visível, dentro da caixa: nasce quando os pontos pousam
          var brd = (f.k in INI ? clamp01((P - pouso(x) + 0.004) / (pouso(x + w) - pouso(x) + 0.008)) : 1) * (f.k === 'folha' ? 0 : 1);
          if (f.k === 'janela' && P > 0.42) brd *= 1 - seg(0.465, 0.47); // o azul cobre a janela: a moldura sai antes
          if (f.k === 'sofa' && P > 0.86) brd = seg(0.93, 0.95) * (P > 0.92 ? 1 : 0);
          css(f.el, '--bx|bx' + i, insX.toFixed(1) + 'px'); css(f.el, '--by|by' + i, (insY + corte).toFixed(1) + 'px');
          css(f.el, '--bw|bw' + i, (w / s).toFixed(1) + 'px'); css(f.el, '--bh|bh' + i, (h / s - corte).toFixed(1) + 'px');
          css(f.el, '--bb|bb' + i, (1 / s).toFixed(3) + 'px'); css(f.el, '--brd|bo' + i, brd.toFixed(3));
          css(f.el, '--am3-linha-cx|bc' + i, P > 0.9 ? '#14213D' : '#F3F3F0');
          // medida real da foto no canto: só na construção
          var mOp = f.k in INI ? seg(0.16, 0.2) * (1 - seg(0.3, 0.33)) : 0;
          css(f.med, 'opacity|fm' + i, mOp.toFixed(3));
          if (mOp > 0) css(f.med, 'transform|fmt' + i, 'translate3d(' + x.toFixed(1) + 'px,' + (y - 16).toFixed(1) + 'px,0)');
        }

        // textos: posição, opacidade e linhas mascaradas (sobem durante a entrada)
        for (i = 0; i < textos.length; i++) {
          var tx = textos[i], kf = R[tx.k], qt = amostrar(kf, P);
          if (!qt) continue;
          css(tx.el, 'opacity|t' + i, qt.o.toFixed(3));
          if (qt.o < 0.002) continue;
          css(tx.el, 'transform|t' + i, 'translate3d(' + Math.max(G.m, qt.r[0] + mxp * 1.3).toFixed(1) + 'px,' + (qt.r[1] + myp * 1.3).toFixed(1) + 'px,0)');
          css(tx.el, '--tx|tt' + i, (tx.k === 'cartao' || reduzido) ? '1' : suave((P - kf[0][0]) / Math.max(0.01, kf[2][0] - kf[0][0]) * 2.4).toFixed(3));
        }
        // contadores: quando o número entra, contam por tempo (1,2 s, expo.out) até o valor final exato do deck;
        // se a rolagem volta para antes da entrada, zeram; movimento reduzido mostra o final direto
        for (i = 0; i < cont.length; i++) {
          var c = cont[i], ent = R[c.k] ? R[c.k][1][0] - 0.004 : 1;
          if (P >= ent && !c.foi) {
            c.foi = true; c.o = { v: c.de, p: 0 };
            if (reduzido) { c.o.v = c.ate; c.o.p = 1; } else gsap.to(c.o, { v: c.ate, p: 1, duration: 1.2, ease: 'expo.out' });
          } else if (P < ent - 0.01 && c.foi) { c.foi = false; if (c.o) gsap.killTweensOf(c.o); c.o = null; }
          var vv = c.o ? Math.round(c.o.v) : c.ate;
          if (vv !== c.ult) { c.ult = vv; c.el.textContent = c.pre + (c.ate >= 1000 ? vv.toLocaleString('pt-BR') : vv) + c.suf; }
          css(c.el, 'opacity|cv' + i, (c.o ? Math.min(1, 0.2 + c.o.p * 4) : 1).toFixed(3)); // o começo da contagem nunca em opacidade cheia
        }

        // faixa dos cases: célula ativa abre no centro, vizinhas encolhem (recorte, nunca largura)
        var trOp = seg(0.645, 0.67) * (1 - seg(0.8, 0.835));
        if (trOp > 0 || ultimo.trilho) {
          ultimo.trilho = trOp > 0;
          var tot = 0, gap = celular ? 8 : 14;
          celsTr.forEach(function (el) { tot += el._w * 0.42 + gap; });
          var bx = lerp(W * 0.92, W * 0.4 - tot, seg(0.66, 0.82)), chao = (celular ? 0.72 : 0.5) * H + (celsTr[0] ? celsTr[0]._h / 2 : 0);
          celsTr.forEach(function (el, j) {
            var vis = el._w * (0.42 + 0.58 * el._open), cx = bx + vis / 2;
            el._open += ((1 - clamp01(Math.abs(cx - W * 0.5) / (W * (celular ? 0.45 : 0.3)))) - el._open) * 0.35;
            var corte = (el._w - vis) / 2;
            css(el, 'transform|c' + j, 'translate3d(' + (bx - corte).toFixed(1) + 'px,' + (chao - el._h).toFixed(1) + 'px,0)');
            css(el, 'clip-path|cc' + j, 'inset(0 ' + corte.toFixed(1) + 'px)');
            css(el, 'opacity|co' + j, trOp.toFixed(3));
            el._x = bx; el._top = chao - el._h;
            bx += vis + gap;
          });
          textos.forEach(function (tq, j) {
            if (tq.k !== 'r08') return;
            var lx = Math.min(W - G.m - tq.el.offsetWidth, Math.max(G.m, celsTr[0]._x)); // sempre dentro da margem
            css(tq.el, 'opacity|t' + j, trOp.toFixed(3));
            css(tq.el, 'transform|t' + j, 'translate3d(' + lx.toFixed(1) + 'px,' + (celsTr[0]._top - 26).toFixed(1) + 'px,0)');
          });
        }
      }

      return function () {
        vivo = false;
        gsap.ticker.remove(quadro);
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', sai);
        window.removeEventListener('touchstart', onTouch);
        window.removeEventListener('touchmove', onTouch);
        window.removeEventListener('touchend', sai);
        motor && motor.destruir();
      };
    }, root);
  };
})();
