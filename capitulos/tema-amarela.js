/* Motion da Opção 2, Amarela: a mesma revelação por triângulos da abertura, ao longo da página.
   1. facetas: triângulos chapados no fundo de cada capítulo, em duas camadas de paralaxe;
   2. fotos: cobertas por uma malha de triângulos da cor do capítulo, que se desfaz com a rolagem;
   3. títulos grandes: entram por um corte diagonal, como uma faceta.
   Tudo preso à rolagem (scrub): com movimento reduzido a construção continua; não há loop automático. */
(function () {
  if (document.body.dataset.opcao !== 'amarela') return;
  var NS = 'http://www.w3.org/2000/svg';

  function iniciar() {
    if (!window.gsap || !window.ScrollTrigger) return;
    performance.mark('tema:inicio');
    gsap.registerPlugin(ScrollTrigger);
    var secoes = document.querySelectorAll('main .cx, main .c611');

    // ---------- 1. facetas de fundo ----------
    // composições fixas (coordenadas em %, viewBox 100 x 100 esticado): alternam o lado a cada capítulo
    var COMPOS = [
      { far: [[0, 0, 34, 0, 0, 46], [100, 62, 100, 100, 58, 100]], near: [[100, 0, 100, 30, 76, 0]], q: [92, 8, 97, 8, 94.5, 3] },
      { far: [[100, 0, 62, 0, 100, 52], [0, 70, 30, 100, 0, 100]], near: [[0, 18, 14, 0, 0, 0]], q: [3, 94, 8, 94, 5.5, 89] },
      { far: [[0, 30, 22, 0, 0, 0], [100, 40, 100, 100, 70, 100]], near: [[60, 100, 100, 74, 100, 100]], q: [94, 5, 99, 5, 96.5, 0.5] }
    ];
    secoes.forEach(function (s, i) {
      var c = COMPOS[i % COMPOS.length];
      var box = document.createElement('div');
      box.className = 'am2-facetas'; box.setAttribute('aria-hidden', 'true');
      var camadas = ['far', 'near'].map(function (nome) {
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
        c[nome].forEach(function (t) {
          var p = document.createElementNS(NS, 'polygon');
          p.setAttribute('points', t.join(' ')); svg.appendChild(p);
        });
        if (nome === 'near') {
          var q = document.createElementNS(NS, 'polygon');
          q.setAttribute('points', c.q.join(' ')); q.setAttribute('class', 'am2-quente'); svg.appendChild(q);
        }
        box.appendChild(svg);
        return svg;
      });
      s.appendChild(box);   // no fim: não muda :first-child nem a ordem do grid
      // paralaxe: a camada de trás anda pouco, a da frente anda mais; só transform
      gsap.fromTo(camadas[0], { yPercent: -4 }, { yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(camadas[1], { yPercent: -10 }, { yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // ---------- 2. fotos reveladas por triângulos ----------
    function fundo(el) {
      for (var n = el; n && n !== document.body; n = n.parentElement) {
        var b = getComputedStyle(n).backgroundColor;
        if (b && b !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(b)) return b;
      }
      return '#F2C230';
    }
    function revelar(fig, cols, rows, gatilho) {
      var cor = fundo(fig.parentElement);
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'am2-rev'); svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '0 0 ' + cols + ' ' + rows); svg.setAttribute('preserveAspectRatio', 'none');
      var tris = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        // diagonal alterna como na malha da abertura; 0,02 de sobra para não abrir fresta
        var a = (x + y) % 2 === 0;
        var A = a ? [x, y, x + 1, y, x, y + 1] : [x, y, x + 1, y, x + 1, y + 1];
        var B = a ? [x + 1, y, x + 1, y + 1, x, y + 1] : [x, y, x + 1, y + 1, x, y + 1];
        [A, B].forEach(function (t, k) {
          var p = document.createElementNS(NS, 'polygon');
          var cx = (t[0] + t[2] + t[4]) / 3, cy = (t[1] + t[3] + t[5]) / 3;
          p.setAttribute('points', t.map(function (v, j) {
            var c = j % 2 ? cy : cx; return (v + (v - c) * 0.04).toFixed(3);
          }).join(' '));
          p.setAttribute('fill', cor);
          p._d = Math.hypot(cx / cols, cy / rows) + ((x * 7 + y * 13 + k * 5) % 10) / 40;   // do canto para fora, com ruído fixo
          svg.appendChild(p); tris.push(p);
        });
      }
      tris.sort(function (m, n) { return m._d - n._d; });
      fig.classList.add('am2-rev-host');
      fig.appendChild(svg);
      // a malha cobre só a foto, não a legenda: acompanha a caixa da imagem a cada refresh
      var img = fig.querySelector('img');
      var cola = function () {
        if (!img) return;
        svg.style.inset = 'auto'; svg.style.left = img.offsetLeft + 'px'; svg.style.top = img.offsetTop + 'px';
        svg.style.width = img.offsetWidth + 'px'; svg.style.height = img.offsetHeight + 'px';
        svg.style.clipPath = getComputedStyle(img).clipPath;
      };
      cola(); ScrollTrigger.addEventListener('refreshInit', cola);
      gsap.timeline({ scrollTrigger: Object.assign({ trigger: fig, scrub: 0.5 }, gatilho) })
        .to(tris, { scale: 0, opacity: 0, rotation: 35, duration: 0.5, ease: 'power2.in', stagger: { amount: 0.5 } });
    }
    document.querySelectorAll('.c02-foto, .c611-bbb-foto, .c611-car-print-m, .c611-cor-folha').forEach(function (f) {
      revelar(f, 5, 4, { start: 'top 92%', end: 'top 38%' });
    });
    // a foto da Cida abre a seção amarela: a malha amarela sobre fundo amarelo parecia um quadro vazio,
    // então ela começa a se desfazer assim que a foto aparece na tela
    var cida = document.querySelector('.c611-cida-foto');
    if (cida) revelar(cida, 5, 4, { start: 'top bottom', end: 'top 50%' });
    var tela = document.querySelector('.c611-tela');
    if (tela) revelar(tela, 9, 6, { start: 'top 95%', end: 'top 10%' });

    // ---------- 4. Carnaval: o painel azul nunca cobre o título ----------
    // uma cópia do título em branco vai dentro do painel e é recortada junto com ele: acima da borda
    // o título segue marinho sobre amarelo, abaixo dela já é branco sobre azul; legível em qualquer quadro
    var azul = document.querySelector('.c611-car-azul');
    var carTxt = document.querySelector('.c611-car-intro > .c611-car-intro-in');
    if (azul && carTxt) {
      var copia = carTxt.cloneNode(true);
      copia.classList.add('am2-car-copia'); copia.setAttribute('aria-hidden', 'true'); copia.removeAttribute('style');
      copia.querySelectorAll('[id], [style]').forEach(function (e) { e.removeAttribute('id'); e.removeAttribute('style'); });
      azul.appendChild(copia);
    }

    // ---------- 3. títulos grandes entram por um corte diagonal ----------
    var FECHADO = 'polygon(0% -12%, 0% -12%, -34% 112%, -34% 112%)';
    var ABERTO = 'polygon(0% -12%, 134% -12%, 100% 112%, -34% 112%)';
    document.querySelectorAll('main :is(.cx, .c611) :is(h2, .c611-cor-display, .c611-car-display, .c611-caminho-t, .c611-cida-nome)').forEach(function (h) {
      if (h.closest('.c611-cor-intro, .c611-car-intro')) return;   // essas duas já têm a passagem de cor delas
      // disparado pela rolagem e com duração própria: não fica preso no meio quando o capítulo tem pin
      gsap.fromTo(h, { clipPath: FECHADO, webkitClipPath: FECHADO }, { clipPath: ABERTO, webkitClipPath: ABERTO, duration: 1.1, ease: 'power3.inOut',
        scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
    });
    performance.mark('tema:refresh');
    ScrollTrigger.refresh();
    performance.mark('tema:fim');
  }

  // depois que os capítulos montaram os pins deles (mesmo aviso que a integração usa)
  function quando() { setTimeout(iniciar, 0); }
  if (window.__aberturaPronta) quando();
  else document.addEventListener('abertura:pronta', quando, { once: true });
})();
