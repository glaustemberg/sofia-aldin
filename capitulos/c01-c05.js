/* Capítulos 1 a 4 · Sofia Aldin. Requer GSAP 3 + ScrollTrigger. Uso: window.initC01_05() */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  // Andaime do capítulo 4: desenhado em px reais do bloco (responsivo), peça a peça
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function buildAndaime(svg) {
    if (!svg) return null;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return null;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var frase = svg.parentNode.querySelector('.c04-frase');
    var sr = svg.getBoundingClientRect(), fs = parseFloat(getComputedStyle(frase).fontSize);
    var dy = window.gsap ? (parseFloat(gsap.getProperty(frase, 'y')) || 0) : 0; // mede sem o deslocamento da entrada
    // linhas reais da frase (o andaime se adapta ao texto: nenhum tubo cruza uma letra)
    var rg = document.createRange(); rg.selectNodeContents(frase);
    var lines = [];
    Array.prototype.forEach.call(rg.getClientRects(), function (r) {
      if (r.width < 2) return;
      var top = r.top - sr.top - dy, L = lines[lines.length - 1];
      if (L && Math.abs(L.top - top) < fs * .3) { L.l = Math.min(L.l, r.left - sr.left); L.r = Math.max(L.r, r.right - sr.left); L.bot = Math.max(L.bot, r.bottom - sr.top - dy); }
      else lines.push({ l: r.left - sr.left, r: r.right - sr.left, top: top, bot: r.bottom - sr.top - dy });
    });
    if (!lines.length) return null;
    var mob = W < 700, t = mob ? 3 : 4, m = fs * .12, pe = 24, base = H - 6;
    var nb = Math.max(3, Math.round(W / (mob ? 110 : 190))), xs = [], i, k;
    for (i = 0; i <= nb; i++) xs.push(Math.min(W - t - 1, Math.max(t + 1, i * W / nb)));
    // plataformas logo abaixo de cada linha: a frase pousa nelas
    var plat = lines.map(function (L) { return L.bot + fs * .05; }); // abaixo das cedilhas
    var topo = lines[0].top + fs * .18;
    // faixas: [y de cima, y de baixo, linha que ocupa a faixa ou null]
    var bands = lines.map(function (L, k) { return [k ? plat[k - 1] : topo, plat[k], L]; });
    bands.push([plat[plat.length - 1], base - pe, null]);
    var livre = function (x, L) { return !L || x < L.l - m - t || x > L.r + m + t; };
    var g = { sapatas: el('g', {}, svg), montantes: el('g', {}, svg), niveis: [] };
    xs.forEach(function (x) {
      var s = el('g', { class: 'c04-a-sap' }, g.sapatas);
      el('line', { x1: x, y1: base - pe, x2: x, y2: base - 4 }, s);
      el('rect', { x: x - 12, y: base - 4, width: 24, height: 4, class: 'c04-a-chapa' }, s);
      el('rect', { x: x - 5, y: base - pe - 6, width: 10, height: 6, class: 'c04-a-chapa' }, s);
    });
    // de baixo para cima: cada nível tem montantes, travessa da plataforma, xis e braçadeiras
    for (k = bands.length - 1; k >= 0; k--) {
      var b = bands[k], ya = b[0], yb = b[1], L = b[2], tt = Math.max(2, t * .7);
      var nv = { travessas: el('g', {}, svg), xis: el('g', {}, svg), bracadeiras: el('g', {}, svg) };
      var ok = xs.map(function (x) { return livre(x, L); });
      xs.forEach(function (x, i) {
        if (!ok[i]) return;
        var mm = el('g', { class: 'c04-a-mont' }, g.montantes);
        el('line', { x1: x - t, y1: yb, x2: x - t, y2: ya }, mm);
        el('line', { x1: x + t, y1: yb, x2: x + t, y2: ya }, mm);
        if (k === 0) el('line', { x1: x - t, y1: ya, x2: x + t, y2: ya }, mm);
      });
      if (k > 0) { // plataforma que segura a linha de cima (nunca cruza letra: fica sob a base)
        var tr = el('g', { class: 'c04-a-trav' }, nv.travessas);
        el('line', { x1: xs[0], y1: ya - tt, x2: xs[nb], y2: ya - tt }, tr);
        el('line', { x1: xs[0], y1: ya + tt, x2: xs[nb], y2: ya + tt }, tr);
      }
      for (i = 0; i < nb; i++) {
        if (!ok[i] || !ok[i + 1]) continue;
        el('line', { x1: xs[i] + t, y1: ya + tt, x2: xs[i + 1] - t, y2: yb - tt, class: 'c04-a-x', pathLength: 1 }, nv.xis);
        el('line', { x1: xs[i + 1] - t, y1: ya + tt, x2: xs[i] + t, y2: yb - tt, class: 'c04-a-x', pathLength: 1 }, nv.xis);
      }
      if (k > 0) xs.forEach(function (x, i) {
        if (!ok[i] && !livre(x, bands[k - 1][2])) return;
        var bb = el('g', { class: 'c04-a-brac' }, nv.bracadeiras);
        el('rect', { x: x - t - 3, y: ya - 5, width: 2 * t + 6, height: 10, rx: 1 }, bb);
      });
      g.niveis.push(nv);
    }
    // travessa do térreo, sob a plataforma mais baixa
    return g;
  }

  function prepDraw(scope) {
    var els = scope.querySelectorAll('.cx-draw :is(path, circle, rect):not(.cx-dash)');
    els.forEach(function (el) { el.setAttribute('pathLength', '1'); });
    gsap.set(els, { strokeDasharray: 1, strokeDashoffset: 1 });
    return els;
  }

  function drawOn(svg, extra) {
    var paths = svg.querySelectorAll(':is(path, circle, rect):not(.cx-dash)');
    var dashed = svg.querySelectorAll('.cx-dash');
    var tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.12 });
    if (dashed.length) tl.from(dashed, { opacity: 0, duration: .6, stagger: .08 }, '-=0.6');
    if (extra) extra(tl);
    return tl;
  }

  function reveal(targets, trigger, opts) {
    if (!targets || targets.length === 0) return null; // nada a revelar
    return gsap.from(targets, Object.assign({
      y: 28, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .08,
      scrollTrigger: { trigger: trigger || targets, start: 'top 85%', once: true }
    }, opts || {}));
  }

  function c01(root) {
    gsap.from(root.querySelectorAll('.c01-tese .cx-line > span'), {
      yPercent: 112, duration: 1.4, ease: 'expo.out', stagger: .14,
      scrollTrigger: { trigger: root.querySelector('.c01-tese'), start: 'top 80%', once: true }
    });
    drawOn(root.querySelector('.c01-estrutura'));
    reveal(root.querySelectorAll('.c01-lista li'), root.querySelector('.c01-lista'), { stagger: .12 });
    reveal(root.querySelector('.c01-conclusao'));
    root.querySelectorAll('.c01-perfil').forEach(function (li) {
      drawOn(li.querySelector('svg'));
      reveal(li.querySelectorAll('.cx-mono, h3, p'), li, { delay: .3 });
    });
  }

  function c02(root) {
    reveal(root.querySelector('.c02-titulo'), null, { y: 40 });
    root.querySelectorAll('.c02-count').forEach(function (el) {
      var o = { v: 0 }, to = +el.dataset.to;
      el.textContent = '0';
      gsap.to(o, {
        v: to, duration: 2.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(o.v); }
      });
    });
    var foto = root.querySelector('.c02-foto img');
    gsap.from(foto, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: foto, start: 'top 85%', once: true } });
    reveal(root.querySelectorAll('.c02-texto > p'), root.querySelector('.c02-texto'));
    root.querySelectorAll('.c02-cad-lista li').forEach(function (li, i) {
      var svg = li.querySelector('svg');
      var img = svg.querySelector('image');
      if (img) gsap.set(img, { opacity: 0 });
      drawOn(svg, function (tl) {
        if (img) tl.to(img, { opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.4');
      }).delay(i * .15);
      reveal(li.querySelectorAll('.cx-mono, h3'), li, { delay: .4 + i * .15 });
    });
    reveal(root.querySelector('.c02-frase'), null, { y: 40 });
    gsap.from(root.querySelectorAll('.c02-marcas li'), {
      opacity: 0, y: 16, duration: 1, ease: 'expo.out', stagger: { each: .07, grid: 'auto', from: 'start' },
      scrollTrigger: { trigger: root.querySelector('.c02-marcas'), start: 'top 85%', once: true }
    });
  }

  function c03(root) {
    var palco = root.querySelector('.c03-palco');
    var sala = root.querySelector('.c03-sala');
    var quadros = [].slice.call(root.querySelectorAll('.c03-q'));
    var etapas = [].slice.call(root.querySelectorAll('.c03-etapa'));
    var ins = etapas.map(function (e) { return e.querySelector('.c03-in'); });
    var alvo = root.querySelector('.c03-alvo');
    var atual = root.querySelector('.c03-atual');
    var barra = root.querySelector('.c03-barra i');
    var sofia = root.querySelector('.c03-sofia');
    drawOn(sala);
    gsap.from(sofia, { opacity: 0, y: 30, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: root, start: 'top 70%', once: true } });

    function rel(node) {
      var r = node.getBoundingClientRect(), p = palco.getBoundingClientRect();
      return { left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height };
    }
    function caixa(node) {
      return {
        left: function () { return rel(node).left; }, top: function () { return rel(node).top; },
        width: function () { return rel(node).width; }, height: function () { return rel(node).height; }
      };
    }
    function setAberto(i) {
      quadros.forEach(function (q, k) { q.classList.toggle('is-open', k === i); });
      if (atual) atual.textContent = '0' + (i + 1);
      if (barra) barra.style.transform = 'scaleX(' + ((i + 1) / quadros.length) + ')';
    }

    gsap.matchMedia().add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, function (ctx) {
      if (ctx.conditions.mob) {
        reveal(root.querySelectorAll('.c03-cabeca > *'), root.querySelector('.c03-cabeca'));
        etapas.forEach(function (e) {
          gsap.from(e, { clipPath: 'inset(0% 0% 100% 0%)', y: 24, duration: 1.2, ease: 'expo.out',
            scrollTrigger: { trigger: e, start: 'top 88%', once: true } });
        });
        return;
      }
      root.classList.add('is-pin');
      function medeIns() {
        var a = rel(alvo);
        ins.forEach(function (n) { n.style.width = a.width + 'px'; n.style.height = a.height + 'px'; });
      }
      medeIns();
      ScrollTrigger.addEventListener('refreshInit', medeIns);
      var noAlvo = caixa(alvo);
      var n = etapas.length;
      setAberto(0);
      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: root, start: 'top top', end: '+=' + (n * 90) + '%',
          pin: palco, scrub: .6, invalidateOnRefresh: true,
          snap: { snapTo: 1 / (n - 1), duration: .5, delay: .15, inertia: false, ease: 'power2.inOut' },
          onUpdate: function (st) { setAberto(Math.round(st.progress * (n - 1))); }
        }
      });
      etapas.forEach(function (e, k) {
        tl.set(e, Object.assign({ autoAlpha: k ? 0 : 1 }, k ? caixa(quadros[k]) : noAlvo), 0);
        tl.set(ins[k], { autoAlpha: k ? 0 : 1 }, 0);
      });
      // o painel volta a ser quadro na parede; o próximo quadro cresce até virar painel
      for (var k = 1; k < n; k++) {
        var t0 = k - 1;
        tl.to(ins[k - 1], { autoAlpha: 0, duration: .1, ease: 'none' }, t0 + .12)
          .to(etapas[k - 1], Object.assign({ duration: .3 }, caixa(quadros[k - 1])), t0 + .2)
          .to(etapas[k - 1], { autoAlpha: 0, duration: .06, ease: 'none' }, t0 + .48)
          .set(etapas[k], { autoAlpha: 1 }, t0 + .46)
          .to(etapas[k], Object.assign({ duration: .34 }, noAlvo), t0 + .46)
          .to(ins[k], { autoAlpha: 1, duration: .12, ease: 'none' }, t0 + .78);
      }
      tl.to({}, { duration: .2 });
      return function () {
        root.classList.remove('is-pin');
        ScrollTrigger.removeEventListener('refreshInit', medeIns);
        ins.forEach(function (n) { n.style.width = n.style.height = ''; });
        quadros.forEach(function (q) { q.classList.remove('is-open'); });
      };
    });
  }

  function c04(root) {
    var svg = root.querySelector('.c04-andaime'), obra = root.querySelector('.c04-obra');
    var tl, largura = 0;
    function monta() {
      if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); }
      var g = buildAndaime(svg);
      largura = svg.clientWidth;
      if (!g) return;
      tl = gsap.timeline({ defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: obra, start: 'top 90%', end: 'center 62%', scrub: .8 } });
      var tem = function (c) { return c && c.length; }; // grupos vazios (faixa com texto) não viram tween
      if (tem(g.sapatas.children)) tl.from(g.sapatas.children, { scale: 0, transformOrigin: '50% 100%', stagger: .02, duration: .3 });
      if (tem(g.montantes.children)) tl.from(g.montantes.children, { scaleY: 0, transformOrigin: '50% 100%', stagger: .05, duration: .9 }, .15);
      g.niveis.forEach(function (nv, k) {
        var t = .7 + k * .55;
        if (tem(nv.travessas.children)) tl.from(nv.travessas.children, { scaleX: 0, transformOrigin: '0% 50%', stagger: .04, duration: .35 }, t);
        if (tem(nv.xis.children)) tl.fromTo(nv.xis.children, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: .02, duration: .35 }, t + .2);
        if (tem(nv.bracadeiras.children)) tl.from(nv.bracadeiras.children, { scale: 0, transformOrigin: '50% 50%', stagger: .02, duration: .2, ease: 'back.out(3)' }, t + .3);
      });
    }
    monta();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { monta(); ScrollTrigger.refresh(); });
    var to;
    window.addEventListener('resize', function () {
      clearTimeout(to);
      to = setTimeout(function () { if (svg.clientWidth !== largura) { monta(); ScrollTrigger.refresh(); } }, 200);
    });
    gsap.from(root.querySelector('.c04-frase'), { opacity: 0, y: 40, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: obra, start: 'top 70%', once: true } });
    reveal(root.querySelectorAll('.c04-duas > *'), root.querySelector('.c04-duas'), { stagger: .15 });
    reveal(root.querySelector('.c04-plano-t'));
    reveal(root.querySelectorAll('.c04-tripe li'), root.querySelector('.c04-tripe'), { stagger: .15 });
    reveal(root.querySelector('.c04-plano .c04-corpo'));
    reveal(root.querySelector('.c04-fecho'), null, { y: 40 });
  }

  var inits = { c01: c01, c02: c02, c03: c03, c04: c04 };

  function initC01_05() {
    // movimento reduzido mantém as animações: todas são disparadas ou guiadas pela rolagem
    if (!window.gsap || !window.ScrollTrigger) {
      var s = document.querySelector('.c04-andaime');
      buildAndaime(s);
      window.addEventListener('resize', function () { buildAndaime(s); });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    Object.keys(inits).forEach(function (k) {
      var root = document.querySelector('.' + k);
      if (!root) return;
      if (k !== 'c04') prepDraw(root);
      inits[k](root);
    });
  }
  Object.keys(inits).forEach(function (k) { initC01_05[k] = inits[k]; });
  window.initC01_05 = initC01_05;
})();
