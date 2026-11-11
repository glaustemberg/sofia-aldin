/* Capítulos 5 a 11 · window.initC06_11(root?) · requer gsap + ScrollTrigger. Devolve o gsap.context (ctx.revert() limpa). */
(function () {
  "use strict";

  var fmt = function (v, dec, sep) {
    var s = v.toFixed(dec || 0).replace(".", ",");
    if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return s;
  };

  window.initC06_11 = function (root) {
    root = root || document;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return null;
    gsap.registerPlugin(ST);
    var q = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
    // movimento reduzido mantém as animações: todas são disparadas ou guiadas pela rolagem

    var ctx = gsap.context(function () {
      // textos sobem
      q(".c611-rise").forEach(function (el) {
        gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
      });

      // linhas que se desenham (pathLength=1)
      q(".c611-num .c611-draw, .c611-fmt .c611-draw, .c611-cida .c611-draw").forEach(function (p) {
        gsap.fromTo(p, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: p.closest("svg"), start: "top 85%", end: "top 35%", scrub: .6 } });
      });

      // contadores: contam até o valor exato quando entram na tela. A largura final fica presa, o texto ao lado não dança.
      // Movimento reduzido: o número já aparece no valor final.
      var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      q(".c611-count").forEach(function (el) {
        var from = +el.dataset.from || 0, to = +el.dataset.to, dec = +el.dataset.dec || 0;
        var pre = el.dataset.prefix || "", suf = (el.dataset.suffix || "").replace(/ /g, " "), sep = el.dataset.sep;
        var fim = pre + fmt(to, dec, sep) + suf;
        if (reduz) { el.textContent = fim; return; }
        var o = { v: from }, ini = pre + fmt(from, dec, sep) + suf;
        var trava = function () { var t = el.textContent; el.textContent = fim; el.style.minWidth = el.getBoundingClientRect().width + "px"; el.textContent = t; };
        el.textContent = ini;
        trava(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(trava);
        gsap.to(o, { v: to, duration: 2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%" },
          onStart: trava,
          onUpdate: function () { el.textContent = pre + fmt(o.v, dec, sep) + suf; },
          onComplete: function () { el.textContent = fim; } });
      });

      // 05 a 08 · big number sobe da linha de base, a legenda vem depois
      q(".c611-bn").forEach(function (el) {
        var n = el.querySelector(".c611-bn-n"), rest = q(".c611-bn-k, .c611-bn-side > *, .c611-bn-chart", el);
        var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 75%" } });
        if (n) tl.from(n, { yPercent: 18, opacity: 0, duration: 1.4, ease: "expo.out" });
        if (rest.length) tl.from(rest, { y: 24, opacity: 0, duration: 1, stagger: .08, ease: "expo.out" }, .25);
      });
      q(".c611-ficha-i, .c611-oper-l li, .c611-bbb-txt").forEach(function (el) {
        gsap.from(el, { y: 32, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
      });

      // parallax pela rolagem (continua com movimento reduzido, porque é guiado pela rolagem)
      q(".c611-px img").forEach(function (img) {
        // a folga vem da própria altura: a foto nunca descobre a moldura
        var folga = function () { return -100 * Math.max(0, 1 - img.parentNode.offsetHeight / (img.offsetHeight || 1)); };
        gsap.fromTo(img, { yPercent: folga }, { yPercent: 0, ease: "none",
          scrollTrigger: { trigger: img.parentNode, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
      });
      q(".c611-flut").forEach(function (el) {
        gsap.fromTo(el, { y: 48 }, { y: -48, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });

      var mm = gsap.matchMedia();

      mm.add("(min-width: 901px)", function () {
        // 07 · campo e 3 tempos
        var jogo = root.querySelector(".c611-jogo");
        var tl = gsap.timeline({ scrollTrigger: { trigger: jogo, start: "top 75%", end: "bottom 60%", scrub: .6 } });
        tl.fromTo(q(".c611-campo .c611-draw"), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: .08, ease: "none" })
          .from(q(".c611-tempo"), { opacity: 0, y: 24, stagger: .25, ease: "power2.out" }, .2);

        // 10 · os dois caminhos se separam
        gsap.from(q(".c611-caminho"), { opacity: 0, x: 40, stagger: .2, duration: 1, ease: "expo.out",
          scrollTrigger: { trigger: ".c611-caminhos", start: "top 55%" } });
      });
      mm.add("(max-width: 900px)", function () {
        q(".c611-tempo, .c611-caminho").forEach(function (el) {
          gsap.from(el, { opacity: 0, y: 32, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
        });
      });

      // 07 · a cor do site some: o amarelo vira preto e branco
      var corIntro = root.querySelector(".c611-cor-intro");
      if (corIntro) {
        // cortina: o preto sobe e o amarelo some de uma vez, sem passar por cinza
        var cor = corIntro.querySelector(".c611-cor-cor");
        gsap.timeline({ scrollTrigger: { trigger: corIntro, start: "top 75%", end: "top 15%", scrub: .4 } })
          .fromTo(cor, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", ease: "none", duration: 1 })
          .fromTo(corIntro, { color: "#14213D" }, { color: "#FFFFFF", ease: "steps(1)", duration: .01 }, .5);
        gsap.from(q(".c611-cor-display, .c611-cor-kicker"), { y: 60, opacity: 0, stagger: .12, duration: 1.3, ease: "expo.out",
          scrollTrigger: { trigger: corIntro, start: "top 40%" } });
      }

      // 08 · o azul invade o amarelo
      var carIntro = root.querySelector(".c611-car-intro");
      if (carIntro) {
        // sem pin: o azul sobe enquanto a seção entra; o título já está na tela
        var tl8 = gsap.timeline({ scrollTrigger: { trigger: carIntro, start: "top 85%", end: "top 15%", scrub: .5 } });
        tl8.fromTo(".c611-car-azul", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: 1 })
          .fromTo(".c611-car-intro-in", { color: "#14213D" }, { color: "#FFFFFF", ease: "steps(1)", duration: .01 }, .62)
          .fromTo(".c611-car-display em", { color: "#14213D" }, { color: "#F2C230", ease: "steps(1)", duration: .01 }, .62);
      }
      q(".c611-m").forEach(function (el, i) {
        gsap.from(el, { clipPath: "inset(100% 0 0 0)", duration: 1.2, ease: "expo.out", delay: (i % 4) * .07,
          scrollTrigger: { trigger: el, start: "top 92%" } });
        var im = el.querySelector("img");
        // o zoom de entrada nunca passa do tamanho natural da foto (cover): sem pixel estourado no meio da animação
        var cob = Math.max(el.clientWidth / (im.naturalWidth || im.width), el.clientHeight / (im.naturalHeight || im.height));
        gsap.from(im, { scale: Math.max(1, Math.min(1.25, .99 / (cob || 1))), duration: 1.6, ease: "expo.out", delay: (i % 4) * .07,
          scrollTrigger: { trigger: el, start: "top 92%" } });
      });

      // 11 · a sala vazia, porta aberta
      var sala = root.querySelector(".c611-sala");
      if (sala) {
        gsap.fromTo(q(".c611-sala .c611-draw"), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: .1, ease: "none",
          scrollTrigger: { trigger: ".c611-ctt", start: "top 80%", end: "center 55%", scrub: .6 } });
        gsap.from(q(".c611-ctt-list li"), { opacity: 0, x: -20, stagger: .08, duration: .9, ease: "expo.out",
          scrollTrigger: { trigger: ".c611-ctt-list", start: "top 85%" } });
      }

      // 09 · a Cida: ícones se desenham, selos entram, a parede de prêmios se monta um a um (tudo preso à rolagem)
      q(".c611-ic").forEach(function (ic) {
        gsap.fromTo(q("path, rect, circle", ic), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", stagger: .15,
          scrollTrigger: { trigger: ic, start: "top 92%", end: "top 62%", scrub: .6 } });
      });
      q(".c611-area, .c611-traj-l li").forEach(function (el) {
        gsap.from(q(":scope > p", el), { y: 20, opacity: 0, stagger: .06, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
      });
      q(".c611-selos").forEach(function (selos) {  // Cida e Berg
        gsap.from(q(".c611-selo", selos), { y: 40, opacity: 0, stagger: .08, ease: "power2.out",
          scrollTrigger: { trigger: selos, start: "top 88%", end: "bottom 70%", scrub: .6 } });
      });
      var parede = root.querySelector(".c611-premios");
      if (parede) {
        var tp = gsap.timeline({ scrollTrigger: { trigger: parede, start: "top 92%", end: "bottom 85%", scrub: .6 } });
        q(".c611-premio", parede).forEach(function (pr, i) {
          var t = i * .5;
          tp.fromTo(q(".c611-p-o", pr), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", duration: .6 }, t)
            .fromTo(q(".c611-p-i", pr), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", duration: .5 }, t + .2)
            .from(pr.querySelector("span"), { opacity: 0, y: 14, ease: "power2.out", duration: .4 }, t + .35);
        });
      }
    }, root === document ? undefined : root);

    return ctx;
  };
})();
