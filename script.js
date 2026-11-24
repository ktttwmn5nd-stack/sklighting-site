/* =========================================================
   (주)세광산업조명 — v3 motion engine
   시네마틱 히어로 · 카운트업 · 인터랙티브 공정 · 마키 · 틸트
   ========================================================= */
(function () {
  'use strict';

  var d = document;
  var qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };

  /* =======================================================
     1. 스크롤 진행률 · 헤더 · 패럴랙스
     ======================================================= */
  var hd = d.getElementById('hd');
  var bar = d.getElementById('progressBar');
  var toTop = d.getElementById('toTop');
  var parEls = qsa('[data-parallax]');
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var max = (d.documentElement.scrollHeight - vh) || 1;

    if (bar) {
      var ratio = Math.min(Math.max(y / max, 0), 1);
      bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }
    if (hd && !d.body.classList.contains('nav-open')) hd.classList.toggle('is-stuck', y > 24);
    if (toTop) toTop.classList.toggle('is-on', y > 640);

    if (!reduce) {
      for (var i = 0; i < parEls.length; i++) {
        var el = parEls[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -160 || r.top > vh + 160) continue;
        var speed = parseFloat(el.getAttribute('data-speed')) || -0.05;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      }
    }
  }
  function askFrame() {
    if (!ticking) { ticking = true; raf(onFrame); }
  }
  window.addEventListener('scroll', askFrame, { passive: true });
  window.addEventListener('resize', askFrame);
  askFrame();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* =======================================================
     2. 모바일 내비게이션
     ======================================================= */
  var burger = d.getElementById('burger');
  var nav = d.getElementById('nav');
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    d.body.classList.remove('nav-open');
    if (burger) {
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', '메뉴 열기');
    }
    if (hd) hd.classList.toggle('is-stuck', (window.scrollY || 0) > 24);
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      d.body.classList.toggle('nav-open', open);
      if (hd) hd.classList.toggle('is-stuck', open || (window.scrollY || 0) > 24);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040) closeNav(); });
  }

  /* =======================================================
     3. 등장 리빌 (스태거)
     ======================================================= */
  var reveals = qsa('[data-reveal]');
  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =======================================================
     4. 숫자 카운트업
     ======================================================= */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce) { el.textContent = target.toLocaleString('ko-KR'); return; }
    var dur = target > 1000 ? 1900 : 1500;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString('ko-KR');
      if (p < 1) raf(step);
    }
    raf(step);
  }
  var counters = qsa('[data-count]');
  if (reduce) {
    counters.forEach(function (el) { el.textContent = (parseInt(el.getAttribute('data-count'), 10) || 0).toLocaleString('ko-KR'); });
  } else if (hasIO) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(countUp);
  }

  /* =======================================================
     5. 히어로 — Canvas 광원 · 빛 줄기
     ======================================================= */
  (function heroFx() {
    var cv = d.getElementById('heroFx');
    var hero = d.getElementById('home');
    var glowEl = d.getElementById('heroGlow');
    if (!cv || !hero) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var parts = [];
    var running = false;
    var visible = true;
    var last = 0;
    var mouse = { x: 0.72, y: 0.34, tx: 0.72, ty: 0.34 };

    var sprite = (function () {
      var s = d.createElement('canvas');
      s.width = s.height = 64;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(190,220,255,.62)');
      g.addColorStop(1, 'rgba(120,170,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    })();

    function resize() {
      var rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      w = Math.max(rect.width, 320);
      h = Math.max(rect.height, 420);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = w < 700 ? 26 : 58;
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 2.1,
          vy: -0.06 - Math.random() * 0.22,
          vx: (Math.random() - 0.5) * 0.12,
          a: 0.18 + Math.random() * 0.55,
          ph: Math.random() * Math.PI * 2,
          sp: 0.6 + Math.random() * 1.4
        });
      }
      if (reduce) draw(0);
    }

    function drawBeams(t) {
      var n = 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < n; i++) {
        var p = n === 1 ? 0.5 : i / (n - 1);
        var sway = Math.sin(t * 0.00016 + i * 1.7) * 0.05;
        var baseX = w * (0.46 + p * 0.46) + (mouse.x - 0.5) * w * 0.06;
        var angle = 0.36 + sway + (p - 0.5) * 0.1;
        var topW = w * 0.012 + 6;
        var len = h * 1.7;
        var strength = 0.17 * (1 - Math.abs(p - 0.5) * 0.9);

        ctx.save();
        ctx.translate(baseX, -h * 0.06);
        ctx.rotate(angle);
        var g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, 'rgba(158,200,255,' + strength.toFixed(3) + ')');
        g.addColorStop(0.4, 'rgba(120,172,255,' + (strength * 0.36).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(90,140,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-topW, 0);
        ctx.lineTo(topW, 0);
        ctx.lineTo(topW * 7.5, len);
        ctx.lineTo(-topW * 7.5, len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawParticles(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var pt = parts[i];
        var flick = 0.65 + Math.sin(t * 0.0016 * pt.sp + pt.ph) * 0.35;
        var s = pt.r * 9;
        ctx.globalAlpha = Math.max(pt.a * flick, 0.04);
        ctx.drawImage(sprite, pt.x - s / 2, pt.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawLightPool() {
      var cx = mouse.x * w, cy = mouse.y * h;
      var rad = Math.max(w, h) * 0.42;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(120,175,255,.11)');
      g.addColorStop(0.45, 'rgba(80,130,235,.05)');
      g.addColorStop(1, 'rgba(60,110,220,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      drawBeams(t);
      drawLightPool();
      drawParticles(t);
    }

    function moveParticles(dt) {
      for (var i = 0; i < parts.length; i++) {
        var pt = parts[i];
        pt.y += pt.vy * dt * 0.06;
        pt.x += pt.vx * dt * 0.06;
        if (pt.y < -20) { pt.y = h + 20; pt.x = Math.random() * w; }
        if (pt.x < -20) pt.x = w + 20;
        if (pt.x > w + 20) pt.x = -20;
      }
    }

    function loop(t) {
      if (!last) last = t;
      var dt = Math.min(t - last, 48);
      last = t;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      if (glowEl) {
        glowEl.style.transform = 'translate3d(' + (mouse.x * w).toFixed(1) + 'px,' + (mouse.y * h).toFixed(1) + 'px,0)';
      }
      moveParticles(dt);
      draw(t);
      if (running) raf(loop);
    }

    function start() {
      if (reduce || running) return;
      running = true;
      last = 0;
      raf(loop);
    }
    function stop() { running = false; }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      mouse.ty = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    }, { passive: true });

    d.addEventListener('visibilitychange', function () {
      if (d.hidden) stop(); else if (visible) start();
    });

    if (hasIO) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 160);
    });

    resize();
    hero.classList.add('is-live');
    if (!reduce) start();
  })();

  /* =======================================================
     6. 히어로 슬라이드 (Ken Burns · 크로스페이드)
     ======================================================= */
  (function heroSlides() {
    var slides = qsa('.hero__slide');
    var ticks = qsa('.hero__tick');
    if (slides.length < 2) return;
    var cur = 0;
    var timer = null;
    var DUR = 10000;

    function go(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, idx) { s.classList.toggle('is-on', idx === cur); });
      ticks.forEach(function (t, idx) {
        var on = idx === cur;
        t.classList.remove('is-on');
        if (on) { void t.offsetWidth; t.classList.add('is-on'); }
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () {
        if (d.hidden) return;
        go(cur + 1);
      }, DUR);
    }
    ticks.forEach(function (t, idx) {
      t.style.cursor = 'pointer';
      t.addEventListener('click', function () { go(idx); schedule(); });
    });
    go(0);
    schedule();
  })();

  /* =======================================================
     7. 인터랙티브 제조 공정 쇼케이스
     ======================================================= */
  (function showcase() {
    var root = d.getElementById('showcase');
    if (!root) return;
    var frames = qsa('.showcase__frame', root);
    var steps = qsa('.step', root);
    var DUR = 4000;
    var cur = 0;
    var timer = null;
    var paused = false;
    var visible = false;

    function setStep(i, user) {
      cur = (i + frames.length) % frames.length;
      frames.forEach(function (f, idx) { f.classList.toggle('is-on', idx === cur); });
      steps.forEach(function (s, idx) {
        var on = idx === cur;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      root.classList.remove('is-running');
      void root.offsetWidth;
      if (!reduce) root.classList.add('is-running');
      if (user) schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (reduce || paused || !visible) return;
      timer = setTimeout(function () {
        setStep(cur + 1);
        schedule();
      }, DUR);
    }

    steps.forEach(function (s) {
      s.addEventListener('click', function () {
        setStep(parseInt(s.getAttribute('data-step'), 10) || 0, true);
      });
    });

    root.addEventListener('pointerenter', function () { paused = true; root.classList.add('is-paused'); clearTimeout(timer); });
    root.addEventListener('pointerleave', function () { paused = false; root.classList.remove('is-paused'); schedule(); });
    root.addEventListener('focusin', function () { paused = true; root.classList.add('is-paused'); clearTimeout(timer); });
    root.addEventListener('focusout', function () { paused = false; root.classList.remove('is-paused'); schedule(); });

    if (hasIO) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) schedule(); else clearTimeout(timer);
      }, { threshold: 0.25 }).observe(root);
    } else {
      visible = true;
      schedule();
    }

    setStep(0);
  })();

  /* =======================================================
     8. 3D 틸트 · 스포트라이트
     ======================================================= */
  (function tilt() {
    if (reduce || !fine) return;
    qsa('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt-max')) || 6;
      var rafId = null;

      el.addEventListener('pointermove', function (e) {
        if (rafId) return;
        rafId = raf(function () {
          rafId = null;
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var px = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
          var py = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
          el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          el.classList.add('is-tilting');
        });
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  })();

  /* =======================================================
     9. 라이트박스 (시공사례 · 인증서)
     ======================================================= */
  (function lightbox() {
    var lb = d.getElementById('lightbox');
    if (!lb) return;
    var img = lb.querySelector('img');
    var cap = lb.querySelector('figcaption');
    var closeBtn = lb.querySelector('.lightbox__close');
    var lastFocus = null;

    function open(src, alt, caption) {
      if (!src) return;
      lastFocus = d.activeElement;
      img.src = src;
      img.alt = alt || '';
      if (cap) cap.textContent = caption || alt || '';
      lb.classList.add('is-on');
      lb.setAttribute('aria-hidden', 'false');
      d.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      lb.classList.remove('is-on');
      lb.setAttribute('aria-hidden', 'true');
      d.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    qsa('[data-full]').forEach(function (el) {
      var media = el.querySelector('img');
      var label = el.querySelector('h3') ? el.querySelector('h3').textContent.trim()
        : (el.querySelector('.gal__cap') || {}).textContent || '';
      if (el.tagName !== 'BUTTON') {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label + ' 크게 보기');
      }
      function fire() { open(el.getAttribute('data-full'), media ? media.alt : '', label); }
      el.addEventListener('click', fire);
      if (el.tagName !== 'BUTTON') {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
        });
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('is-on')) close();
    });
  })();

  /* =======================================================
     10. 기업 홍보영상 모달 (클릭 시에만 YouTube 로드)
     ======================================================= */
  (function videoModal() {
    var modal = d.getElementById('videoModal');
    var frame = d.getElementById('videoFrame');
    if (!modal || !frame) return;
    var closeBtn = modal.querySelector('.modal__close');
    var lastFocus = null;

    function open(id) {
      if (!id) return;
      lastFocus = d.activeElement;
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1" title="세광산업조명 기업 홍보영상" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe>';
      modal.classList.add('is-on');
      modal.setAttribute('aria-hidden', 'false');
      d.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      if (!modal.classList.contains('is-on')) return;
      frame.innerHTML = '';
      modal.classList.remove('is-on');
      modal.setAttribute('aria-hidden', 'true');
      d.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    qsa('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-video')); });
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  })();

  /* =======================================================
     11. 현재 섹션 내비 표시
     ======================================================= */
  (function activeNav() {
    var links = qsa('.nav a').filter(function (a) { return (a.getAttribute('href') || '').charAt(0) === '#'; });
    var secs = links.map(function (a) { return d.querySelector(a.getAttribute('href')); }).filter(Boolean);
    if (!hasIO || !secs.length) return;
    var current = null;
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) current = en.target; });
      if (!current) return;
      var top = (window.scrollY || 0) < 160;
      links.forEach(function (a) {
        a.classList.toggle('is-active', !top && a.getAttribute('href') === '#' + current.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { so.observe(s); });
    window.addEventListener('scroll', function () {
      if ((window.scrollY || 0) < 160) links.forEach(function (a) { a.classList.remove('is-active'); });
    }, { passive: true });
  })();

  /* =======================================================
     12. 문의 폼 (시안 UI)
     ======================================================= */
  (function form() {
    var f = d.getElementById('cform');
    if (!f) return;
    var err = d.getElementById('f-err');
    var note = d.getElementById('f-note');
    var required = ['f-company', 'f-name', 'f-phone', 'f-message'];

    function clearBad() {
      required.forEach(function (id) {
        var el = d.getElementById(id);
        if (el && el.parentElement) el.parentElement.classList.remove('is-bad');
      });
      var agree = d.getElementById('f-agree');
      if (agree && agree.parentElement) agree.parentElement.classList.remove('is-bad');
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      clearBad();
      if (err) err.hidden = true;
      if (note) note.hidden = true;

      var firstBad = null;
      required.forEach(function (id) {
        var el = d.getElementById(id);
        if (el && !String(el.value || '').trim()) {
          if (el.parentElement) el.parentElement.classList.add('is-bad');
          if (!firstBad) firstBad = el;
        }
      });
      var agree = d.getElementById('f-agree');
      if (agree && !agree.checked) {
        if (agree.parentElement) agree.parentElement.classList.add('is-bad');
        if (!firstBad) firstBad = agree;
      }

      if (firstBad) {
        if (err) {
          err.textContent = '필수 항목을 확인해 주세요. (회사명·담당자·연락처·문의 내용·개인정보 동의)';
          err.hidden = false;
        }
        firstBad.focus({ preventScroll: false });
        return;
      }

      if (note) {
        note.innerHTML = '<b>문의 내용이 확인되었습니다.</b>' +
          '이 화면은 리뉴얼 시안이라 실제로 전송되지는 않습니다. ' +
          '바로 상담이 필요하시면 <a href="tel:0316838700">031-683-8700</a> 또는 ' +
          '<a href="mailto:sklight2000@naver.com">sklight2000@naver.com</a>으로 연락 주세요.';
        note.hidden = false;
        note.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
      f.reset();
    });
  })();
})();
