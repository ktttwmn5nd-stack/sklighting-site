/* =========================================================
   (주)세광산업조명 — 2안 (v2.html) 전용 모션
   4-scene 시네마틱 히어로 (Ken Burns · 빛 줄기 · 파티클 · 장면 전환)
   ========================================================= */
(function () {
  'use strict';

  var d = document;
  var vh = d.getElementById('home');
  if (!vh || !vh.classList.contains('vh')) return;

  var slides = Array.prototype.slice.call(vh.querySelectorAll('.vh__slide'));
  var tabs = Array.prototype.slice.call(vh.querySelectorAll('.vh__tab'));
  var countEl = d.getElementById('vhCount');
  var ghostEl = d.getElementById('vhGhost');
  var cap = vh.querySelector('.vh__cap');
  var capK = d.getElementById('vhCapK');
  var capT = d.getElementById('vhCapT');
  var dock = vh.querySelector('.vh__dock');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SCENES = [
    { k: 'LANDSCAPE · RGB', t: '도시의 밤을, 색과 빛으로 디자인합니다' },
    { k: 'ROAD & STREET', t: '도로와 보행자의 밤을 끊김 없이 밝힙니다' },
    { k: 'TUNNEL & UNDERPASS', t: '어두운 구간도 균일한 빛으로 이어집니다' },
    { k: 'SPORTS FLOODLIGHT', t: '경기장을 낮처럼 만드는 고출력 조명타워' }
  ];
  var PALETTE = [
    [[125, 211, 252], [196, 181, 253], [245, 196, 81]],
    [[245, 196, 81], [253, 230, 138], [251, 146, 60]],
    [[219, 234, 254], [147, 197, 253], [255, 255, 255]],
    [[191, 219, 254], [96, 165, 250], [224, 242, 255]]
  ];

  var DUR = 8200;
  var cur = 0;
  var timer = null;
  var visible = true;
  var hovered = false;
  var capTimer = null;

  /* ---------- 캔버스: 빛줄기 + 파티클 ---------- */
  var fx = (function () {
    var cv = d.getElementById('vhFx');
    if (!cv) return { setPalette: function () {}, start: function () {}, stop: function () {} };
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, parts = [], rafId = null, last = 0, t = 0;
    var colors = PALETTE[0].map(function (c) { return c.slice(); });
    var target = PALETTE[0].map(function (c) { return c.slice(); });

    var sprite = (function () {
      var s = d.createElement('canvas');
      s.width = s.height = 64;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.34, 'rgba(214,234,255,.6)');
      g.addColorStop(1, 'rgba(140,190,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    })();

    function resize() {
      var r = vh.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(Math.round(r.width), 320);
      h = Math.max(Math.round(r.height), 420);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 700 ? 24 : 52;
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 1.9,
          vy: 0.08 + Math.random() * 0.26,
          vx: (Math.random() - 0.5) * 0.16,
          a: 0.16 + Math.random() * 0.5,
          ph: Math.random() * Math.PI * 2,
          sp: 0.6 + Math.random() * 1.5
        });
      }
    }

    function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

    function beams() {
      for (var i = 0; i < 3; i++) {
        var col = colors[i];
        var sway = Math.sin(t * 0.00013 + i * 2.1) * 0.055;
        var baseX = w * (0.58 + i * 0.14);
        var angle = 0.42 + sway + i * 0.06;
        var len = h * 1.55;
        var topW = 5 + i * 3;
        var strength = 0.16 * (i === 1 ? 1 : 0.7);

        ctx.save();
        ctx.translate(baseX, -h * 0.1);
        ctx.rotate(angle);
        var g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, rgba(col, strength));
        g.addColorStop(0.45, rgba(col, strength * 0.34));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-topW, 0);
        ctx.lineTo(topW, 0);
        ctx.lineTo(topW * 9, len);
        ctx.lineTo(-topW * 9, len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    function particles(dt) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy * (dt / 16);
        p.x += p.vx * (dt / 16);
        if (p.y < -30) { p.y = h + 20; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 10;
        if (p.x > w + 20) p.x = -10;
        var flick = 0.6 + Math.sin(t * 0.0015 * p.sp + p.ph) * 0.4;
        var s = p.r * 9;
        ctx.globalAlpha = Math.max(p.a * flick, 0.04);
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function frame(ts) {
      rafId = null;
      var dt = last ? Math.min(ts - last, 64) : 16;
      last = ts;
      t += dt;

      for (var i = 0; i < colors.length; i++) {
        for (var k = 0; k < 3; k++) {
          colors[i][k] += (target[i][k] - colors[i][k]) * 0.055;
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      beams();
      particles(dt);
      ctx.globalCompositeOperation = 'source-over';

      if (visible && !d.hidden) rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (reduce) { resize(); ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; beams(); particles(16); ctx.globalCompositeOperation = 'source-over'; return; }
      if (rafId) return;
      last = 0;
      rafId = window.requestAnimationFrame(frame);
    }
    function stop() {
      if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    }
    function setPalette(i) {
      var p = PALETTE[i] || PALETTE[0];
      target = p.map(function (c) { return c.slice(); });
      if (reduce) { colors = p.map(function (c) { return c.slice(); }); start(); }
    }

    window.addEventListener('resize', function () {
      resize();
      if (reduce) start();
    }, { passive: true });
    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.05 }).observe(vh);
    } else {
      visible = true;
      start();
    }
    start();

    return { setPalette: setPalette, start: start, stop: stop };
  })();

  /* ---------- 장면 전환 ---------- */
  function two(n) { return (n < 10 ? '0' : '') + n; }

  function go(i, user) {
    cur = ((i % slides.length) + slides.length) % slides.length;

    slides.forEach(function (s, idx) { s.classList.toggle('is-on', idx === cur); });

    tabs.forEach(function (b, idx) {
      var on = idx === cur;
      b.classList.remove('is-on');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) { void b.offsetWidth; b.classList.add('is-on'); }
    });

    vh.setAttribute('data-scene', String(cur));
    if (countEl) countEl.textContent = two(cur + 1) + ' / ' + two(slides.length);
    if (ghostEl) ghostEl.textContent = two(cur + 1);

    if (cap && capK && capT) {
      var meta = SCENES[cur] || SCENES[0];
      clearTimeout(capTimer);
      cap.classList.add('is-out');
      capTimer = setTimeout(function () {
        capK.textContent = meta.k;
        capT.textContent = meta.t;
        cap.classList.remove('is-out');
      }, reduce ? 0 : 260);
    }

    fx.setPalette(cur);
    if (user) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (reduce || !visible || d.hidden || hovered) return;
    timer = setTimeout(function () { go(cur + 1); }, DUR);
  }

  tabs.forEach(function (b, idx) {
    b.addEventListener('click', function () { go(idx, true); });
  });

  if (dock) {
    dock.addEventListener('pointerenter', function () { hovered = true; clearTimeout(timer); });
    dock.addEventListener('pointerleave', function () { hovered = false; schedule(); });
    dock.addEventListener('focusin', function () { hovered = true; clearTimeout(timer); });
    dock.addEventListener('focusout', function () { hovered = false; schedule(); });
  }

  d.addEventListener('visibilitychange', function () {
    if (d.hidden) clearTimeout(timer);
    else schedule();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) schedule(); else clearTimeout(timer);
    }, { threshold: 0.15 }).observe(vh);
  }

  go(0);
  schedule();
})();
