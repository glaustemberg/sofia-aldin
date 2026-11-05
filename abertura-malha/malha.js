/* Abertura opção 3 · texto de impacto em pontos que se desmonta e monta o rosto real da Sofia,
   bloco de texto à esquerda, cena de fotos em camadas com parallax e passagem para o amarelo.
   Alvos do rosto pré-calculados: rosto-pontos.bin / rosto-pontos-celular.bin (ferramentas/gerar-pontos.py).
   Expõe window.initAberturaMalha(root) -> gsap.context; marca root._am3tl quando o pin existe. */
(function () {
  'use strict';

  var BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/[^\/]*$/, '');

  // ---------- shader: um único Points, morph texto -> rosto -> poeira ----------
  var VERT = [
    'attribute vec3 aText; attribute vec4 aInfo; attribute vec2 aFrame;', // brilho, poeira, atraso, semente
    'uniform float uTime, uMorph, uDis, uFade, uSize, uSizeF, uEsc, uBreath, uAmp;',
    'uniform vec2 uFaceC; uniform float uFaceS; uniform mat3 uRot;',
    'uniform vec2 uMouse; uniform float uMouseK, uRad, uPush;',
    'uniform vec3 uColA, uColB;',
    'varying float vA; varying vec3 vC; varying float vE;',
    'float h(float n){ return fract(sin(n) * 43758.5453); }',
    'void main(){',
    '  float br = aInfo.x, du = aInfo.y, dl = aInfo.z, sd = aInfo.w;',
    '  vec3 f = uRot * position * uFaceS; f.xy += uFaceC;',
    '  float a1 = sd * 6.2832 + uTime * (0.12 + 0.3 * h(sd * 7.0));',
    '  f.xy += du * vec2(cos(a1), sin(a1)) * 0.04 * uFaceS;',          // contorno vira poeira que se move
    '  f.z += sin(uTime * 0.7 + sd * 30.0) * 0.015 * uFaceS;',
    '  vec3 tx = aText;',
    '  tx.xy += vec2(sin(uTime * 0.9 + sd * 40.0), cos(uTime * 0.8 + sd * 33.0)) * uBreath;',
    '  float t = clamp((uMorph - dl * 0.55) / 0.45, 0.0, 1.0);',
    '  float e = t * t * (3.0 - 2.0 * t);',
    // trajetória curva (Bézier quadrática): cada ponto viaja visível do texto ao rosto, sem neblina
    '  vec2 dv = f.xy - tx.xy; vec2 nv = vec2(-dv.y, dv.x);',
    '  vec3 c1 = vec3((tx.xy + f.xy) * 0.5 + nv * (h(sd * 3.1) - 0.5) * 0.8, uAmp * (h(sd * 5.7) - 0.3) * 1.2);',
    '  vec3 p = mix(mix(tx, c1, e), mix(c1, f, e), e);',
    '  float fly = sin(3.14159 * t);',
    '  float d = clamp((uDis - dl * 0.45) / 0.55, 0.0, 1.0); float de = d * d * (3.0 - 2.0 * d);',
    // a poeira do rosto escorre até as molduras das fotos
    '  vec2 dw = aFrame - p.xy;',
    '  vec3 c2 = vec3(p.xy + dw * 0.5 + vec2(-dw.y, dw.x) * (h(sd * 9.0) - 0.5) * 0.4, p.z + uAmp * h(sd * 2.3));',
    '  vec3 fr = vec3(aFrame, 0.0);',
    '  p = mix(mix(p, c2, de), mix(c2, fr, de), de);',
    '  vec2 dm = p.xy - uMouse; float r = length(dm);',
    '  float fm = uMouseK * (1.0 - smoothstep(0.0, uRad, r));',
    '  float lado = h(sd * 13.0) * 6.2832;',
    '  p.xy += (dm / (r + 1e-4) * 0.75 + vec2(cos(lado), sin(lado)) * 0.45) * fm * uPush * (0.5 + h(sd * 11.0));',
    '  p.z += fm * uPush * (0.3 + h(sd * 17.0));',
    '  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);',
    '  float b = mix(0.78 + 0.22 * h(sd * 21.0), br, e);',
    '  gl_PointSize = mix(uSize, uSizeF * (0.75 + 0.3 * br) * sqrt(uEsc), e) * (1.0 + 0.4 * fm) * (1.0 - 0.3 * de);',
    '  vE = e;',
    '  vA = min(1.0, mix(b * 1.1, br * 1.2 * pow(uEsc, 0.6), e)) * uFade * (1.0 - smoothstep(0.82, 1.0, d)) * (1.0 - 0.12 * fly);',
    '  vC = mix(uColA, uColB, b);',
    '}'
  ].join('\n');
  var FRAG = [
    'varying float vA; varying vec3 vC; varying float vE;',
    // texto: disco nítido; rosto: borda macia, para o tom integrar a 1:1 sem granulado
    'void main(){ vec2 c = gl_PointCoord - 0.5; float a = vA * (1.0 - smoothstep(mix(0.4, 0.2, vE), 0.5, length(c)));',
    '  if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }'
  ].join('\n');

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

  function lerRosto(buf) {
    var n = new Uint32Array(buf, 0, 1)[0], q = new Int16Array(buf, 4, n * 3);
    var br = new Uint8Array(buf, 4 + n * 6, n), du = new Uint8Array(buf, 4 + n * 7, n);
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n * 3; i++) pos[i] = q[i] / 16000;
    return { n: n, pos: pos, br: br, du: du };
  }

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
        // palavra pode quebrar no &nbsp;: desenha cada pedaço no seu retângulo
        if (rects.length === 1) desenha(m[0], rects[0]);
        else for (var k = 0; k < m[0].length; k++) {
          var r1 = document.createRange(); r1.setStart(no, m.index + k); r1.setEnd(no, m.index + k + 1);
          var rc = r1.getClientRects()[0]; if (rc) desenha(m[0][k], rc);
        }
      }
    }
    function desenha(txt, rc) {
      var mt = g.measureText(txt), asc = mt.fontBoundingBoxAscent || parseFloat(st.fontSize) * 0.86;
      var desc = mt.fontBoundingBoxDescent || parseFloat(st.fontSize) * 0.26;
      g.fillText(txt, rc.left - x0, rc.top - y0 + (rc.height - asc - desc) / 2 + asc);
    }
    var d = g.getImageData(0, 0, W, H).data, out = [];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 128) out.push(x + x0 - pr.left, y + y0 - pr.top);
    return { px: out, x0: x0 - pr.left, w: W };
  }

  window.initAberturaMalha = function (root) {
    var palco = root.querySelector('.am3-palco');
    var tela = root.querySelector('.am3-tela');
    var titulo = root.querySelector('.am3-titulo');
    var cenaEl = root.querySelector('.am3-cena');
    var figs = [].slice.call(root.querySelectorAll('.am3-f'));
    var nums = [].slice.call(root.querySelectorAll('.am3-n'));
    var svg = root.querySelector('.am3-linhas');
    var topo = root.querySelector('.am3-topo');
    var role = root.querySelector('.am3-role');
    var passagem = root.querySelector('.am3-passagem');
    var bio = root.querySelector('.am3-bio');
    var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function carregaFotos() {
      figs.forEach(function (f) { var im = f.querySelector('img'); if (!im.getAttribute('src')) { im.fetchPriority = 'low'; im.src = BASE + im.dataset.src; } });
    }

    // movimento reduzido ou sem WebGL: estado final de cada etapa, com o rosto em pontos como imagem estática
    function final() {
      root.classList.add('am3-final'); carregaFotos();
      var est = root.querySelector('.am3-estatico'); if (est && !est.getAttribute('src')) est.src = BASE + est.dataset.src;
    }

    gsap.registerPlugin(ScrollTrigger);

    return gsap.context(function (self) {
      if (reduzido || !window.WebGLRenderingContext) { final(); return; }

      var vivo = true, visivel = true, topoAzul, renderer, cena, camera, pts, U, rosto = null, nBloco = 1;
      var celular = window.matchMedia('(max-width: 767px)').matches;
      var toque = window.matchMedia('(hover: none)').matches;
      var S = { entra: 0, role: 0, morph: 0, shift: 0, bl: 0, bs: 0, dis: 0, cena: 0, linhas: 0, nums: 0, drift: 0, sai: 0, pass: 0, apaga: 0 };
      var mouse = { x: 0, y: 0, tx: 0, ty: 0, k: 0, v: 0, alvo: 0, nx: 0, ny: 0, sx: 0, sy: 0, px: 0, py: 0, vel: 0, rx: 0, ry: 0 };
      var W = 1, H = 1, K = 1, rostoA = {}, rostoB = {}, bases = [], baseNums = [];
      var FOV = 35, DIST = 10, visH = 2 * DIST * Math.tan(FOV * Math.PI / 360);
      var COR_A = new THREE.Color('#EDE4CF'), COR_B = new THREE.Color('#F3F3F0');
      var MARFIM = [243, 243, 240], AZUL = [20, 33, 61];
      var rot4 = new THREE.Matrix4(), eul = new THREE.Euler();

      function px2w(x, y) { return [(x - W / 2) * K, -(y - H / 2) * K]; }

      // ---------- linhas de estrutura (1 px) que ligam as fotos ----------
      // guias de 1 px pelas bordas das fotos, como prumo e nível de obra: [eixo, foto, canto, de, até (fração do palco)]
      // cantos: 0 sup-esq, 1 sup-dir, 2 inf-dir, 3 inf-esq
      var LIG = [
        ['h', 1, 0, 0.0, 1.0], ['v', 1, 0, 0.0, 1.0], ['h', 0, 3, 0.0, 0.62], ['v', 3, 1, 0.3, 1.0],
        ['h', 2, 3, 0.18, 0.86], ['v', 0, 1, 0.12, 0.8], ['h', 3, 0, 0.66, 1.0]
      ];
      var linhas = LIG.map(function () {
        var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('pathLength', '1'); svg.appendChild(l); return l;
      });

      function medir() {
        W = palco.clientWidth; H = palco.clientHeight; K = visH / H;
        if (renderer) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
        var a = celular ? [W * 0.5, H * 0.42, Math.min(W * 0.6, H * 0.32)] : [W * 0.5, H * 0.52, H * 0.32];
        var b = celular ? [W * 0.62, H * 0.24, Math.min(W * 0.4, H * 0.19)] : [W * 0.72, H * 0.52, H * 0.3];
        var ca = px2w(a[0], a[1]), cb = px2w(b[0], b[1]);
        rostoA = { x: ca[0], y: ca[1], s: a[2] * K }; rostoB = { x: cb[0], y: cb[1], s: b[2] * K };
        bases = figs.map(function (f) { return { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight, p: +f.dataset.p }; });
        baseNums = nums.map(function (n) { return { p: +n.dataset.p }; });
        dividirBio();
      }

      // bio em linhas: cada palavra recebe o índice da sua linha (--i) e entra com ela
      function dividirBio() {
        if (!bio.querySelector('.am3-l')) {
          bio.innerHTML = bio.textContent.trim().split(/\s+/).map(function (w) { return '<span class="am3-l">' + w + '</span>'; }).join(' ');
        }
        var i = 0, itens = root.querySelectorAll('.am3-rotulo, .am3-b-titulo, .am3-bio, .am3-pilares li');
        itens.forEach(function (el) {
          if (el === bio) {
            var topoAnt = null;
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

      // ---------- texto -> alvos ----------
      function alvosDoTexto() {
        if (!rosto) return;
        var t = tintaDoTitulo(titulo, palco), px = t.px, nInk = px.length / 2, n = rosto.n;
        if (!nInk) return;
        var aText = pts.geometry.attributes.aText.array, info = pts.geometry.attributes.aInfo.array;
        // amostra sem repetir enquanto houver tinta: embaralha os índices
        var idx = new Uint32Array(nInk); for (var i = 0; i < nInk; i++) idx[i] = i;
        for (i = nInk - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
        var tx = new Float32Array(n), ty = new Float32Array(n), ordT = new Array(n), ordF = new Array(n);
        for (i = 0; i < n; i++) {
          var a = idx[i % nInk];
          tx[i] = px[a * 2] + Math.random() - 0.5; ty[i] = px[a * 2 + 1] + Math.random() - 0.5;
          ordT[i] = i; ordF[i] = i;
        }
        // pareamento por coluna: letras da esquerda montam o lado esquerdo do rosto (fluxo coerente, sem cruzar tudo)
        var kT = new Float32Array(n), kF = new Float32Array(n);
        for (i = 0; i < n; i++) {
          kT[i] = (tx[i] - t.x0) / t.w + (Math.random() - 0.5) * 0.12;
          kF[i] = (rosto.pos[i * 3] + 1) / 2 + (Math.random() - 0.5) * 0.12;
        }
        ordT.sort(function (p, q) { return kT[p] - kT[q]; });
        ordF.sort(function (p, q) { return kF[p] - kF[q]; });
        for (var k = 0; k < n; k++) {
          var f = ordF[k], s = ordT[k], w = px2w(tx[s], ty[s]);
          aText[f * 3] = w[0]; aText[f * 3 + 1] = w[1]; aText[f * 3 + 2] = 0;
          info[f * 4 + 2] = 0.7 * (k / n) + 0.3 * Math.random(); // a desmontagem varre da esquerda para a direita
        }
        // perímetro das molduras na posição em que as fotos estão quando a poeira chega
        var aFr = pts.geometry.attributes.aFrame.array, per = bases.map(function (b) { return 2 * (b.w + b.h); });
        var tot = per.reduce(function (a, b) { return a + b; }, 0), fx = new Float32Array(n), fy = new Float32Array(n), ordP = new Array(n);
        for (i = 0; i < n; i++) {
          var r0 = Math.random() * tot, q = 0; while (q < bases.length - 1 && r0 > per[q]) { r0 -= per[q]; q++; }
          var b = bases[q], dyq = 0.12 * H * b.p, l = r0 / per[q] * 2 * (b.w + b.h), X, Y;
          if (l < b.w) { X = b.x + l; Y = b.y; } else if ((l -= b.w) < b.h) { X = b.x + b.w; Y = b.y + l; }
          else if ((l -= b.h) < b.w) { X = b.x + b.w - l; Y = b.y + b.h; } else { X = b.x; Y = b.y + b.h - (l - b.w); }
          fx[i] = X; fy[i] = Y + dyq; ordP[i] = i;
        }
        var kP = new Float32Array(n); for (i = 0; i < n; i++) kP[i] = fx[i] / W + (Math.random() - 0.5) * 0.2;
        ordP.sort(function (p, q) { return kP[p] - kP[q]; });
        for (k = 0; k < n; k++) { var wf = px2w(fx[ordP[k]], fy[ordP[k]]); aFr[ordF[k] * 2] = wf[0]; aFr[ordF[k] * 2 + 1] = wf[1]; }
        pts.geometry.attributes.aFrame.needsUpdate = true;
        pts.geometry.attributes.aText.needsUpdate = true;
        pts.geometry.attributes.aInfo.needsUpdate = true;
      }

      function montar(r) {
        rosto = r;
        var n = r.n, info = new Float32Array(n * 4);
        for (var i = 0; i < n; i++) { info[i * 4] = r.br[i] / 255; info[i * 4 + 1] = r.du[i] / 255; info[i * 4 + 2] = Math.random(); info[i * 4 + 3] = Math.random(); }
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
        g.setAttribute('aText', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
        g.setAttribute('aFrame', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
        U = {
          uTime: { value: 0 }, uMorph: { value: 0 }, uDis: { value: 0 }, uFade: { value: 0 }, uSize: { value: 2 }, uSizeF: { value: 2 }, uEsc: { value: 1 },
          uBreath: { value: 0.01 }, uAmp: { value: 0.1 },
          uFaceC: { value: new THREE.Vector2() }, uFaceS: { value: 1 }, uRot: { value: new THREE.Matrix3() },
          uMouse: { value: new THREE.Vector2() }, uMouseK: { value: 0 }, uRad: { value: 1 }, uPush: { value: 0.1 },
          uColA: { value: COR_A }, uColB: { value: COR_B }
        };
        pts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthTest: false, depthWrite: false }));
        pts.frustumCulled = false;
        cena.add(pts);
        root.dataset.pontos = n;
      }

      // ---------- arranque ----------
      renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      cena = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
      camera.position.set(0, 0, DIST);

      var dados = fetch(BASE + (celular ? 'rosto-pontos-celular.bin' : 'rosto-pontos.bin'))
        .then(function (r) { if (!r.ok) throw new Error('rosto ' + r.status); return r.arrayBuffer(); });
      var fontes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px Newsreader'), document.fonts.ready]) : Promise.resolve();
      Promise.all([dados, fontes])
        .then(function (res) { if (vivo) self.add(function () { comecar(lerRosto(res[0])); }); })
        .catch(function (e) { console.warn('abertura pontos:', e); final(); });

      function comecar(r) {
        medir();
        montar(r);
        alvosDoTexto();
        topoAzul = topo.cloneNode(true); topoAzul.classList.add('am3-topo--azul'); topoAzul.setAttribute('aria-hidden', 'true');
        topoAzul.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
        topo.after(topoAzul);
        gsap.ticker.add(quadro);
        // o HTML do título dá lugar aos pontos, que nascem exatamente sobre as letras
        root.classList.add('am3-pontos');
        gsap.to(S, { entra: 1, duration: 0.6, ease: 'power1.out' });
        setTimeout(carregaFotos, 600);

        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root, start: 'top top', end: '+=560%', scrub: 0.8, pin: palco, anticipatePin: 1 }
        });
        tl.to(S, { role: 1, duration: 0.03 }, 0)
          .to(S, { morph: 1, duration: 0.24 }, 0.02)                         // texto desmonta e monta o rosto
          .to(S, { shift: 1, duration: 0.12, ease: 'power2.inOut' }, 0.32)   // rosto vai para a direita
          .to(S, { bl: 1, duration: 0.15 }, 0.37)                            // bloco entra linha a linha
          .to(S, { bs: 1, duration: 0.05, ease: 'power1.in' }, 0.58)
          // no celular a poeira só sai depois que o bloco de texto saiu: nunca cruza a leitura
          .to(S, { dis: 1, duration: celular ? 0.1 : 0.13 }, celular ? 0.635 : 0.57) // rosto vira poeira que escorre às molduras
          .to(S, { cena: 1, duration: 0.17 }, celular ? 0.66 : 0.62)                 // fotos em camadas
          .to(S, { linhas: 1, duration: 0.13 }, 0.68)
          .to(S, { nums: 1, duration: 0.1 }, 0.72)
          .to(S, { drift: 1, duration: 0.4 }, 0.6)                           // parallax contínuo da cena
          .to(S, { sai: 1, duration: 0.06, ease: 'power1.in' }, 0.88)
          .to(S, { pass: 1, duration: 0.09, ease: 'power1.inOut' }, 0.89)    // amarelo sobe, linhas viram azul
          .set(root, { '--am3-fundo': '#F2C230' }, 0.98)
          .to(S, { apaga: 1, duration: 0.04 }, 0.96);
        root._am3tl = tl;

        ScrollTrigger.addEventListener('refresh', function () { if (vivo) { medir(); alvosDoTexto(); } });
        new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; }).observe(palco);
      }

      // ---------- mouse / toque ----------
      function aponta(cx, cy) {
        var pr = palco.getBoundingClientRect(), x = cx - pr.left, y = cy - pr.top;
        if (y < 0 || y > pr.height) { mouse.alvo = 0; return; }
        var w = px2w(x, y); mouse.tx = w[0]; mouse.ty = w[1];
        mouse.nx = x / pr.width * 2 - 1; mouse.ny = y / pr.height * 2 - 1; mouse.alvo = 1;
      }
      function sai() { mouse.alvo = 0; mouse.nx = 0; mouse.ny = 0; }
      function onMove(e) { aponta(e.clientX, e.clientY); }
      function onTouch(e) { if (e.touches[0]) aponta(e.touches[0].clientX, e.touches[0].clientY); }
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', sai);
      window.addEventListener('touchstart', onTouch, { passive: true });
      window.addEventListener('touchmove', onTouch, { passive: true });
      window.addEventListener('touchend', sai, { passive: true });

      function canto(b, dx, dy, c) {
        return [b.x + dx + ((c === 1 || c === 2) ? b.w : 0), b.y + dy + ((c === 2 || c === 3) ? b.h : 0)];
      }
      function mistura(a, b, t) { return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')'; }

      var ultimo = {};
      function css(el, k, v) { var c = ultimo[k]; if (c !== v) { ultimo[k] = v; el.style.setProperty(k.split('|')[0], v); } }

      function quadro(time, dtMs) {
        if (!U || !visivel) return;
        var dt = Math.min(0.05, (dtMs || 16) / 1000);

        // energia do cursor vem da velocidade; parado, a mola devolve cada ponto ao lugar
        var vel = Math.hypot(mouse.tx - mouse.px, mouse.ty - mouse.py) / K / dt;
        mouse.px = mouse.tx; mouse.py = mouse.ty;
        mouse.vel += (vel - mouse.vel) * 0.25;
        var energia = (mouse.alvo && mouse.vel > 2) ? Math.min(1, 0.45 + mouse.vel / 1600) : 0;
        var sobe = energia > mouse.k;
        mouse.v += ((energia - mouse.k) * (sobe ? 160 : 20) - mouse.v * (sobe ? 20 : 6.5)) * dt;
        mouse.k = Math.max(0, Math.min(1.15, mouse.k + mouse.v * dt));
        var l = 1 - Math.pow(0.02, dt);
        mouse.x += (mouse.tx - mouse.x) * l; mouse.y += (mouse.ty - mouse.y) * l;
        mouse.sx += (mouse.nx - mouse.sx) * l * 0.6; mouse.sy += (mouse.ny - mouse.sy) * l * 0.6;

        // rosto: posição, escala, giro 3D pelo mouse
        var s = suave(S.shift);
        U.uFaceC.value.set(lerp(rostoA.x, rostoB.x, s) + mouse.sx * 0.04 * rostoA.s, lerp(rostoA.y, rostoB.y, s) - mouse.sy * 0.03 * rostoA.s);
        U.uFaceS.value = lerp(rostoA.s, rostoB.s, s);
        var giro = toque ? 0.4 : 1;
        mouse.rx += (mouse.sy * 0.14 * giro - mouse.rx) * l; mouse.ry += (mouse.sx * 0.26 * giro - mouse.ry) * l;
        eul.set(mouse.rx, mouse.ry, 0); rot4.makeRotationFromEuler(eul); U.uRot.value.setFromMatrix4(rot4);

        var dpr = renderer.getPixelRatio();
        U.uTime.value = time; U.uMorph.value = S.morph; U.uDis.value = S.dis;
        U.uFade.value = S.entra * (1 - S.dis * 0.15);
        U.uSize.value = (celular ? 1.7 : (dpr > 1.5 ? 1.6 : 1.85)) * dpr;
        U.uSizeF.value = (celular ? 2.5 : 2.3) * dpr;
        // rosto menor = pontos mais juntos: ponto e alfa encolhem junto, senão o tom estoura em branco
        U.uEsc.value = Math.max(0.3, Math.min(1, U.uFaceS.value / K / (celular ? 292 : 423)));
        U.uBreath.value = 0.7 * K;
        U.uAmp.value = visH * (celular ? 0.07 : 0.085);
        U.uMouse.value.set(mouse.x, mouse.y); U.uMouseK.value = mouse.k;
        U.uRad.value = (celular ? 110 : 180) * K; U.uPush.value = (celular ? 22 : 34) * K;
        if (S.dis < 1) renderer.render(cena, camera);
        else if (!ultimo.limpo) { renderer.clear(); ultimo.limpo = 1; }
        if (S.dis < 1) ultimo.limpo = 0;

        // DOM: dica, bloco, cena de fotos, linhas, passagem
        css(role, 'opacity', String(0.65 * (1 - S.role)));
        css(root, '--am3-bl', (S.bl * (nBloco + 0.6)).toFixed(3));
        css(root, '--am3-bs', S.bs.toFixed(3));
        var ativa = S.cena > 0 && S.apaga < 1;
        css(cenaEl, 'visibility', ativa ? 'visible' : 'hidden');
        if (ativa) {
          var mx = toque ? 0 : mouse.sx, my = toque ? 0 : mouse.sy, dr = S.drift - 0.5;
          var desl = [];
          for (var i = 0; i < figs.length; i++) {
            var b = bases[i], e = suave((S.cena - i * 0.14) / 0.5);
            var dx = -mx * 66 * b.p, dy = (1 - e) * H * 0.3 * b.p - dr * H * 0.22 * b.p - my * 34 * b.p - S.sai * H * 0.25 * b.p;
            dx = Math.max(8 - b.x, Math.min(W - 8 - b.x - b.w, dx)); // parallax nunca leva a foto para fora da tela
            desl.push([dx, dy + S.sai * H * 0.25 * b.p]); // as guias ficam: só as fotos saem
            css(figs[i], 'transform|' + i, 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)');
            css(figs[i], 'opacity|' + i, (Math.min(1, e * 1.6) * (1 - S.sai)).toFixed(3));
            css(figs[i], 'clip-path|' + i, 'inset(' + ((1 - e) * 100).toFixed(1) + '% 0 0 0)');
          }
          for (i = 0; i < nums.length; i++) {
            var p = baseNums[i].p, en = suave((S.nums - i * 0.2) / 0.6);
            var ny = (1 - en) * 40 - dr * H * 0.2 * p - my * 34 * p - S.sai * H * 0.2 * p;
            css(nums[i], 'transform|n' + i, 'translate3d(' + (-mx * 66 * p).toFixed(1) + 'px,' + ny.toFixed(1) + 'px,0)');
            css(nums[i], 'opacity|n' + i, (en * (1 - S.sai)).toFixed(3));
          }
          for (i = 0; i < LIG.length; i++) {
            var L = LIG[i], A, B, ln = linhas[i];
            var c = canto(bases[L[1]], desl[L[1]][0], desl[L[1]][1], L[2]);
            if (L[0] === 'h') { A = [L[3] * W, c[1]]; B = [L[4] * W, c[1]]; css(ln, 'opacity|l' + i, c[1] < 76 ? '0' : '1'); } // nunca sob o menu
            else { A = [c[0], L[3] * H]; B = [c[0], L[4] * H]; }
            ln.setAttribute('x1', A[0].toFixed(1)); ln.setAttribute('y1', A[1].toFixed(1));
            ln.setAttribute('x2', B[0].toFixed(1)); ln.setAttribute('y2', B[1].toFixed(1));
            var dLin = clamp01((S.linhas - i * 0.1) / 0.4);
            css(ln, 'stroke-dashoffset|' + i, (S.apaga > 0 ? -S.apaga : 1 - dLin).toFixed(3));
          }
          css(root, '--am3-linha', mistura(MARFIM, AZUL, suave((S.pass - 0.3) / 0.5)));
        }
        var ps = (1 - S.pass) * 100;
        css(passagem, 'clip-path', 'inset(' + ps.toFixed(2) + '% 0 0 0)');
        css(topoAzul, 'clip-path', 'inset(' + Math.max(0, (1 - S.pass) * H).toFixed(1) + 'px 0 0 0)');
      }

      return function () {
        vivo = false;
        gsap.ticker.remove(quadro);
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', sai);
        window.removeEventListener('touchstart', onTouch);
        window.removeEventListener('touchmove', onTouch);
        window.removeEventListener('touchend', sai);
        if (pts) { pts.geometry.dispose(); pts.material.dispose(); }
        renderer && renderer.dispose();
      };
    }, root);
  };
})();
