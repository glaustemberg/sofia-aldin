/* Abertura amarela: o rosto da Sofia se monta com a rolagem.
   Pontos e linhas amostrados da própria foto (canvas); a foto surge por baixo da malha
   (dissolve guiado por luminância) e a malha recua como um véu registrado sobre ela.
   A sala vive no mesmo espaço de coordenadas da foto: horizonte na altura dos olhos,
   canto da parede no canto real da foto, e acompanha a câmera. */
(() => {
  const W = 820, H = 1230;               // foto original
  const FACE = { x: 372, y: 470 };       // centro do rosto na foto
  const EYE_Y = 452;                     // linha dos olhos = horizonte
  const CORNER_X = 315;                  // canto real da parede na foto
  const NAVY = '#14213D';
  // caminho dos assets relativo a este script: funciona isolado e dentro de amarelo.html
  const BASE = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '';
  const pronta = () => document.dispatchEvent(new Event('abertura:pronta'));

  const sec = document.querySelector('.abertura');
  const cv = sec.querySelector('.malha');
  const ctx = cv.getContext('2d');
  const svg = sec.querySelector('.sala');
  const gLinhas = svg.querySelector('.sala-linhas');
  const gPiso = svg.querySelector('.sala-piso');
  const pisoArea = svg.querySelector('#piso-area');
  const gCad = svg.querySelector('.sala-poltrona');
  const nEl = sec.querySelector('.contador-n');
  const topo = document.querySelector('.topo');
  // movimento reduzido não desliga nada aqui: tudo é guiado pela rolagem (só o fio da dica para, no CSS)
  const mobile = matchMedia('(max-width: 767px)').matches;

  // a sala inteira fica num grupo com a mesma transformação da foto
  const cam = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  cam.setAttribute('class', 'sala-cam');
  [gLinhas, gPiso, gCad].forEach(g => cam.appendChild(g));
  svg.appendChild(cam);
  svg.querySelector('#piso-clip').setAttribute('clipPathUnits', 'userSpaceOnUse');

  const state = { k: 0, scat: 1, d: 0 };
  let vw = 0, vh = 0, dpr = 1;
  let pts, segB, ptB, photo, sil, revT, revV;
  const NB = 48;
  // hora de revelação T (0..1): a cabeça inteira vira foto de uma vez (faixa estreita de T,
  // cerca de 40 px de rolagem) e depois o corpo, do rosto para fora, com a frente ondulada.
  // Cada triângulo troca de malha para foto inteiro e os pontos daquele lugar somem junto.
  const off = y => 42 * Math.sin(y * 0.012 + 0.6) + 22 * Math.sin(y * 0.037 + 2.2);
  const HEAD = (x, y) => ((x - FACE.x) / 135) ** 2 + ((y - 430) / 200) ** 2;
  const T = (x, y) => {
    const h = HEAD(x, y);
    if (h < 1) return 0.12;                                   // a cabeça inteira de uma vez
    const dist = Math.hypot(x - FACE.x + off(y) * 0.5, (y - 430) * 0.8);
    return Math.min(1, 0.15 + 0.85 * Math.max(0, dist - 150) / 650);
  };
  const bucketOf = t => Math.max(0, Math.min(NB - 1, (t * NB) | 0));

  // ---------- amostragem da foto ----------
  function sample(img) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H), person = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      const r = px[j], g = px[j + 1], b = px[j + 2];
      lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      person[i] = px[j + 3] > 128 && !(b > r + 4 && lum[i] < 0.45) ? 1 : 0;   // tira a poltrona
    }
    // tom equilibrado antes de amostrar: tira a luz de baixa frequência (lado da sombra
    // na bochecha e no pescoço) e mantém o detalhe local (olhos, sobrancelhas, lábios)
    const box = (src, r) => {                                  // desfoque de caixa separável
      const a = new Float32Array(W * H), b = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        let acc = 0; const o = y * W;
        for (let x = -r; x < W; x++) {
          if (x + r < W) acc += src[o + x + r];
          if (x - r - 1 >= 0) acc -= src[o + x - r - 1];
          if (x >= 0) a[o + x] = acc;
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = -r; y < H; y++) {
          if (y + r < H) acc += a[(y + r) * W + x];
          if (y - r - 1 >= 0) acc -= a[(y - r - 1) * W + x];
          if (y >= 0) b[y * W + x] = acc;
        }
      }
      return b;
    };
    const pm = new Float32Array(W * H), pl = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { pm[i] = person[i]; pl[i] = person[i] * lum[i]; }
    const bm = box(pm, 30), bl = box(pl, 30);
    const tone = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const low = bm[i] > 0 ? bl[i] / bm[i] : lum[i];
      tone[i] = Math.min(1, Math.max(0, 0.3 * lum[i] + 0.7 * (0.6 + (lum[i] - low) * 1.35)));
    }

    const edge = (i) => {
      const a = lum[i - 1] - lum[i + 1], b = lum[i - W] - lum[i + W];
      return Math.min(1, Math.sqrt(a * a + b * b) * 4);
    };
    const faceE = (xx, yy) => ((xx - FACE.x) / 118) ** 2 + ((yy - FACE.y + 8) / 158) ** 2;
    const rnd = () => (1 + Math.random() * (W - 2)) | 0;
    const out = [];

    // camada 1 (malha): disco de Poisson sobre a pessoa inteira; mais fino no rosto
    const G = 6, grid = new Map(), gk = (x, y) => ((x / G) | 0) + ',' + ((y / G) | 0);
    const free = (x, y, rm) => {
      const cx = (x / G) | 0, cy = (y / G) | 0, n = Math.ceil(rm / G);
      for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
        const l = grid.get((cx + a) + ',' + (cy + b)); if (!l) continue;
        for (const q of l) if ((q.x - x) ** 2 + (q.y - y) ** 2 < rm * rm) return false;
      }
      return true;
    };
    const k = mobile ? 1.25 : 1;
    let guard = 0;
    while (guard++ < (mobile ? 6e5 : 1.2e6)) {
      const xx = rnd(), yy = (1 + Math.random() * (H - 2)) | 0, i = yy * W + xx;
      if (!person[i]) continue;
      const fe = faceE(xx, yy);
      const rm = k * (fe < 1.15 ? 4.8 : 8.5) * (1 - 0.3 * edge(i));
      if (!free(xx, yy, rm)) continue;
      const p = { x: xx + Math.random() - 0.5, y: yy + Math.random() - 0.5, r: 0.3 + 0.5 * (1 - lum[i]) ** 2, f: fe < 1.3 };
      out.push(p); const key = gk(xx, yy); (grid.get(key) || grid.set(key, []).get(key)).push(p);
    }
    // poeira em volta da cabeça (some quando a malha fecha)
    const nd = mobile ? 160 : 320;
    for (let n = 0, g2 = 0; n < nd && g2++ < 2e6;) {
      const xx = 2 + (Math.random() * (W - 4)) | 0, yy = 2 + (Math.random() * 700) | 0, i = yy * W + xx;
      if (!person[i] || (person[i - 3] && person[i + 3] && person[i - 3 * W])) continue;
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 60;
      out.push({ x: xx + Math.cos(a) * d, y: yy + Math.sin(a) * d - 8, r: 0.4 + Math.random() * 0.6, dust: 1 });
      n++;
    }
    // camada 2 (pontilhado de gravura): muitos pontos finos; o rosto recebe quase tudo
    const stip = (n, test, wf) => {
      for (let c = 0, g3 = 0; c < n && g3++ < 1.5e7;) {
        const xx = rnd(), yy = (1 + Math.random() * 1000) | 0, i = yy * W + xx;
        if (!person[i] || !test(xx, yy)) continue;
        const [w, dk] = wf(i, xx, yy);
        if (Math.random() > w) continue;
        out.push({ x: xx + Math.random() - 0.5, y: yy + Math.random() - 0.5, r: 0.12 + 0.6 * dk * dk, st: 1 });
        c++;
      }
    };
    stip(mobile ? 16000 : 52000, (xx, yy) => faceE(xx, yy) < 1.6, (i, xx, yy) => {
      const dk = Math.min(1, Math.max(0, (0.7 - tone[i]) / 0.4));
      const fall = faceE(xx, yy) < 1 ? 1 : 0.45;
      const hair = lum[i] < 0.2 ? 0.35 : 1;                                   // cabelo mais leve, como na gravura
      return [fall * hair * (0.01 + Math.pow(dk, 2.2) + 0.3 * edge(i)), dk];
    });
    stip(mobile ? 5000 : 14000, (xx, yy) => faceE(xx, yy) >= 1.6, (i) => {
      const dk = Math.min(1, Math.max(0, (0.8 - tone[i]) / 0.6));
      return [0.06 + 0.7 * dk * dk + 0.5 * edge(i), dk];
    });
    // dispersão inicial: só a periferia, radial e coerente (vizinhos andam juntos)
    for (const p of out) {
      const dx = p.x - FACE.x, dy = p.y - FACE.y, dist = Math.hypot(dx, dy) || 1;
      const amp = Math.max(0, dist - 170) * (p.dust ? 0.34 : 0.22);
      p.sx = dx / dist * amp; p.sy = dy / dist * amp;
      p.b = bucketOf(T(p.x, p.y));
    }
    return out;
  }

  // malha triangular de Delaunay sobre a camada 1; arestas separadas em rosto e periferia
  function link(points) {
    const idx = [];
    points.forEach((p, i) => { if (!p.st) idx.push(i); });
    const coords = new Float64Array(idx.length * 2);
    idx.forEach((i, n) => { coords[2 * n] = points[i].x; coords[2 * n + 1] = points[i].y; });
    const dl = new Delaunator(coords), tri = dl.triangles, half = dl.halfedges;
    const B = [0, 1].map(() => Array.from({ length: NB }, () => []));
    for (let e = 0; e < tri.length; e++) {
      if (e < half[e]) continue;                             // cada aresta uma vez
      const i = idx[tri[e]], j = idx[tri[e % 3 === 2 ? e - 2 : e + 1]];
      const p = points[i], q = points[j], d2 = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      const max = p.dust || q.dust ? 34 : 20;
      if (d2 > max * max || !p.dust !== !q.dust) continue;
      B[p.f && q.f ? 0 : 1][bucketOf(Math.min(T(p.x, p.y), T(q.x, q.y)))].push(i, j);
    }
    return B;
  }

  // triângulos de revelação: grade triangulada que cobre a foto inteira (sofá incluso),
  // calculada uma vez; por quadro só se recorta a foto pelo prefixo já revelado
  function revealTris(sofa) {
    const P = [], G = 24;
    for (let y = 0; y <= H; y += G) for (let x = 0; x <= W; x += G) {
      const e = x === 0 || x >= W - G / 2 || y === 0 || y >= H - G / 2;
      P.push(x + (e ? 0 : (Math.random() - 0.5) * G * 0.6), y + (e ? 0 : (Math.random() - 0.5) * G * 0.6));
    }
    P.push(W, 0, 0, H, W, H);
    const t = new Delaunator(Float64Array.from(P)).triangles, out = [];
    for (let e = 0; e < t.length; e += 3) {
      const a = 2 * t[e], b = 2 * t[e + 1], c = 2 * t[e + 2];
      const cx = (P[a] + P[b] + P[c]) / 3, cy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3;
      const g = k => { const dx = P[k] - cx, dy = P[k + 1] - cy, l = Math.hypot(dx, dy) || 1; return [P[k] + dx / l * 0.9, P[k + 1] + dy / l * 0.9]; };
      out.push({ t: sofa(cx, cy) ? 0.02 : T(cx, cy), v: [...g(a), ...g(b), ...g(c)] });   // 0,9 px para fora: sem fresta
    }
    out.sort((m, n) => m.t - n.t);
    revT = Float32Array.from(out, o => o.t);
    revV = Float32Array.from(out.flatMap(o => o.v));
  }

  // ---------- câmera ----------
  // B e C ancoram a foto na borda de baixo e na borda direita da tela: o corte vira enquadramento
  function frames() {
    const anc = (s) => ({ s, x: vw - (W - FACE.x) * s, y: vh - (H - FACE.y) * s });
    if (mobile) return [
      { s: vw * 1.08 / 250, x: vw * 0.5, y: vh * 0.45 },
      anc(vh * 0.74 / 1230),
      anc(vh * 0.62 / 1230),
    ];
    return [
      { s: vh * 0.95 / 290, x: vw * 0.5, y: vh * 0.41 },
      anc(vh * 0.91 / 1000),
      anc(vh * 0.69 / 1000),
    ];
  }
  function camera(k) {
    const f = frames();
    const i = Math.min(1, Math.floor(k)), t = k - i, a = f[i], b = f[i + 1];
    return {
      s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t),
      x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
    };
  }

  // ---------- desenho ----------
  // foto revelada: cache em coordenadas da foto; a cada quadro só se recortam os triângulos novos
  let cache, cachex, cacheN = 0;
  function photoUpTo(n) {
    if (n < cacheN) { cachex.clearRect(0, 0, W, H); cacheN = 0; }
    if (n === cacheN) return;
    cachex.save(); cachex.beginPath();
    for (let k = cacheN * 6, e = n * 6; k < e; k += 6) {
      cachex.moveTo(revV[k], revV[k + 1]); cachex.lineTo(revV[k + 2], revV[k + 3]); cachex.lineTo(revV[k + 4], revV[k + 5]); cachex.closePath();
    }
    cachex.clip(); cachex.drawImage(photo, 0, 0); cachex.restore();
    cacheN = n;
  }

  // malha em WebGL: buffers montados uma vez, por quadro só mudam os uniforms
  let gl, glP, glL, nP = 0, nL = 0, U = {};
  function initGL() {
    const c = document.createElement('canvas');
    c.className = 'malha malha-gl'; c.setAttribute('aria-hidden', 'true');
    cv.after(c);
    gl = c.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) { c.remove(); return false; }
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, `
      attribute vec2 p; attribute vec2 sc; attribute vec3 info;
      uniform vec4 cam; uniform vec2 res; uniform float dpr, d, k, ps, nb, line;
      varying float va;
      void main() {
        vec2 q = (p + sc * cam.w) * cam.x + cam.yz;
        gl_Position = vec4(q.x / res.x * 2.0 - 1.0, 1.0 - q.y / res.y * 2.0, 0.0, 1.0);
        float a = clamp(((info.y + 1.0) / nb - d) * nb + 0.5, 0.0, 1.0);
        if (line > 0.5) {
          float base = info.z > 0.5 ? 0.16 + 0.3 * min(1.0, k) : 0.3 + 0.15 * min(1.0, k);
          va = base * a * min(1.0, 0.5 * dpr);
          gl_PointSize = 1.0;
        } else {
          va = 0.9 * a;
          gl_PointSize = max(0.4, info.x * ps) * 2.0 * dpr;
        }
      }`));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `
      precision mediump float; varying float va;
      void main() { gl_FragColor = vec4(vec3(0.0784, 0.1294, 0.2392) * va, va); }`));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { c.remove(); gl = null; return false; }
    gl.useProgram(prog);
    ['cam', 'res', 'dpr', 'd', 'k', 'ps', 'nb', 'line'].forEach(n => (U[n] = gl.getUniformLocation(prog, n)));
    U.p = gl.getAttribLocation(prog, 'p'); U.sc = gl.getAttribLocation(prog, 'sc'); U.info = gl.getAttribLocation(prog, 'info');
    const vp = [], vl = [];                                  // 7 floats por vértice: x, y, sx, sy, r, balde, classe
    for (let b = 0; b < NB; b++) for (const q of ptB[b]) vp.push(q.x, q.y, q.sx, q.sy, q.r, b, 0);
    for (let c2 = 0; c2 < 2; c2++) for (let b = 0; b < NB; b++) {
      const seg = segB[c2][b];
      for (let n = 0; n < seg.length; n += 2) for (const q of [pts[seg[n]], pts[seg[n + 1]]]) vl.push(q.x, q.y, q.sx, q.sy, 0, b, c2);
    }
    const buf = a => { const o = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); return o; };
    glP = buf(vp); nP = vp.length / 7; glL = buf(vl); nL = vl.length / 7;
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    U.canvas = c;
    return true;
  }
  function drawGL(s, dx, dy, sc, d) {
    gl.viewport(0, 0, U.canvas.width, U.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (d >= 1) return;
    gl.uniform4f(U.cam, s, dx, dy, sc); gl.uniform2f(U.res, vw, vh);
    gl.uniform1f(U.dpr, dpr); gl.uniform1f(U.d, d); gl.uniform1f(U.k, state.k);
    gl.uniform1f(U.ps, Math.min(1.25, Math.max(0.95, s * 0.4))); gl.uniform1f(U.nb, NB);
    const bind = o => {
      gl.bindBuffer(gl.ARRAY_BUFFER, o);
      gl.enableVertexAttribArray(U.p); gl.vertexAttribPointer(U.p, 2, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(U.sc); gl.vertexAttribPointer(U.sc, 2, gl.FLOAT, false, 28, 8);
      gl.enableVertexAttribArray(U.info); gl.vertexAttribPointer(U.info, 3, gl.FLOAT, false, 28, 16);
    };
    bind(glL); gl.uniform1f(U.line, 1); gl.drawArrays(gl.LINES, 0, nL);
    bind(glP); gl.uniform1f(U.line, 0); gl.drawArrays(gl.POINTS, 0, nP);
  }

  function render() {
    if (!pts) return;
    const { s, x: ox, y: oy } = camera(state.k), d = state.d, sc = state.scat;
    const dx = ox - FACE.x * s, dy = oy - FACE.y * s;
    cam.setAttribute('transform', `matrix(${s} 0 0 ${s} ${dx} ${dy})`);
    cam.style.setProperty('--inv', 1 / s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (gl) drawGL(s, dx, dy, sc, d);

    if (d >= 1) { ctx.drawImage(photo, dx, dy, W * s, H * s); return; }
    ctx.drawImage(sil, dx, dy, W * s, H * s);          // a silhueta tapa a sala desenhada atrás dela
    if (d > 0) {                                        // foto recortada pelos triângulos já revelados
      let n = 0, hi = revT.length;
      while (n < hi) { const m = (n + hi) >> 1; if (revT[m] < d) n = m + 1; else hi = m; }
      photoUpTo(n);
      ctx.drawImage(cache, dx, dy, W * s, H * s);
    }
    if (gl) return;

    // sem WebGL: a mesma malha em canvas 2D
    const X = p => (p.x + p.sx * sc) * s + dx, Y = p => (p.y + p.sy * sc) * s + dy;
    const ps = Math.min(1.25, Math.max(0.95, s * 0.4));
    ctx.fillStyle = ctx.strokeStyle = NAVY;
    ctx.lineWidth = 0.5;
    for (let b = 0; b < NB; b++) {
      const a = Math.min(1, Math.max(0, ((b + 1) / NB - d) * NB + 0.5));   // some junto com o triângulo revelado
      if (a < 0.02) continue;
      for (let c = 0; c < 2; c++) {
        const seg = segB[c][b]; if (!seg.length) continue;
        ctx.globalAlpha = (c ? 0.16 + 0.3 * Math.min(1, state.k) : 0.3 + 0.15 * Math.min(1, state.k)) * a;   // periferia leve no close
        ctx.beginPath();
        for (let n = 0; n < seg.length; n += 2) {
          const p = pts[seg[n]], q = pts[seg[n + 1]];
          ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(q), Y(q));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.9 * a;
      ctx.beginPath();
      for (const p of ptB[b]) {
        const xx = X(p), yy = Y(p);
        if (xx < -3 || yy < -3 || xx > vw + 3 || yy > vh + 3) continue;
        const r = Math.max(0.4, p.r * ps);
        ctx.rect(xx - r, yy - r, r * 2, r * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- sala em linha, em coordenadas da foto ----------
  function room() {
    const yh = EYE_Y, cx = CORNER_X, yf = 820;                     // horizonte, canto, piso no canto
    const VP1 = cx + 5000, VP2 = cx - 1500;                        // fugas das paredes esquerda e direita
    const yL = (y0, x) => yh + (y0 - yh) * (VP1 - x) / (VP1 - cx);
    const yR = (y0, x) => yh + (y0 - yh) * (x - VP2) / (cx - VP2);
    const XL = -2600, XR = 1500, YB = 1700;
    const f = n => n.toFixed(1);
    const lin = (x1, y1, x2, y2) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
    const walls = [], floor = [];
    const add = (arr, d, w, det) => arr.push({ d, w, det });

    // estrutura
    add(walls, lin(cx, mobile ? 230 : -900, cx, yf), 1);                         // canto (atrás da cabeça, como na foto)
    add(walls, lin(cx, yf, XL, yL(yf, XL)), 1.1);                                 // base esquerda
    add(walls, lin(cx, yf, XR, yR(yf, XR)), 1.1);                                 // base direita
    add(walls, lin(cx, yf - 26, XL, yL(yf - 26, XL)), 0.7);                       // rodapé
    add(walls, lin(cx, yf - 26, XR, yR(yf - 26, XR)), 0.7);

    // janela alta na parede esquerda (acima do título, longe da cabeça)
    const wa = -820, wb = -420, wt = -1400, wbt = 170, ins = 12;
    const fr = (a, b, t, bt) => `M${f(a)} ${f(yL(t, a))}L${f(b)} ${f(yL(t, b))}L${f(b)} ${f(yL(bt, b))}L${f(a)} ${f(yL(bt, a))}Z`;
    add(walls, fr(wa, wb, wt, wbt), 0.9, 1);
    add(walls, fr(wa + ins, wb - ins, wt + ins, wbt - ins), 0.6, 1);
    const wm = (wa + wb) / 2;
    add(walls, lin(wm, yL(wt + ins, wm), wm, yL(wbt - ins, wm)), 0.6, 1);
    add(walls, lin(wa + ins, yL(-60, wa + ins), wb - ins, yL(-60, wb - ins)), 0.6, 1);
    add(walls, lin(wa - 14, yL(wbt + 10, wa - 14), wb + 14, yL(wbt + 10, wb + 14)), 0.7, 1);   // peitoril

    // estante na parede direita, à direita da cabeça
    const ba = 530, bb = 1120, bt = 300;
    add(walls, `M${f(ba)} ${f(yR(yf, ba))}L${f(ba)} ${f(yR(bt, ba))}L${f(bb)} ${f(yR(bt, bb))}`, 0.9, 1);
    for (const yy of [400, 500, 600, 700]) {
      add(walls, lin(ba, yR(yy, ba), bb, yR(yy, bb)), 0.7, 1);
      let bx = ba + 10, seed = yy * 0.73, livros = '';
      while (bx < bb - 20) {                                                      // livros: um caminho por prateleira
        seed = (seed * 9301 + 49297) % 233280; const r = seed / 233280;
        const bw = 9 + r * 12, bh = 100 * (0.55 + r * 0.33);
        if (r > 0.2) livros += `M${f(bx)} ${f(yR(yy, bx))}L${f(bx)} ${f(yR(yy - bh, bx))}L${f(bx + bw)} ${f(yR(yy - bh, bx + bw))}L${f(bx + bw)} ${f(yR(yy, bx + bw))}`;
        bx += bw + (r > 0.82 ? 26 : 3);
      }
      add(walls, livros, 0.5, 1);
    }

    // piso de tábuas: fogem para o ponto de fuga da parede esquerda, no horizonte
    pisoArea.setAttribute('d', `M${f(XL)} ${f(yL(yf, XL))}L${cx} ${yf}L${f(XR)} ${f(yR(yf, XR))}L${XR} ${YB}L${XL} ${YB}Z`);
    const boards = 16;                                                            // fogem para o canto, na altura dos olhos
    for (let n = 0; n < boards; n++) {
      const t = n / (boards - 1), bx = -7000 + 6800 * t ** 0.8;
      add(floor, lin(cx, yh, bx, YB), 0.55 + 0.6 * (1 - t));
    }
    add(floor, lin(XL, 1090, -420, 1090), 0.5);                                   // emenda

    const html = arr => arr.map(p => `<path pathLength="1"${p.det ? ' class="det"' : ''} style="--w:${p.w}" d="${p.d}"/>`).join('');
    gLinhas.innerHTML = html(walls);
    gPiso.innerHTML = html(floor);
    gCad.innerHTML = '';
  }

  // ---------- montagem ----------
  function resize() {
    vw = innerWidth; vh = sec.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    cv.width = vw * dpr; cv.height = vh * dpr;
    if (gl) { U.canvas.width = vw * dpr; U.canvas.height = vh * dpr; }
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  }

  function setup(img) {
    photo = img;
    sil = document.createElement('canvas'); sil.width = W; sil.height = H;
    const sx = sil.getContext('2d'); sx.drawImage(img, 0, 0);
    const sd = sx.getImageData(0, 0, W, H), q = sd.data, isSofa = new Uint8Array(W * H);   // só a pessoa (o sofá entra pela foto)
    for (let j = 0; j < q.length; j += 4) {
      const l = (0.2126 * q[j] + 0.7152 * q[j + 1] + 0.0722 * q[j + 2]) / 255;
      if (q[j + 3] > 128 && q[j + 2] > q[j] + 4 && l < 0.45) { q[j + 3] = 0; isSofa[j >> 2] = 1; }
      q[j] = 242; q[j + 1] = 194; q[j + 2] = 48;
    }
    sx.putImageData(sd, 0, 0);
    pts = sample(img);
    segB = link(pts);
    revealTris((x, y) => !(x < 400 && y > 920) && isSofa[Math.min(H - 1, y | 0) * W + Math.min(W - 1, x | 0)]);   // calça preta não conta como sofá
    ptB = Array.from({ length: NB }, () => []);
    for (const p of pts) ptB[p.b].push(p);
    cache = document.createElement('canvas'); cache.width = W; cache.height = H; cachex = cache.getContext('2d');
    try { initGL(); } catch (e) { console.warn('[sofia] WebGL:', e); gl = null; }
    // contexto perdido no celular: a mesma malha segue no canvas 2D
    if (gl) U.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; U.canvas.remove(); render(); });

    resize(); room();

    const struct = () => svg.querySelectorAll('path[pathLength]:not(.det)');
    const det = () => svg.querySelectorAll('path.det');
    const all = () => svg.querySelectorAll('path[pathLength]');
    if (!window.gsap || !window.ScrollTrigger) {
      console.error('[sofia] GSAP não carregou: abertura no estado final');
      Object.assign(state, { k: 2, scat: 0, d: 1 });
      all().forEach(p => (p.style.strokeDashoffset = 0));
      render();
      addEventListener('resize', () => { resize(); render(); });
      pronta();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    let tl;
    const build = () => {
      const prog = tl ? tl.scrollTrigger.progress : 0;
      if (tl) { tl.scrollTrigger.kill(); tl.kill(); }
      gsap.set(all(), { strokeDashoffset: 1 });
      tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: () => {
          render();
          const p = tl.progress();
          nEl.textContent = p < 0.24 ? '01' : p < 0.64 ? '02' : '03';
        },
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + (vh * 2.4), pin: true, scrub: 0.6, invalidateOnRefresh: true,
          onLeave: () => topo && topo.classList.add('abertura-passou'), onEnterBack: () => topo && topo.classList.remove('abertura-passou') },
      });
      tl.to(state, { scat: 0, duration: 0.16, ease: 'power2.out' }, 0.02)
        .to(state, { k: 1, duration: 0.36, ease: 'power2.inOut' }, 0.04)
        .to(state, { d: 1, duration: 0.4 }, 0.26)
        .to(state, { k: 2, duration: 0.32, ease: 'power2.inOut' }, 0.54)
        .to('.dica', { autoAlpha: 0, y: 10, duration: 0.05 }, 0.01)
        .fromTo('.titulo-2', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'expo.out' }, 0.74)
        .to(gsap.utils.toArray(struct()), { strokeDashoffset: 0, duration: 0.1, stagger: { amount: 0.12 } }, 0.24)
        .to(gsap.utils.toArray(det()), { strokeDashoffset: 0, duration: 0.08, stagger: { amount: 0.16 } }, 0.58)
        .to({}, { duration: 0.06 }, 0.94);
      if (prog) tl.scrollTrigger.scroll(tl.scrollTrigger.start + prog * (tl.scrollTrigger.end - tl.scrollTrigger.start));
      render();
    };
    build();
    pronta();
    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (innerWidth === vw && Math.abs(sec.clientHeight - vh) < 120) return; resize(); build(); }, 150);
    });
  }

  const img = new Image();
  img.onload = () => setup(img);
  img.onerror = () => { console.error('[sofia] foto da abertura não carregou'); pronta(); };
  img.src = BASE + 'assets/sofia-recorte.webp';
})();
