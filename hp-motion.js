/* HistoPráctica · movimiento discreto y accesible.
   Solo anima elementos ya presentes: no modifica datos, navegación ni respuestas. */
(function () {
  "use strict";
  var g = window.gsap;
  var app = document.getElementById("app");
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ST = window.ScrollTrigger;
  var DS = window.DrawSVGPlugin;
  var EZ = "power2.out";
  var ctx = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ok = function () { return !!g && !RM.matches && !document.hidden; };
  var remove = function (el) { return function () { if (el && el.parentNode) el.remove(); }; };

  if (!g || !app) return;
  try { g.registerPlugin.apply(g, [ST, DS].filter(Boolean)); } catch (_) {}

  var fx = document.createElement("div");
  fx.className = "hp-fx";
  fx.setAttribute("aria-hidden", "true");
  document.body.appendChild(fx);

  /* Celebraciones breves: paleta de marca, pocas partículas y sin vibración. */
  function burst(x, y, count) {
    if (!ok()) return;
    var colors = ["#167b75", "#4f91b5", "#d7b56d", "#8ebcb4"];
    for (var i = 0; i < count; i++) {
      var dot = document.createElement("i");
      var angle = Math.random() * Math.PI * 2;
      var distance = 24 + Math.random() * 42;
      var size = 4 + Math.random() * 3;
      dot.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px;background:" + colors[i % colors.length];
      fx.appendChild(dot);
      g.to(dot, { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 10, opacity: 0, scale: .7, duration: .45 + Math.random() * .2, ease: "power1.out", onComplete: remove(dot) });
    }
  }
  function confetti() {
    if (!ok()) return;
    var colors = ["#167b75", "#4f91b5", "#d7b56d", "#8ebcb4"];
    var width = window.innerWidth;
    for (var i = 0; i < 30; i++) {
      var bit = document.createElement("i");
      bit.className = "cf";
      bit.style.background = colors[i % colors.length];
      fx.appendChild(bit);
      g.fromTo(bit,
        { x: Math.random() * width, y: -10, rotation: Math.random() * 100, opacity: .9 },
        { y: window.innerHeight + 20, x: "+=" + ((Math.random() - .5) * 100), rotation: "+=240", duration: 1.7 + Math.random() * .6, delay: Math.random() * .22, ease: "power1.in", onComplete: remove(bit) }
      );
    }
  }
  function xp(target) {
    if (!ok() || !target) return;
    var rect = target.getBoundingClientRect();
    var label = document.createElement("b");
    label.className = "hp-xp";
    label.textContent = "+10 XP";
    label.style.left = (rect.left + rect.width / 2) + "px";
    label.style.top = (rect.top - 4) + "px";
    fx.appendChild(label);
    g.set(label, { xPercent: -50 });
    g.timeline({ onComplete: remove(label) })
      .fromTo(label, { y: 4, opacity: 0 }, { y: -12, opacity: 1, duration: .22, ease: EZ })
      .to(label, { y: -28, opacity: 0, duration: .35, ease: "power1.in" }, "+=.18");
  }
  function pill(message) {
    if (!ok()) return;
    var el = document.createElement("div");
    el.className = "hp-pill2";
    el.textContent = message;
    fx.appendChild(el);
    g.timeline({ onComplete: remove(el) })
      .fromTo(el, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: .25, ease: EZ })
      .to(el, { y: -5, opacity: 0, duration: .25 }, "+=1.1");
  }

  function feedback(target, correct) {
    if (!ok()) return;
    var option = $(".opt.ok");
    var rect = (option || target).getBoundingClientRect();
    if (correct) {
      burst(rect.right - 22, rect.top + rect.height / 2, 7);
      xp(target);
      var streak = typeof S !== "undefined" && S ? Number(S.streak) || 0 : 0;
      if (streak > 0 && streak % 5 === 0) pill("Racha de " + streak);
    } else if (target) {
      g.fromTo(target, { x: -2 }, { x: 0, duration: .22, ease: "power1.out", clearProps: "transform" });
    }
  }

  function animateClassMutation(mutation) {
    var el = mutation.target;
    if (!el || !el.classList) return;
    var now = el.className && String(el.className) || "";
    var old = mutation.oldValue || "";
    if (el.classList.contains("sheet") && /\b(ok|no)\b/.test(now) && !/\b(ok|no)\b/.test(old)) {
      feedback(el, el.classList.contains("ok"));
    } else if (el.classList.contains("opt") && el.classList.contains("sel") && !/\bsel\b/.test(old) && ok()) {
      g.fromTo(el, { y: 1 }, { y: 0, duration: .16, ease: EZ, clearProps: "transform" });
    }
  }

  function animateCounts(root) {
    $$("[data-count]", root).forEach(function (el) {
      var target = Number(el.dataset.count) || 0;
      if (!ok() || target > 1000000) { el.textContent = String(target); return; }
      var value = { n: 0 };
      g.to(value, { n: target, duration: .65, ease: EZ, onUpdate: function () { el.textContent = String(Math.round(value.n)); } });
    });
  }
  function animateBars(root) {
    $$(".pb i", root).forEach(function (bar, index) {
      var width = bar.style.width;
      if (width && ok()) g.fromTo(bar, { width: "0%" }, { width: width, duration: .65, delay: Math.min(index, 7) * .025, ease: EZ });
    });
  }
  function animateLongLists(root) {
    var items = $$(".rr,.wrong-q,.ab", root);
    if (!items.length || !ok()) return;
    if (ST) {
      g.set(items, { opacity: 0, y: 10 });
      ST.batch(items, { start: "top 96%", once: true, onEnter: function (batch) {
        g.to(batch, { opacity: 1, y: 0, duration: .28, ease: EZ, stagger: .025, overwrite: true, clearProps: "transform,opacity" });
      } });
    } else {
      g.from(items, { opacity: 0, y: 8, duration: .28, stagger: .025, ease: EZ, clearProps: "transform,opacity" });
    }
  }
  function drawLogo(selector, duration) {
    if (DS && ok()) g.from($$(selector), { drawSVG: 0, duration: duration || .7, ease: EZ, stagger: .025 });
  }

  var views = {
    gen: function () {
      var root = app;
      var children = [].slice.call(root.children).filter(function (el) {
        return el.tagName !== "SCRIPT" && getComputedStyle(el).position !== "fixed";
      });
      if (ok()) g.from(children, { y: 8, opacity: 0, duration: .28, ease: EZ, stagger: .025, clearProps: "transform,opacity" });
      animateLongLists(root); animateCounts(root); animateBars(root);
    },
    landing: function () {
      var parts = [$(".lp-title"), $(".lp-fig"), $(".lp-copy"), $(".lp-bar")].filter(Boolean);
      document.documentElement.classList.remove("hpm");
      if (ok()) g.from(parts, { y: 10, opacity: 0, duration: .42, ease: EZ, stagger: .06, clearProps: "opacity,transform" });
      drawLogo(".lp-name .ic path,.lp-name .ic circle", .7);
      var image = $("#lp-img");
      if (image && ok()) image.addEventListener("load", function () {
        if (ok()) g.fromTo(image, { opacity: 0 }, { opacity: 1, duration: .35, ease: EZ, clearProps: "opacity" });
      }, { once: true });
    },
    load: function () { drawLogo(".startup-loading path,.startup-loading circle", .8); },
    auth: function () {
      drawLogo(".auth-brand .ic path,.auth-brand .ic circle", .65);
      if (ok()) g.from(".auth-wrap>.card", { y: 8, opacity: 0, duration: .3, ease: EZ, clearProps: "transform,opacity" });
    },
    home: function () {
      if (ok()) {
        var tl = g.timeline({ defaults: { ease: EZ } });
        tl.from(".top,.header-meta", { y: -5, opacity: 0, duration: .24, stagger: .025, clearProps: "transform,opacity" })
          .from(".hb", { y: 8, opacity: 0, duration: .32, clearProps: "transform,opacity" }, .03)
          .from(".hm-sec", { y: 6, opacity: 0, duration: .26, stagger: .04, clearProps: "transform,opacity" }, .07)
          .from(".tc", { y: 6, opacity: 0, duration: .25, stagger: .025, clearProps: "transform,opacity" }, .08);
      }
      animateCounts(app); animateBars(app);
    },
    quiz: function () {
      if (!ok()) return;
      var tl = g.timeline({ defaults: { ease: EZ } });
      tl.from(".qv>.xt", { opacity: 0, y: -4, duration: .2, clearProps: "transform,opacity" })
        .from(".qv>h2", { opacity: 0, y: 5, duration: .24, clearProps: "transform,opacity" }, .02)
        .from(".qv>.img", { opacity: 0, duration: .3, clearProps: "opacity" }, .05)
        .from(".qv .opt", { opacity: 0, y: 5, duration: .22, stagger: .035, clearProps: "transform,opacity" }, .08);
    },
    res: function () {
      var ring = $(".rg .v");
      if (ring && ok()) {
        var length = 2 * Math.PI * 52;
        var pct = Number(ring.dataset.p) || 0;
        ring.style.strokeDasharray = length;
        g.fromTo(ring, { strokeDashoffset: length }, { strokeDashoffset: length * (1 - pct / 100), duration: .8, ease: EZ, delay: .08 });
        if (pct >= 80) g.delayedCall(.35, confetti);
      }
      if (ok()) g.from(".big,.big+.card,.wrong-list,#finish-status,#sync-status", { opacity: 0, y: 6, duration: .28, stagger: .035, ease: EZ, clearProps: "transform,opacity" });
      animateCounts(app); animateBars(app); animateLongLists(app);
    },
    prof: function () {
      if (ok()) {
        g.from("#perfil>.card,#perfil>.tgrid>.card,#perfil>.sub,#perfil>.ag .ab", { opacity: 0, y: 6, duration: .25, stagger: .025, ease: EZ, clearProps: "transform,opacity" });
      }
      animateCounts(app); animateBars(app); animateLongLists(app);
    },
    rank: function () { animateLongLists(app); }
  };

  function kind() {
    if ($("#landing")) return "landing";
    if ($(".auth-wrap")) return "auth";
    if ($(".startup-loading")) return "load";
    if ($(".qv")) return "quiz";
    if ($(".big")) return "res";
    if ($("#perfil")) return "prof";
    if ($("#rk")) return "rank";
    if ($(".hb")) return "home";
    return "gen";
  }
  function enter() {
    if (ctx) { try { ctx.revert(); } catch (_) {} }
    ctx = null;
    if (!ok()) return;
    ctx = g.context(function () { (views[kind()] || views.gen)(); }, app);
  }
  function podium(root) {
    if (!ok() || !root || !$(".pod,.rl", root)) return;
    if (ctx) { /* keep the active view context; podium updates are local */ }
    g.from($$(".pc", root), { opacity: 0, y: 8, duration: .3, ease: EZ, stagger: .05, clearProps: "transform,opacity" });
    animateLongLists(root);
  }

  var observer = new MutationObserver(function (mutations) {
    var viewChanged = false;
    mutations.forEach(function (m) {
      if (m.type === "attributes") animateClassMutation(m);
      if (m.type === "childList" && m.target === app) viewChanged = true;
      else if (m.type === "childList" && m.target && m.target.id === "rk") podium(m.target);
    });
    if (viewChanged) enter();
  });
  observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  function boot() {
    if (!ok()) document.documentElement.classList.remove("hpm");
    enter();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  RM.addEventListener && RM.addEventListener("change", function () { if (RM.matches) { if (ctx) ctx.revert(); ctx = null; } else enter(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && ok()) enter(); });
  window.HPM = { confetti: confetti, burst: burst };
})();
