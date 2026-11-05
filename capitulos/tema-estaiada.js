/* Motion próprio da opção estaiada nos capítulos compartilhados.
   Três gestos, todos ligados à rolagem (continuam com movimento reduzido, porque é o visitante quem conduz):
   1. cabos: cada capítulo tem um mastro na margem e cabos finos que se tensionam até o chão do capítulo;
   2. cotas: cada big number ganha uma linha de cota que mede o número enquanto ele entra;
   3. prumo: uma régua fixa na margem esquerda mede a leitura, com um traço por capítulo. */
(function () {
  if (document.body.dataset.opcao !== 'estaiada') return;
  var NS = 'http://www.w3.org/2000/svg';
  var ESCUROS = '.c04, .c611-fora, .c611-car, .c611-fmt, .c611-cor-intro';

  // cap. 03: o recorte (feito sobre parede amarela) deixa franja no papel frio; aqui vai a foto inteira, emoldurada.
  // Troca já na leitura do script, antes do lazy-load pedir o recorte.
  var sofa = document.querySelector('img.c03-sofia');
  if (sofa) {
    sofa.src = 'abertura-malha/fotos/sofia-sofa.webp';
    sofa.width = 820; sofa.height = 1230;
    sofa.alt = 'Sofia Aldin sentada no sofá azul-marinho, diante de uma parede laranja';
    sofa.classList.add('e1-sofa');
  }

  function iniciar() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var secoes = [].slice.call(document.querySelectorAll('main .cx, main .c611'));

    // 1. cabos: mastro alterna de lado; o leque ocupa a primeira tela do capítulo
    secoes.forEach(function (s, i) {
      var dir = i % 2 === 0;
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'e1-cabos');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      var mx = dir ? 97 : 3, n = 6, linhas = [];
      var alto = Math.min(1, (innerHeight * 1.15) / Math.max(1, s.offsetHeight));
      svg.style.height = (alto * 100).toFixed(2) + '%';
      svg.style.bottom = 'auto';
      var mastro = document.createElementNS(NS, 'path');
      mastro.setAttribute('d', 'M' + mx + ' 0V100');
      mastro.setAttribute('class', 'e1-mastro');
      mastro.setAttribute('pathLength', '1');
      svg.appendChild(mastro); linhas.push(mastro);
      for (var k = 0; k < n; k++) {
        var p = document.createElementNS(NS, 'path');
        var y0 = 4 + k * 3.2, xf = dir ? 97 - (k + 1) * 9 : 3 + (k + 1) * 9;
        p.setAttribute('d', 'M' + mx + ' ' + y0 + 'L' + xf + ' 100');
        p.setAttribute('pathLength', '1');
        p.setAttribute('stroke-opacity', (0.42 - k * 0.04).toFixed(2));
        svg.appendChild(p); linhas.push(p);
      }
      linhas.forEach(function (l) { l.style.strokeDasharray = '1 1'; l.style.strokeDashoffset = '1';
        l.style.fill = 'none'; l.style.vectorEffect = 'non-scaling-stroke'; l.style.strokeWidth = '1';
        if (l !== mastro) l.style.stroke = 'var(--e1-laranja)'; else l.style.stroke = 'currentColor'; });
      s.insertBefore(svg, s.firstChild);
      gsap.to(linhas, { strokeDashoffset: 0, ease: 'none', stagger: 0.08,
        scrollTrigger: { trigger: s, start: 'top 90%', end: function () { return 'top+=' + Math.round(innerHeight * 0.9) + ' 60%'; }, scrub: 0.8 } });
    });

    // 2. cotas dos big numbers
    document.querySelectorAll('main :is(.cx-big, .c611-bn-n, .c611-cida-big, .c611-ficha-n)').forEach(function (n) {
      // número com palavra ("Top 10") fica na grotesca, sem cota
      if (/[A-Za-z]{2}/.test(n.textContent.replace(/R\$|mi|mil|p\.p\.|dias/g, ''))) { n.classList.add('e1-palavra'); return; }
      n.classList.add('e1-cota');
      gsap.fromTo(n, { '--e1-k': 0 }, { '--e1-k': 1, ease: 'none',
        scrollTrigger: { trigger: n, start: 'top 88%', end: 'bottom 55%', scrub: 0.6 } });
    });

    // fios dos rótulos se estendem como cota
    document.querySelectorAll('main .cx-rule').forEach(function (r) {
      gsap.fromTo(r, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: r, start: 'top 92%', end: 'top 70%', scrub: 0.5 } });
    });

    // 3. prumo
    var prumo = document.createElement('div');
    prumo.className = 'e1-prumo';
    prumo.setAttribute('aria-hidden', 'true');
    prumo.innerHTML = '<span class="e1-prumo-fio"></span><span class="e1-prumo-k"></span>';
    document.body.appendChild(prumo);
    var main = document.querySelector('main');
    function marcas() {
      [].slice.call(prumo.querySelectorAll('.e1-prumo-n')).forEach(function (m) { m.remove(); });
      var ini = main.offsetTop, tot = Math.max(1, main.offsetHeight);
      secoes.forEach(function (s) {
        var m = document.createElement('span'); m.className = 'e1-prumo-n';
        m.style.top = (((s.offsetTop - ini) / tot) * 100).toFixed(2) + '%';
        prumo.appendChild(m);
      });
    }
    marcas();
    ScrollTrigger.addEventListener('refresh', marcas);
    gsap.to(prumo.querySelector('.e1-prumo-k'), { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: main, start: 'top 60%', end: 'bottom bottom', scrub: true,
        onToggle: function (st) { prumo.classList.toggle('is-on', st.isActive); } } });
    document.querySelectorAll(ESCUROS).forEach(function (e) {
      ScrollTrigger.create({ trigger: e, start: 'top 50%', end: 'bottom 50%',
        onToggle: function (st) { prumo.classList.toggle('is-escuro', st.isActive); } });
    });
  }

  if (window.__aberturaPronta) iniciar();
  else document.addEventListener('abertura:pronta', function () { setTimeout(iniciar, 0); }, { once: true });
})();
