/* Capítulos 5 a 11 · window.initC06_11(root?) · requer gsap + ScrollTrigger. Devolve o gsap.context (ctx.revert() limpa). */
(function () {
  "use strict";

  var fmt = function (v, dec, sep) {
    var s = v.toFixed(dec || 0).replace(".", ",");
    if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return s;
  };

  // Retrato da Cida: malha triangulada tirada da própria foto (assets/cida-malha.json).
  // Constrói de cima para baixo, fecha completa e só então a foto recortada aparece.
  function retrato(fig, ScrollTrigger) {
    var img = fig.querySelector(".c611-cida-img");
    var cv = fig.querySelector(".c611-cida-canvas");
    var ctx = cv.getContext("2d");
    var M = null, W = 0, H = 0, prog = 0;
    img.style.opacity = 0;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), b = fig.getBoundingClientRect();
      W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    }
    function draw() {
      if (!M || !W) return;
      ctx.clearRect(0, 0, W, H);
      // mesma caixa que o object-fit: contain, alinhado embaixo
      var k = Math.min(W / M.w, H / M.h), ox = (W - M.w * k) / 2, oy = H - M.h * k;
      var build = Math.min(1, prog / .72), n = Math.floor(M.e.length / 2 * build);
      ctx.strokeStyle = "#14213D"; ctx.lineWidth = .6;
      for (var lv = 1; lv <= 9; lv++) {
        ctx.globalAlpha = lv / 9; ctx.beginPath();
        for (var i = 0; i < n; i++) {
          if (M.t[i] !== lv) continue;
          var a = M.e[2 * i] * 2, c = M.e[2 * i + 1] * 2;
          ctx.moveTo(ox + M.p[a] * k, oy + M.p[a + 1] * k); ctx.lineTo(ox + M.p[c] * k, oy + M.p[c + 1] * k);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var f = Math.max(0, Math.min(1, (prog - .78) / .2));
      img.style.opacity = f; cv.style.opacity = 1 - f;
    }
    fetch(fig.dataset.malha).then(function (r) { return r.json(); }).then(function (j) {
      M = j; size();
      window.addEventListener("resize", size);
      ScrollTrigger.create({ trigger: fig.closest("section") || fig, start: "top 80%", end: "top -10%", scrub: .6,
        onUpdate: function (st) { prog = st.progress; draw(); } });
    }).catch(function () { img.style.opacity = 1; cv.style.display = "none"; });
  }

  // A malha da Cida não depende da cola nem do aviso da abertura: começa quando o cap. 9 se aproxima.
  function retratoLazy() {
    var fig = document.querySelector(".c611-cida-retrato");
    if (!fig || fig._c611) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    var go = function () {
      if (fig._c611) return; fig._c611 = true;
      gsap.registerPlugin(ScrollTrigger); retrato(fig, ScrollTrigger);
    };
    if (!("IntersectionObserver" in window)) return go();
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); }
    }, { rootMargin: "150% 0px 150% 0px" });
    io.observe(fig);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retratoLazy); else retratoLazy();

  window.initC06_11 = function (root) {
    retratoLazy();
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
      q(".c611-num .c611-draw, .c611-fmt .c611-draw").forEach(function (p) {
        gsap.fromTo(p, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: p.closest("svg"), start: "top 85%", end: "top 35%", scrub: .6 } });
      });

      // contadores
      q(".c611-count").forEach(function (el) {
        var from = +el.dataset.from || 0, to = +el.dataset.to, dec = +el.dataset.dec || 0;
        var pre = el.dataset.prefix || "", suf = (el.dataset.suffix || "").replace(/ /g, "\u00a0"), sep = el.dataset.sep;
        var o = { v: from };
        el.textContent = pre + fmt(from, dec, sep) + suf;
        gsap.to(o, { v: to, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 95%" },
          onUpdate: function () { el.textContent = pre + fmt(o.v, dec, sep) + suf; } });
      });

      // 05 e 06 · cada número herói sobe da própria linha de base
      q(".c611-hero").forEach(function (el) {
        var n = el.querySelector(".c611-hero-n"), rest = q(".c611-hero-k, .c611-hero-txt, .c611-hero-src, .c611-hero-col > :not(.c611-hero-n), .c611-hero-foto", el);
        var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 78%" } });
        if (n) tl.from(n, { yPercent: 40, opacity: 0, duration: 1.3, ease: "expo.out" });
        if (rest.length) tl.from(rest, { y: 24, opacity: 0, duration: 1, stagger: .08, ease: "expo.out" }, .2);
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
      gsap.from(".c611-cor-foto img", { scale: 1.12, ease: "none", scrollTrigger: { trigger: ".c611-cor-foto", start: "top bottom", end: "bottom top", scrub: true } });

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
        gsap.from(el.querySelector("img"), { scale: 1.25, duration: 1.6, ease: "expo.out", delay: (i % 4) * .07,
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

      // 09 · retrato da Cida
      // 09 · retrato da Cida: inicia sozinho, por IntersectionObserver (ver fim do arquivo)
    }, root === document ? undefined : root);

    return ctx;
  };
})();
