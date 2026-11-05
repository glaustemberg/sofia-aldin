/* Abertura opção 3 (v14) · o título em pontos se desfaz em poeira e a poeira escorre até o perímetro das molduras;
   as fotos entram em cor, com guias de 1 px de prumo e nível e uma legenda que diz por que cada uma está ali.
   O bloco de apresentação monta junto com a construção. A janela cresce até a tela cheia, a coletiva sobe por cima
   e um plano chapado amarelo leva ao capítulo 1. Sem rosto em pontos: nenhum .bin é carregado.
   Expõe window.initAberturaMalha(root) -> gsap.context; marca root._am3tl quando o pin existe.
   Sem WebGL: os mesmos pontos em canvas 2D (?motor=2d força). Movimento reduzido: a rolagem constrói tudo;
   saem só o parallax do mouse e os loops automáticos. */
(function () {
  'use strict';

  var BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^\/]*$/, '');

  // ---------- shader: um único Points em coordenadas de tela, texto -> poeira -> molduras ----------
  var VERT = [
    'attribute vec2 aText; attribute vec2 aDust; attribute vec2 aFrame; attribute vec4 aInfo;', // atraso 1, atraso 2, semente, amarelo
    'uniform float uTime, uMorph, uDis, uOut, uFade, uSize, uBreath, uSwirl;',
    'uniform vec2 uMouse; uniform float uMouseK, uRad, uPush;',
    'uniform vec3 uColA, uColY;',
    'varying float vA; varying vec3 vC;',
    'float h(float n){ return fract(sin(n) * 43758.5453); }',
    'void main(){',
    '  float d1 = aInfo.x, d2 = aInfo.y, sd = aInfo.z;',
    '  vec2 tx = aText + vec2(sin(uTime * 0.9 + sd * 40.0), cos(uTime * 0.8 + sd * 33.0)) * uBreath;',
    '  float a1 = sd * 6.2832 + uTime * (0.15 + 0.35 * h(sd * 7.0));',
    '  vec2 du = aDust + vec2(cos(a1), sin(a1)) * uSwirl * (0.4 + h(sd * 3.0));',
    '  float t1 = clamp((uMorph - d1 * 0.5) / 0.5, 0.0, 1.0); float e1 = t1 * t1 * (3.0 - 2.0 * t1);',
    // trajetória curva (Bézier quadrática): cada ponto sai visível da letra
    '  vec2 dv = du - tx; vec2 c1 = (tx + du) * 0.5 + vec2(-dv.y, dv.x) * (h(sd * 3.1) - 0.5) * 0.6;',
    '  vec2 p = mix(mix(tx, c1, e1), mix(c1, du, e1), e1);',
    // a poeira escorre até o perímetro das molduras
    '  float t2 = clamp((uDis - d2 * 0.45) / 0.55, 0.0, 1.0); float e2 = t2 * t2 * (3.0 - 2.0 * t2);',
    '  vec2 dw = aFrame - p; vec2 c2 = p + dw * 0.5 + vec2(-dw.y, dw.x) * (h(sd * 9.0) - 0.5) * 0.35;',
    '  p = mix(mix(p, c2, e2), mix(c2, aFrame, e2), e2);',
    '  vec2 dm = p - uMouse; float r = length(dm);',
    '  float fm = uMouseK * (1.0 - smoothstep(0.0, uRad, r));',
    '  float lado = h(sd * 13.0) * 6.2832;',
    '  p += (dm / (r + 1e-4) * 0.75 + vec2(cos(lado), sin(lado)) * 0.45) * fm * uPush * (0.5 + h(sd * 11.0));',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);',
    '  float poeira = e1 * (1.0 - e2);',
    '  gl_PointSize = uSize * (1.0 - 0.3 * poeira) * (1.0 + 0.4 * fm);',
    '  vA = uFade * (1.0 - uOut) * (0.8 + 0.2 * h(sd * 21.0)) * (1.0 - 0.3 * poeira);',
    '  vC = mix(uColA, uColY, aInfo.w);',
    '}'
  ].join('\n');
  var FRAG = [
    'varying float vA; varying vec3 vC;',
    'void main(){ vec2 c = gl_PointCoord - 0.5; float a = vA * (1.0 - smoothstep(0.38, 0.5, length(c)));',
    '  if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }'
  ].join('\n');

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function hash(n) { var s = Math.sin(n) * 43758.5453; return s - Math.floor(s); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  // pixels de tinta do título renderizado em canvas, na posição exata do HTML (coordenadas do palco)
  function tintaDoTitulo(el, palco) {
    var pr = palco.getBoundingClientRect(), r = el.getBoundingClientRect();
    var x0 = Math.floor(r.left) - 2, y0 = Math.floor(r.top) - 2;
    var fs = parseFloat(getComputedStyle(el).fontSize), W = Math.ceil(r.width + fs), H = Math.ceil(r.height + fs * 0.4);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d', { willReadFrequently: true }), st = getComputedStyle(el);
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
    if ('letterSpacing' in g) g.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), no, re = /\S+/g, m;
    while ((no = walker.nextNode())) {
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
    var d = g.getImageData(0, 0, W, H).data, out = [];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 128) out.push(x + x0 - pr.left, y + y0 - pr.top);
    return out;
  }

  window.initAberturaMalha = function (root) {
    var palco = root.querySelector('.am3-palco');
    var tela = root.querySelector('.am3-tela');
    var titulo = root.querySelector('.am3-titulo');
    var cenaEl = root.querySelector('.am3-cena');
    var svg = root.querySelector('.am3-linhas');
    var topo = root.querySelector('.am3-topo');
    var role = root.querySelector('.am3-role');
    var passagem = root.querySelector('.am3-passagem');
    var bloco = root.querySelector('.am3-bloco');
    var bio = root.querySelector('.am3-bio');
    var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function porK(sel) { var o = {}; root.querySelectorAll(sel).forEach(function (el) { o[el.dataset.k] = el; }); return o; }
    var F = porK('.am3-f'), LEG = porK('.am3-leg'), CARD = porK('.am3-card');
    Object.keys(F).forEach(function (k) { F[k].style.setProperty('--o', F[k].dataset.o || '50% 50%'); });

    function carregaFotos() {
      root.querySelectorAll('img[data-src]').forEach(function (im) {
        if (!im.getAttribute('src')) { im.fetchPriority = 'low'; im.src = BASE + im.dataset.src; }
      });
    }
    function final() { root.classList.add('am3-final'); carregaFotos(); }

    gsap.registerPlugin(ScrollTrigger);

    return gsap.context(function (self) {
      var vivo = true, visivel = true, topoAzul, motor, D = null, nBloco = 1;
      var celular = window.matchMedia('(max-width: 767px)').matches;
      var toque = window.matchMedia('(hover: none)').matches;
      var semMouse = reduzido || toque;
      var S = { P: 0, entra: reduzido ? 1 : 0 };
      var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, k: 0, v: 0, alvo: 0, nx: 0, ny: 0, sx: 0, sy: 0, px: 0, py: 0, vel: 0 };
      var W = 1, H = 1, M = 20, G = 24, Lx = {}, R = {}, linhasDef = [];
      var COR_A = [243, 243, 240], COR_Y = [242, 194, 48];

      // roteiro: [início, fim] de cada etapa na rolagem do pin (0 a 1)
      var T = celular ? {
        morph: [0.02, 0.15], dis: [0.10, 0.25], brd: [0.21, 0.27], fill: [0.23, 0.30], out: [0.25, 0.31], lin: [0.25, 0.34], leg: [0.30, 0.37],
        gOut: [0.43, 0.49], bl: [0.47, 0.56], bs: [0.62, 0.65], fs: [0.64, 0.70], cj: [0.69, 0.73], cjOut: [0.76, 0.775],
        col: [0.775, 0.80], cc: [0.79, 0.83], ccOut: [0.855, 0.865], pass: [0.865, 0.97]
      } : {
        morph: [0.02, 0.16], dis: [0.11, 0.28], brd: [0.24, 0.30], fill: [0.27, 0.34], out: [0.28, 0.34], lin: [0.28, 0.38], leg: [0.34, 0.42],
        bl: [0.27, 0.41], gOut: [0.52, 0.58], bs: [0.52, 0.56], fs: [0.55, 0.65], cj: [0.59, 0.64], cjOut: [0.715, 0.73],
        col: [0.73, 0.765], cc: [0.765, 0.80], ccOut: [0.85, 0.865], pass: [0.865, 0.97]
      };
      // v14 volta 3: o capítulo 1 sobe por trás do amarelo; quando a fusão termina (T.pass[1]) o título já está a 42% da tela
      // e, no fim do pin, ainda abaixo do menu (fim curto: 3% do pin)
      var PIN = celular ? 8 : 7, Y_TIT = 0.42;
      function seg(k, d0, d1) { var a = T[k][0] + (d0 || 0), b = (d1 != null ? T[k][0] + d1 : T[k][1]); return clamp01((S.P - a) / (b - a)); }

      // ---------- grade única: 12 colunas (4 no celular), margens iguais ----------
      function X(c) { return M + c * (Lx.cw + G); }
      function L(s) { return s * Lx.cw + (s - 1) * G; }
      function caixa(el, r) { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; if (r.h != null) el.style.height = r.h + 'px'; }
      function altura(el, w) { el.style.width = w + 'px'; return el.offsetHeight; }

      function medir() {
        W = palco.clientWidth; H = palco.clientHeight;
        M = Math.max(20, Math.min(72, W * 0.0445)); G = celular ? 12 : 24;
        var n = celular ? 4 : 12; Lx.cw = (W - 2 * M - (n - 1) * G) / n;
        var top0, fim, gap, r1, r2, r3, y2, y3;
        if (!celular) {
          top0 = Math.max(96, 62 + M * 0.6); fim = H - M * 0.75; gap = 28;
          var c1 = Math.max(altura(LEG.janela, L(5)), altura(LEG.recall, L(2)));
          var c2 = Math.max(altura(LEG.sofa, L(2)), altura(LEG.bbb, L(3)));
          var av = fim - top0 - c1 - c2 - gap; r1 = av * 0.58; r2 = av - r1; y2 = top0 + r1 + c1 + gap;
          R.janela = { x: X(5), y: top0, w: L(5), h: r1 };
          R.recall = { x: X(10), y: top0, w: L(2), h: r1 };
          R.sofa = { x: X(5), y: y2, w: L(2), h: r2 };
          R.bbb = { x: X(7), y: y2, w: L(3), h: r2 };
          R.n60 = { x: X(10), y: y2, w: L(2) };
          var bw = Math.min(L(4), 470), bh = altura(bloco, bw);
          caixa(bloco, { x: M, y: Math.max(top0, y2 + r2 - bh), w: bw }); // a base dos pilares alinha com a base da segunda fileira
          var hj = altura(CARD.cJanela, L(5)), hc = altura(CARD.cColetiva, L(4));
          R.cJanela = { x: X(7), y: H - M - hj, w: L(5) };
          R.cColetiva = { x: M, y: H - M - hc, w: L(4) };
          // guias: nível no topo de cada fileira, prumo nas bordas das molduras
          var xa = X(5) - G, xb = W - M * 0.5, ya = top0 - 20, yb = H - M * 0.5;
          linhasDef = [[xa, top0, xb, top0], [xa, y2, xb, y2], [X(5), ya, X(5), yb], [X(7) - G, ya, X(7) - G, yb], [X(10) - G, ya, X(10) - G, yb], [W - M, ya, W - M, yb]];
        } else {
          top0 = 68; fim = H - 20; gap = 16;
          var m1 = altura(LEG.janela, L(4)), m2 = Math.max(altura(LEG.sofa, L(2)), altura(LEG.recall, L(2))), m3 = Math.max(altura(LEG.bbb, L(2)), altura(LEG.n60, L(2)));
          var avm = fim - top0 - m1 - m2 - m3 - 2 * gap; r1 = avm * 0.40; r2 = avm * 0.38; r3 = avm - r1 - r2;
          y2 = top0 + r1 + m1 + gap; y3 = y2 + r2 + m2 + gap;
          R.janela = { x: X(0), y: top0, w: L(4), h: r1 };
          R.sofa = { x: X(0), y: y2, w: L(2), h: r2 };
          R.recall = { x: X(2), y: y2, w: L(2), h: r2 };
          R.bbb = { x: X(0), y: y3, w: L(2), h: r3 };
          R.n60 = { x: X(2), y: y3, w: L(2) };
          var bwm = L(4), bhm = altura(bloco, bwm);
          caixa(bloco, { x: M, y: 64 + (H - 84 - bhm) / 2, w: bwm });
          var hjm = altura(CARD.cJanela, L(4)), hcm = altura(CARD.cColetiva, L(4));
          R.cJanela = { x: M, y: H - 20 - hjm, w: L(4) };
          R.cColetiva = { x: M, y: H - 20 - hcm, w: L(4) };
          var xam = M * 0.5, xbm = W - M * 0.5, yam = top0 - 12, ybm = H - 10;
          linhasDef = [[xam, top0, xbm, top0], [xam, y2, xbm, y2], [xam, y3, xbm, y3], [M, yam, M, ybm], [X(2) - G, yam, X(2) - G, ybm], [W - M, yam, W - M, ybm]];
        }
        R.cheia = { x: 0, y: 0, w: W, h: H };
        ['janela', 'recall', 'sofa', 'bbb'].forEach(function (k) {
          caixa(F[k], R[k]);
          var r = R[k]; caixa(LEG[k], { x: r.x, y: r.y + r.h, w: r.w });
        });
        caixa(LEG.n60, R.n60);
        caixa(F.coletiva, R.cheia);
        caixa(CARD.cJanela, R.cJanela); caixa(CARD.cColetiva, R.cColetiva);
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        linhasDef.forEach(function (l) {
          var e = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          e.setAttribute('x1', l[0].toFixed(1)); e.setAttribute('y1', l[1].toFixed(1)); e.setAttribute('x2', l[2].toFixed(1)); e.setAttribute('y2', l[3].toFixed(1));
          e.setAttribute('pathLength', '1'); svg.appendChild(e);
        });
        dividirBio();
        if (motor) motor.medir();
        ultimo = {};
      }

      // bio em linhas: cada palavra recebe o índice da sua linha (--i) e entra com ela; o &nbsp; fica dentro da palavra
      function dividirBio() {
        if (!bio.querySelector('.am3-l')) {
          bio.innerHTML = bio.textContent.trim().split(/[ \t\r\n]+/).map(function (w) { return '<span class="am3-l">' + w + '</span>'; }).join(' ');
        }
        var i = 0, topoAnt = null;
        root.querySelectorAll('.am3-rotulo, .am3-b-titulo, .am3-bio, .am3-pilares li').forEach(function (el) {
          if (el === bio) {
            topoAnt = null;
            bio.querySelectorAll('.am3-l').forEach(function (s) {
              if (topoAnt !== null && Math.abs(s.offsetTop - topoAnt) > 4) i++;
              if (topoAnt === null || Math.abs(s.offsetTop - topoAnt) > 4) topoAnt = s.offsetTop;
              s.style.setProperty('--i', i);
            });
            i++;
          } else { el.style.setProperty('--i', i); i++; }
        });
        nBloco = i;
      }

      // ---------- alvos: tinta do título, nuvem de poeira, perímetro das molduras ----------
      function alvos(n) {
        var px = tintaDoTitulo(titulo, palco), nInk = px.length / 2;
        if (!nInk) return null;
        var idx = new Uint32Array(nInk), i, k;
        for (i = 0; i < nInk; i++) idx[i] = i;
        for (i = nInk - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
        var tx = new Float32Array(n), ty = new Float32Array(n), dx = new Float32Array(n), dy = new Float32Array(n), fx = new Float32Array(n), fy = new Float32Array(n);
        for (i = 0; i < n; i++) { var a = idx[i % nInk]; tx[i] = px[a * 2] + Math.random() - 0.5; ty[i] = px[a * 2 + 1] + Math.random() - 0.5; }
        // poeira: nuvem entre o título e a obra
        var cx = celular ? W * 0.5 : W * 0.56, cy = celular ? H * 0.44 : H * 0.5, sx = celular ? W * 0.34 : W * 0.2, sy = H * (celular ? 0.15 : 0.17);
        for (i = 0; i < n; i++) { dx[i] = cx + gauss() * sx; dy[i] = cy + gauss() * sy; }
        // perímetro das molduras e o fio amarelo do número sem foto
        var segs = [];
        ['janela', 'recall', 'sofa', 'bbb'].forEach(function (key) {
          var b = R[key];
          segs.push([b.x, b.y, b.x + b.w, b.y], [b.x + b.w, b.y, b.x + b.w, b.y + b.h], [b.x + b.w, b.y + b.h, b.x, b.y + b.h], [b.x, b.y + b.h, b.x, b.y]);
        });
        var nSeg = segs.length; segs.push([R.n60.x, R.n60.y, R.n60.x + R.n60.w, R.n60.y]);
        var comp = segs.map(function (s) { return Math.hypot(s[2] - s[0], s[3] - s[1]); }), tot = comp.reduce(function (p, q) { return p + q; }, 0);
        var amarelo = new Uint8Array(n);
        for (i = 0; i < n; i++) {
          var r0 = Math.random() * tot, q = 0; while (q < segs.length - 1 && r0 > comp[q]) { r0 -= comp[q]; q++; }
          var s = segs[q], u = r0 / comp[q];
          fx[i] = lerp(s[0], s[2], u); fy[i] = lerp(s[1], s[3], u);
          amarelo[i] = (q >= nSeg || Math.random() < 0.04) ? 1 : 0;
        }
        // pareamento por coluna: letras da esquerda vão para a poeira da esquerda e para as molduras da esquerda
        function ordem(xs, ruido) { var o = new Array(n), kk = new Float32Array(n); for (var z = 0; z < n; z++) { o[z] = z; kk[z] = xs[z] / W + (Math.random() - 0.5) * ruido; } o.sort(function (p, q) { return kk[p] - kk[q]; }); return o; }
        var oT = ordem(tx, 0.06), oD = ordem(dx, 0.1), oF = ordem(fx, 0.2);
        var out = { n: n, text: new Float32Array(n * 2), dust: new Float32Array(n * 2), frame: new Float32Array(n * 2), info: new Float32Array(n * 4) };
        for (k = 0; k < n; k++) {
          var t = oT[k], d = oD[k], f = oF[k];
          out.text[k * 2] = tx[t]; out.text[k * 2 + 1] = ty[t];
          out.dust[k * 2] = dx[d]; out.dust[k * 2 + 1] = dy[d];
          out.frame[k * 2] = fx[f]; out.frame[k * 2 + 1] = fy[f];
          out.info[k * 4] = 0.7 * (k / n) + 0.3 * Math.random();       // a desmontagem varre da esquerda para a direita
          out.info[k * 4 + 1] = 0.4 * (k / n) + 0.6 * Math.random();
          out.info[k * 4 + 2] = Math.random();
          out.info[k * 4 + 3] = amarelo[f];
        }
        return out;
      }

      // estado dos uniforms a cada quadro (o mesmo para os dois motores)
      var Uq = { time: 0, morph: 0, dis: 0, out: 0, fade: 0, size: 2, breath: 0, swirl: 0, mx: -9999, my: -9999, mk: 0, rad: 180, push: 34 };

      // ---------- motor WebGL ----------
      function motorGL() {
        if (!window.THREE || !window.WebGLRenderingContext) return null;
        var renderer, cam, cena, pts, U;
        try { renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: false, alpha: true, powerPreference: 'high-performance' }); }
        catch (e) { return null; }
        if (!renderer.getContext()) return null;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        cena = new THREE.Scene(); cam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
        return {
          tipo: 'gl',
          medir: function () { renderer.setSize(W, H, false); cam.right = W; cam.bottom = H; cam.updateProjectionMatrix(); },
          dados: function (d) {
            if (pts) { cena.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.n * 3), 3));
            g.setAttribute('aText', new THREE.BufferAttribute(d.text, 2));
            g.setAttribute('aDust', new THREE.BufferAttribute(d.dust, 2));
            g.setAttribute('aFrame', new THREE.BufferAttribute(d.frame, 2));
            g.setAttribute('aInfo', new THREE.BufferAttribute(d.info, 4));
            U = {};
            ['uTime', 'uMorph', 'uDis', 'uOut', 'uFade', 'uSize', 'uBreath', 'uSwirl', 'uMouseK', 'uRad', 'uPush'].forEach(function (k) { U[k] = { value: 0 }; });
            U.uMouse = { value: new THREE.Vector2() };
            U.uColA = { value: new THREE.Vector3(COR_A[0] / 255, COR_A[1] / 255, COR_A[2] / 255) };
            U.uColY = { value: new THREE.Vector3(COR_Y[0] / 255, COR_Y[1] / 255, COR_Y[2] / 255) };
            pts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthTest: false, depthWrite: false }));
            pts.frustumCulled = false; cena.add(pts);
          },
          quadro: function (q, ativo) {
            if (!U) return;
            var dpr = renderer.getPixelRatio();
            U.uTime.value = q.time; U.uMorph.value = q.morph; U.uDis.value = q.dis; U.uOut.value = q.out; U.uFade.value = q.fade;
            U.uSize.value = q.size * dpr; U.uBreath.value = q.breath; U.uSwirl.value = q.swirl;
            U.uMouse.value.set(q.mx, q.my); U.uMouseK.value = q.mk; U.uRad.value = q.rad; U.uPush.value = q.push;
            if (ativo) renderer.render(cena, cam); else renderer.clear();
          },
          destruir: function () { if (pts) { pts.geometry.dispose(); pts.material.dispose(); } renderer.dispose(); }
        };
      }

      // ---------- motor canvas 2D (sem WebGL): a mesma conta do shader, no processador ----------
      function motor2D() {
        var g = tela.getContext('2d'); if (!g) return null;
        var dd = null, dpr = Math.min(window.devicePixelRatio || 1, 2);
        function sm(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
        return {
          tipo: '2d',
          medir: function () { tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr); },
          dados: function (d) { dd = d; },
          quadro: function (q, ativo) {
            g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, tela.width, tela.height);
            if (!dd || !ativo) return;
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            var n = dd.n, T1 = dd.text, D1 = dd.dust, F1 = dd.frame, I = dd.info, a = q.fade * (1 - q.out);
            if (a <= 0.01) return;
            var cA = 'rgba(' + COR_A.join(',') + ',', cY = 'rgba(' + COR_Y.join(',') + ',';
            for (var i = 0; i < n; i++) {
              var d1 = I[i * 4], d2 = I[i * 4 + 1], sd = I[i * 4 + 2];
              var tx = T1[i * 2] + Math.sin(q.time * 0.9 + sd * 40) * q.breath, ty = T1[i * 2 + 1] + Math.cos(q.time * 0.8 + sd * 33) * q.breath;
              var a1 = sd * 6.2832 + q.time * (0.15 + 0.35 * hash(sd * 7)), sw = q.swirl * (0.4 + hash(sd * 3));
              var ux = D1[i * 2] + Math.cos(a1) * sw, uy = D1[i * 2 + 1] + Math.sin(a1) * sw;
              var e1 = sm((q.morph - d1 * 0.5) / 0.5), vx = ux - tx, vy = uy - ty, k1 = (hash(sd * 3.1) - 0.5) * 0.6;
              var cx = (tx + ux) / 2 - vy * k1, cy = (ty + uy) / 2 + vx * k1;
              var px = lerp(lerp(tx, cx, e1), lerp(cx, ux, e1), e1), py = lerp(lerp(ty, cy, e1), lerp(cy, uy, e1), e1);
              var e2 = sm((q.dis - d2 * 0.45) / 0.55), wx = F1[i * 2] - px, wy = F1[i * 2 + 1] - py, k2 = (hash(sd * 9) - 0.5) * 0.35;
              var c2x = px + wx / 2 - wy * k2, c2y = py + wy / 2 + wx * k2;
              px = lerp(lerp(px, c2x, e2), lerp(c2x, F1[i * 2], e2), e2); py = lerp(lerp(py, c2y, e2), lerp(c2y, F1[i * 2 + 1], e2), e2);
              var fm = 0;
              if (q.mk > 0) {
                var mx = px - q.mx, my = py - q.my, r = Math.hypot(mx, my); fm = q.mk * (1 - sm(r / q.rad));
                if (fm > 0) { var lado = hash(sd * 13) * 6.2832, f = fm * q.push * (0.5 + hash(sd * 11)); px += (mx / (r + 1e-4) * 0.75 + Math.cos(lado) * 0.45) * f; py += (my / (r + 1e-4) * 0.75 + Math.sin(lado) * 0.45) * f; }
              }
              var po = e1 * (1 - e2), s = q.size * (1 - 0.3 * po) * (1 + 0.4 * fm);
              g.fillStyle = (I[i * 4 + 3] ? cY : cA) + (a * (0.8 + 0.2 * hash(sd * 21)) * (1 - 0.3 * po)).toFixed(3) + ')';
              g.fillRect(px - s / 2, py - s / 2, s, s);
            }
          },
          destruir: function () {}
        };
      }

      motor = (/[?&]motor=2d/.test(location.search) ? null : motorGL()) || motor2D();
      if (!motor) { final(); return; }
      root.dataset.motor = motor.tipo;

      var fontes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px Newsreader'), document.fonts.load('400 12px "IBM Plex Mono"'), document.fonts.ready]) : Promise.resolve();
      fontes.then(function () { if (vivo) self.add(comecar); }).catch(function (e) { console.warn('abertura malha:', e); final(); });

      function nPontos() { return motor.tipo === '2d' ? (celular ? 2500 : 5000) : (celular ? 7000 : 18000); }

      function comecar() {
        medir();
        D = alvos(nPontos());
        if (!D) { final(); return; }
        motor.dados(D);
        root.dataset.pontos = D.n;
        topoAzul = topo.cloneNode(true); topoAzul.classList.add('am3-topo--azul'); topoAzul.setAttribute('aria-hidden', 'true');
        topoAzul.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
        topo.after(topoAzul);
        gsap.ticker.add(quadro);
        root.classList.add('am3-pontos'); // o HTML do título dá lugar aos pontos, que nascem sobre as letras
        if (!reduzido) gsap.to(S, { entra: 1, duration: 0.6, ease: 'power1.out' });
        setTimeout(carregaFotos, 500);
        var tl = gsap.to(S, { P: 1, ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: '+=' + PIN * 100 + '%', scrub: 0.6, pin: palco, anticipatePin: 1 } });
        root._am3tl = tl;
        root.classList.add('am3-pin'); // só com o pin criado o capítulo 1 pode subir sobre o fim dele
        encaixaC01();
        ScrollTrigger.addEventListener('refreshInit', encaixaC01);
        ScrollTrigger.addEventListener('refresh', function () {
          if (!vivo) return; medir(); var d = alvos(nPontos()); if (d) { D = d; motor.dados(D); }
        });
        new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; }).observe(palco);
      }

      // capítulo 1 sobre o fim do pin: o topo dele (até onde a tela alcança no fim da fusão) fica sem fundo, sempre sobre o palco,
      // e o título chega a Y_TIT da tela no instante em que o amarelo cobre tudo. Nenhuma tela amarela vazia.
      function encaixaC01() {
        var c01 = root.nextElementSibling, tit = c01 && c01.querySelector('#c01-titulo');
        if (!tit || !c01.classList.contains('c01')) return;
        var vh = window.innerHeight, pin = PIN * vh, t = tit.getBoundingClientRect().top - c01.getBoundingClientRect().top;
        var a = t + vh * (1 - Y_TIT), o = a + pin * (1 - T.pass[1]);
        c01.style.setProperty('--am3-o', Math.round(o) + 'px');
        c01.style.setProperty('--am3-a', Math.round(a) + 'px');
      }

      // ---------- mouse / toque: repulsão nos pontos (e parallax leve da obra no computador) ----------
      function aponta(cx, cy) {
        var pr = palco.getBoundingClientRect(), x = cx - pr.left, y = cy - pr.top;
        if (y < 0 || y > pr.height) { mouse.alvo = 0; return; }
        mouse.tx = x; mouse.ty = y; mouse.nx = x / pr.width * 2 - 1; mouse.ny = y / pr.height * 2 - 1; mouse.alvo = 1;
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
      function rect(el, k, r) {
        css(el, 'left|' + k, r.x.toFixed(1) + 'px'); css(el, 'top|' + k, r.y.toFixed(1) + 'px');
        css(el, 'width|' + k, r.w.toFixed(1) + 'px'); css(el, 'height|' + k, r.h.toFixed(1) + 'px');
      }

      function quadro(time, dtMs) {
        if (!D || !visivel) return;
        var dt = Math.min(0.05, (dtMs || 16) / 1000), P = S.P;

        // energia do cursor vem da velocidade; parado, a mola devolve cada ponto ao lugar
        var vel = Math.hypot(mouse.tx - mouse.px, mouse.ty - mouse.py) / dt;
        mouse.px = mouse.tx; mouse.py = mouse.ty;
        mouse.vel += (vel - mouse.vel) * 0.25;
        var energia = (mouse.alvo && mouse.vel > 2 && mouse.vel < 1e5) ? Math.min(1, 0.45 + mouse.vel / 1600) : 0;
        var sobe = energia > mouse.k;
        mouse.v += ((energia - mouse.k) * (sobe ? 160 : 20) - mouse.v * (sobe ? 20 : 6.5)) * dt;
        mouse.k = Math.max(0, Math.min(1.15, mouse.k + mouse.v * dt));
        var l = 1 - Math.pow(0.02, dt);
        if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
        mouse.x += (mouse.tx - mouse.x) * l; mouse.y += (mouse.ty - mouse.y) * l;
        mouse.sx += (mouse.nx - mouse.sx) * l * 0.6; mouse.sy += (mouse.ny - mouse.sy) * l * 0.6;

        // pontos
        var out = seg('out');
        Uq.time = reduzido ? 0 : time; Uq.morph = seg('morph'); Uq.dis = seg('dis'); Uq.out = out; Uq.fade = S.entra;
        Uq.size = celular ? 1.7 : 1.8; Uq.breath = reduzido ? 0 : 0.7; Uq.swirl = reduzido ? 0 : (celular ? 10 : 16);
        Uq.mx = mouse.x; Uq.my = mouse.y; Uq.mk = reduzido ? 0 : mouse.k; Uq.rad = celular ? 110 : 180; Uq.push = celular ? 22 : 34;
        motor.quadro(Uq, out < 1);

        css(role, 'opacity|role', String(0.65 * (1 - clamp01(P / 0.03))));
        css(root, '--am3-bl', (seg('bl') * (nBloco + 0.6)).toFixed(3));
        css(root, '--am3-bs', seg('bs').toFixed(3));
        var ativa = P > T.brd[0] - 0.01;
        css(cenaEl, 'visibility|cena', ativa ? 'visible' : 'hidden');
        if (ativa) {
          // a obra: parallax leve do mouse e deriva com a rolagem, iguais para todas as peças (a grade nunca desalinha)
          var gOut = seg('gOut'), fs = suave(seg('fs'));
          var ox = semMouse || celular ? 0 : -mouse.sx * 10, oy = (semMouse || celular ? 0 : -mouse.sy * 6) - clamp01((P - T.leg[0]) / 0.2) * H * 0.012;
          if (celular) oy += suave(gOut) * H * 0.03; // desce ao sair: nunca sobe para o menu
          var gT = 'translate3d(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px,0)', gA = (1 - gOut).toFixed(3);
          css(svg, 'transform|svg', gT); css(svg, 'opacity|svg', gA);
          [].forEach.call(svg.children, function (ln, i) { css(ln, 'stroke-dashoffset|g' + i, (1 - suave(seg('lin', i * 0.012, i * 0.012 + 0.06))).toFixed(3)); });
          var ords = ['janela', 'recall', 'sofa', 'bbb'];
          ords.forEach(function (k, i) {
            var el = F[k], fe = suave(seg('fill', i * 0.018, i * 0.018 + 0.05)), be = seg('brd', i * 0.012, i * 0.012 + 0.04);
            css(el, '--brd|' + k, (be * (1 - fe)).toFixed(3));
            css(el, '--fill|' + k, ((1 - fe) * 100).toFixed(2) + '%');
            if (k === 'janela') {
              var r = R.janela;
              if (!celular) {
                var g = { x: r.x + ox, y: r.y + oy, w: r.w, h: r.h };
                rect(el, k, { x: lerp(g.x, 0, fs), y: lerp(g.y, 0, fs), w: lerp(g.w, W, fs), h: lerp(g.h, H, fs) });
                css(el, 'opacity|' + k, (1 - clamp01(suave(seg('col')) * 2)).toFixed(3)); css(el, 'clip-path|' + k, 'none');
              } else if (P < T.fs[0]) {
                rect(el, k, r); css(el, 'transform|' + k, gT); css(el, 'opacity|' + k, gA); css(el, 'clip-path|' + k, 'none');
              } else {
                // celular: a tela cheia entra e sai pelo escuro, não por cortina; uma borda correndo pela foto cortaria o rosto
                // e as duas fotos nunca se sobrepõem (sai a janela na 1ª metade da troca, entra a coletiva na 2ª)
                var some = clamp01(suave(seg('col')) * 2);
                rect(el, k, R.cheia); css(el, 'transform|' + k, 'none'); css(el, 'opacity|' + k, (fs * (1 - some)).toFixed(3));
                css(el, 'clip-path|' + k, 'none');
              }
              el.classList.toggle('is-cheia', P >= T.fs[0]);
              // tela cheia: a foto passa da borda em 8% para o parallax de rolagem; nunca escala
              var cheio = P >= T.fs[0] ? 1 : 0;
              css(el, '--px|' + k, (cheio * H * 0.08).toFixed(1) + 'px');
              css(el, '--py|' + k, (-cheio * clamp01((P - T.fs[0]) / (T.col[1] - T.fs[0])) * H * 0.08).toFixed(1) + 'px');
            } else {
              css(el, 'transform|' + k, gT); css(el, 'opacity|' + k, gA);
            }
          });
          var legs = ['janela', 'recall', 'sofa', 'bbb', 'n60'];
          legs.forEach(function (k, i) {
            var e = suave(seg('leg', i * 0.012, i * 0.012 + 0.04));
            css(LEG[k], 'opacity|L' + k, (e * (1 - gOut)).toFixed(3));
            css(LEG[k], 'transform|L' + k, 'translate3d(' + ox.toFixed(1) + 'px,' + (oy + (1 - e) * 14).toFixed(1) + 'px,0)');
          });
          // cartões sobre as fotos em tela cheia, linha a linha
          [['cJanela', 'cj', 'cjOut'], ['cColetiva', 'cc', 'ccOut']].forEach(function (c) {
            var el = CARD[c[0]], sai = seg(c[2]), base = seg(c[1]);
            css(el, 'opacity|C' + c[0], (base > 0 ? 1 - sai : 0).toFixed(3));
            [].forEach.call(el.children, function (ch, j) {
              css(ch, '--k|C' + c[0] + j, suave(seg(c[1], j * 0.012, j * 0.012 + 0.03)).toFixed(3));
            });
          });
          // coletiva sobe por cortina sobre a janela
          var ce = suave(seg('col'));
          // troca pelo escuro, não por cortina: a borda de uma cortina corta o rosto; sai a janela, depois entra a coletiva
          css(F.coletiva, 'clip-path|col', 'none');
          css(F.coletiva, 'opacity|col', clamp01(ce * 2 - 1).toFixed(3));
          css(F.coletiva, '--fill|C', '0%');
          css(F.coletiva, '--px|C', (H * 0.08).toFixed(1) + 'px');
          css(F.coletiva, '--py|C', (-clamp01((P - T.col[0]) / (1 - T.col[0])) * H * 0.08).toFixed(1) + 'px');
          css(F.coletiva, 'visibility|col', ce > 0 ? 'visible' : 'hidden');
        }
        var ps = Math.pow(1 - seg('pass'), 2); // sai rápido do escuro: o título que sobe já encontra amarelo, não a foto
        // faixa chapada em grafite atrás do menu desde que a janela começa a crescer (céu claro, cabelo) até o amarelo;
        // some junto com a entrada do amarelo, quando o menu azul assume. Branco sobre #111315: 17:1
        var faixa = P >= T.fs[0] ? ps : 0;
        css(topo, 'background-color|topo', faixa > 0 ? 'rgba(17,19,21,' + faixa.toFixed(3) + ')' : 'transparent');
        // o amarelo entra por fusão (uma borda subindo cruzaria o rosto da coletiva)
        css(passagem, 'opacity|pass', (1 - ps).toFixed(3));
        if (topoAzul) { css(topoAzul, 'clip-path|azul', 'none'); css(topoAzul, 'opacity|azul', (1 - ps).toFixed(3)); }
        css(root, '--am3-fundo|root', P > T.pass[1] ? '#F2C230' : '#111315');
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
