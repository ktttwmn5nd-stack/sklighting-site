/* =========================================================================
   (주)세광산업조명 — full.html 전용 스크립트
   풀스크린 섹션 내비게이션 · 모션 · 슬라이더 · 모달
   ========================================================================= */
(function () {
  'use strict';

  var d = document;
  var qsa = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var panels = qsa('[data-panel]');
  var mqDesktop = window.matchMedia('(min-width: 1025px)');
  var modalOpen = false;

  function clamp(n, a, b) { return Math.min(Math.max(n, a), b); }

  /* ---------------- 1. 헤더 · 모바일 메뉴 ---------------- */
  (function header() {
    var hd = d.getElementById('fhd');
    var burger = d.getElementById('fburger');
    var nav = d.getElementById('fnav');
    if (!hd) return;

    function onScroll() {
      if (window.pageYOffset > 24) hd.classList.add('is-solid');
      else hd.classList.remove('is-solid');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (burger && nav) {
      burger.addEventListener('click', function () {
        var on = nav.classList.toggle('is-open');
        burger.classList.toggle('is-on', on);
        burger.setAttribute('aria-expanded', on ? 'true' : 'false');
        hd.classList.toggle('is-open', on);
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          nav.classList.remove('is-open');
          burger.classList.remove('is-on');
          burger.setAttribute('aria-expanded', 'false');
          hd.classList.remove('is-open');
        }
      });
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          nav.classList.remove('is-open');
          burger.classList.remove('is-on');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  })();

  /* ---------------- 2. 섹션 상태 · 진행률 · 도트 ---------------- */
  var dots = qsa('.fdot');
  var posEl = d.getElementById('fsPos');
  var lbEl = d.getElementById('fsLb');
  var labels = ['HERO','BUSINESS','MANUFACTURING','CERTIFICATION','REFERENCE','COMPANY','CONTACT'];
  var barEl = d.getElementById('fprogBar');
  var navLinks = qsa('.fnav a[data-goto]');
  var current = 0;

  function maxY() {
    return Math.max(0, (d.documentElement.scrollHeight || d.body.scrollHeight) - window.innerHeight);
  }
  function panelTop(i) {
    var el = panels[i];
    if (!el) return 0;
    var r = el.getBoundingClientRect();
    return Math.round(r.top + window.pageYOffset);
  }
  function targetY(i) { return Math.min(panelTop(i), maxY()); }

  function detect() {
    var y = window.pageYOffset, best = 0, bd = 1e12;
    for (var i = 0; i < panels.length; i++) {
      var dd = Math.abs(targetY(i) - y);
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  function paint(i) {
    current = i;
    dots.forEach(function (btn, idx) {
      btn.classList.toggle('is-on', idx === i);
      if (idx === i) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    panels.forEach(function (p, idx) { p.classList.toggle('is-active', idx === i); });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', parseInt(a.getAttribute('data-goto'), 10) === i);
    });
    if (posEl) posEl.textContent = ('0' + (i + 1)).slice(-2);
    if (lbEl) lbEl.textContent = labels[i] || '';
  }

  function progress() {
    var m = maxY();
    if (barEl) barEl.style.width = (m ? (window.pageYOffset / m) * 100 : 0) + '%';
  }

  /* ---------------- 3. 풀스크린 페이징 ---------------- */
  var animating = false;
  var lockUntil = 0;

  function animateTo(y, dur) {
    var start = window.pageYOffset;
    var dist = y - start;
    if (!dist) { animating = false; return; }
    var t0 = 0;
    animating = true;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      window.scrollTo(0, start + dist * e);
      if (p < 1) raf(frame);
      else { animating = false; lockUntil = Date.now() + 120; }
    }
    raf(frame);
  }

  function goto(i, instant) {
    i = clamp(i, 0, panels.length - 1);
    var y = targetY(i);
    paint(i);
    if (instant || reduce) {
      window.scrollTo(0, y);
      animating = false;
    } else {
      animateTo(y, 820);
    }
    var id = panels[i] && panels[i].id;
    if (id && window.history && history.replaceState) {
      history.replaceState(null, '', '#' + id);
    }
  }

  function panelFits(i) {
    var el = panels[i];
    if (!el) return true;
    return el.offsetHeight <= window.innerHeight + 12;
  }

  window.addEventListener('wheel', function (e) {
    if (!mqDesktop.matches || modalOpen) return;
    if (e.ctrlKey) return;
    if (Math.abs(e.deltaY) < 3 && Math.abs(e.deltaX) < 3) return;

    var dir = e.deltaY > 0 ? 1 : -1;
    var i = detect();

    /* 내용이 화면보다 긴 섹션은 안쪽 스크롤을 먼저 허용 */
    if (!panelFits(i)) {
      var el = panels[i];
      var top = panelTop(i);
      var bottom = top + el.offsetHeight;
      var y = window.pageYOffset;
      if (dir > 0 && bottom - window.innerHeight - y > 16) return;
      if (dir < 0 && y - top > 16) return;
    }
    e.preventDefault();
    if (animating || Date.now() < lockUntil) return;
    lockUntil = Date.now() + 1050;
    goto(i + dir);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (modalOpen) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === ' ') {
      e.preventDefault(); goto(detect() + 1);
    } else if (k === 'ArrowUp' || k === 'PageUp') {
      e.preventDefault(); goto(detect() - 1);
    } else if (k === 'Home') {
      e.preventDefault(); goto(0);
    } else if (k === 'End') {
      e.preventDefault(); goto(panels.length - 1);
    }
  });

  qsa('[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var i = parseInt(a.getAttribute('data-goto'), 10);
      if (isNaN(i)) return;
      e.preventDefault();
      goto(i);
    });
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    raf(function () {
      ticking = false;
      progress();
      if (!animating) {
        var i = detect();
        if (i !== current) paint(i);
      }
    });
  }, { passive: true });

  window.addEventListener('resize', function () {
    progress();
    paint(detect());
  });

  /* 초기 위치 */
  (function initPanel() {
    var h = (location.hash || '').replace('#', '');
    var idx = 0;
    if (h) {
      panels.forEach(function (p, i) { if (p.id === h) idx = i; });
    }
    paint(idx);
    progress();
    if (h && idx) {
      window.scrollTo(0, targetY(idx));
      paint(idx);
    }
  })();

  /* ---------------- 4. 숫자 카운터 ---------------- */
  (function counters() {
    var els = qsa('[data-count]');
    if (!els.length) return;
    function run(el) {
      var end = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduce) { el.textContent = end.toLocaleString('ko-KR'); return; }
      var t0 = 0, dur = 1500;
      function frame(ts) {
        if (!t0) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * e).toLocaleString('ko-KR');
        if (p < 1) raf(frame);
      }
      raf(frame);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting && !en.target.dataset.done) {
          en.target.dataset.done = '1';
          run(en.target);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- 5. 다중 이미지 크로스페이드 ---------------- */
  var moxSeen = new WeakMap();

  function startMox(root) {
    var items = Array.prototype.filter.call(root.children, function (c) {
      return c.classList && c.classList.contains('fmox__i');
    });
    if (items.length < 2) return;
    var cur = 0;
    items.forEach(function (it, i) { if (it.classList.contains('is-on')) cur = i; });
    var dur = parseInt(root.getAttribute('data-interval'), 10) || 6000;
    var timer = null;

    function paint(n) {
      cur = ((n % items.length) + items.length) % items.length;
      items.forEach(function (it, i) { it.classList.toggle('is-on', i === cur); });
    }
    function tick() {
      clearTimeout(timer);
      timer = setTimeout(function () { paint(cur + 1); tick(); }, dur);
    }
    tick();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) tick();
        else clearTimeout(timer);
      }, { threshold: 0.05 }).observe(root);
    }
    root._moxPaint = paint;
  }
  qsa('[data-mox]').forEach(startMox);

  /* ---------------- 6. 히어로 ---------------- */
  (function hero() {
    var root = d.querySelector('.pn--hero');
    if (!root) return;
    var slides = qsa('.fhero__s', root);
    var ticks = qsa('#fheroTicks button');
    var cur = 0, timer = null;

    function go(n) {
      cur = ((n % slides.length) + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); });
      ticks.forEach(function (t, i) { t.classList.toggle('is-on', i === cur); });
    }
    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { go(cur + 1); }, 7200);
    }
    ticks.forEach(function (t) {
      t.addEventListener('click', function () { go(parseInt(t.getAttribute('data-slide'), 10)); schedule(); });
    });
    go(0);
    schedule();

    /* 빛줄기 · 파티클 */
    var cv = d.getElementById('fheroFx');
    if (!cv || reduce) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var parts = [], beams = [], running = true, last = 0;

    function resize() {
      w = root.clientWidth; h = root.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 720 ? 22 : 46;
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * w,
          y: h * (0.25 + Math.random() * 0.8),
          r: 0.6 + Math.random() * 1.7,
          vy: -0.08 - Math.random() * 0.22,
          vx: (Math.random() - 0.5) * 0.12,
          a: 0.18 + Math.random() * 0.5,
          tw: Math.random() * Math.PI * 2
        });
      }
      beams = [
        { x: w * 0.12, wd: w * 0.30, a: 0.10 },
        { x: w * 0.34, wd: w * 0.22, a: 0.07 },
        { x: w * 0.58, wd: w * 0.34, a: 0.055 }
      ];
    }
    function drawBeams(t) {
      for (var i = 0; i < beams.length; i++) {
        var b = beams[i];
        var sway = Math.sin(t * 0.00018 + i * 1.7) * w * 0.035;
        var g = ctx.createLinearGradient(b.x + sway, 0, b.x + sway + b.wd * 0.4, h);
        g.addColorStop(0, 'rgba(150,196,255,' + b.a + ')');
        g.addColorStop(0.55, 'rgba(120,170,246,' + (b.a * 0.35) + ')');
        g.addColorStop(1, 'rgba(120,170,246,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(b.x + sway, -10);
        ctx.lineTo(b.x + sway + b.wd * 0.34, -10);
        ctx.lineTo(b.x + sway + b.wd * 0.95, h + 10);
        ctx.lineTo(b.x + sway - b.wd * 0.28, h + 10);
        ctx.closePath();
        ctx.fill();
      }
    }
    function frame(t) {
      if (!running) return;
      var dt = last ? Math.min((t - last) / 16.7, 3) : 1;
      last = t;
      ctx.clearRect(0, 0, w, h);
      drawBeams(t);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.tw += 0.02 * dt;
        if (p.y < h * 0.12) { p.y = h * 0.95; p.x = Math.random() * w; }
        var a = p.a * (0.55 + Math.sin(p.tw) * 0.45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226,238,255,' + a.toFixed(3) + ')';
        ctx.fill();
      }
      raf(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    raf(frame);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!running) { running = true; last = 0; raf(frame); } }
        else running = false;
      }, { threshold: 0.02 }).observe(root);
    }
    d.addEventListener('visibilitychange', function () {
      if (d.hidden) running = false;
      else if (!running) { running = true; last = 0; raf(frame); }
    });
  })();

  /* ---------------- 7. 제조 공정 스위처 ---------------- */
  (function stages() {
    var btns = qsa('.fstage');
    var groups = qsa('.fmfg__media .fmox');
    var kEl = d.getElementById('fmfgK');
    var cEl = d.getElementById('fmfgC');
    if (!btns.length || !groups.length) return;

    var meta = [
      { k: 'DESIGN · 연구소', c: '기업부설연구소와 설계부가 배광·구조·도면을 직접 설계합니다. 도로 조건과 시방서 요구까지 반영해 제작 도면을 만듭니다.' },
      { k: 'PRODUCTION · 생산', c: '생산 1·2동과 자재물류동에서 절곡기·자동용접기 등 89종 설비로 스테인리스·철제 등주와 조명타워, LED 등기구를 자체 생산합니다.' },
      { k: 'QUALITY & SUPPLY · 품질·납품', c: '자체 품질시험실에서 40종 검사설비로 전수 검사한 뒤, 출고·물류·현장 납품까지 한 회사가 책임집니다.' }
    ];
    var cur = 0, timer = null;

    function paint(i) {
      cur = i;
      btns.forEach(function (b, idx) {
        b.classList.remove('is-on');
        b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      });
      /* 진행 바 재시작 */
      var on = btns[i];
      void on.offsetWidth;
      on.classList.add('is-on');
      groups.forEach(function (g, idx) {
        g.hidden = idx !== i;
        if (idx === i && g._moxPaint) g._moxPaint(0);
      });
      if (kEl && meta[i]) kEl.textContent = meta[i].k;
      if (cEl && meta[i]) cEl.textContent = meta[i].c;
    }
    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { paint((cur + 1) % btns.length); }, 7400);
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        paint(parseInt(b.getAttribute('data-stage'), 10));
        schedule();
      });
    });
    paint(0);
    schedule();

    var root = d.querySelector('.fmfg__media');
    if (root) {
      root.addEventListener('pointerenter', function () { clearInterval(timer); });
      root.addEventListener('pointerleave', function () { schedule(); });
    }
  })();

  /* ---------------- 8. 사업영역 슬라이더 ---------------- */
  (function biz() {
    var slides = qsa('.fslide');
    var txts = qsa('[data-panel-txt]');
    var incls = qsa('[data-panel-incl]');
    var tabs = qsa('.ftab');
    var tabWrap = d.getElementById('fbizTabs');
    if (!slides.length) return;
    var cur = 0, timer = null;

    function paint(i) {
      cur = i;
      slides.forEach(function (s, idx) { s.classList.toggle('is-on', idx === i); });
      txts.forEach(function (t, idx) { t.classList.toggle('is-on', idx === i); });
      incls.forEach(function (t, idx) { t.classList.toggle('is-on', idx === i); });
      tabs.forEach(function (t, idx) {
        t.classList.remove('is-on');
        t.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      });
      var on = tabs[i];
      if (on) { void on.offsetWidth; on.classList.add('is-on'); }
    }
    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { paint((cur + 1) % slides.length); }, 7500);
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { paint(parseInt(t.getAttribute('data-slide'), 10)); schedule(); });
    });
    var prev = d.getElementById('fbizPrev');
    var next = d.getElementById('fbizNext');
    if (prev) prev.addEventListener('click', function () { paint((cur - 1 + slides.length) % slides.length); schedule(); });
    if (next) next.addEventListener('click', function () { paint((cur + 1) % slides.length); schedule(); });

    paint(0);
    schedule();
    var host = d.querySelector('.pn--biz');
    if (host) {
      host.addEventListener('pointerenter', function () { clearInterval(timer); if (tabWrap) tabWrap.classList.add('is-paused'); });
      host.addEventListener('pointerleave', function () { if (tabWrap) tabWrap.classList.remove('is-paused'); schedule(); });
    }
  })();

  /* ---------------- 9. 납품실적 슬라이더 ---------------- */
  (function cases() {
    var items = qsa('.fcase__item');
    var thumbs = qsa('.fcase__th');
    var noEl = d.getElementById('fcaseNo');
    var tEl = d.getElementById('fcaseT');
    var cEl = d.getElementById('fcaseC');
    var pEl = d.getElementById('fcasePos');
    if (!items.length) return;
    var meta = [
      ['01', '가로등주', '도로·보행로 조명 · 철제·스테인리스'],
      ['02', '신호등주', '교통신호등주 · 종합폴'],
      ['03', '조명타워', '고속도로 IC · 항만·광장 하이마스트'],
      ['04', 'LED 가로등·보안등기구', '간선·생활도로 · 고효율 LED'],
      ['05', 'LED 공원등·터널등기구', '공원·산책로 · 터널·지하차도'],
      ['06', '스포츠조명', '종합운동장 · 스포츠 투광'],
      ['07', '다리 경관조명', '교량·수변 · RGB & 웜골드'],
      ['08', '건물 경관조명', '공공·랜드마크 건축 외벽'],
      ['09', '실내 LED 등기구', '공공청사·오피스·학교·주차장']
    ];
    var cur = 0, timer = null;

    function paint(i) {
      cur = i;
      items.forEach(function (s, idx) { s.classList.toggle('is-on', idx === i); });
      thumbs.forEach(function (t, idx) { t.classList.toggle('is-on', idx === i); });
      if (noEl) noEl.textContent = meta[i][0];
      if (tEl) tEl.textContent = meta[i][1];
      if (cEl) cEl.textContent = meta[i][2];
      if (pEl) pEl.textContent = meta[i][0];
    }
    function schedule() {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(function () { paint((cur + 1) % items.length); }, 6200);
    }
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () { paint(parseInt(t.getAttribute('data-slide'), 10)); schedule(); });
    });
    var prev = d.getElementById('fcasePrev');
    var next = d.getElementById('fcaseNext');
    if (prev) prev.addEventListener('click', function () { paint((cur - 1 + items.length) % items.length); schedule(); });
    if (next) next.addEventListener('click', function () { paint((cur + 1) % items.length); schedule(); });

    paint(0);
    schedule();
    var host = d.querySelector('.pn--case');
    if (host) {
      host.addEventListener('pointerenter', function () { clearInterval(timer); });
      host.addEventListener('pointerleave', function () { schedule(); });
    }
  })();

  /* ---------------- 10. 라이트박스 ---------------- */
  (function lightbox() {
    var lb = d.getElementById('flightbox');
    if (!lb) return;
    var img = lb.querySelector('img');
    var cap = lb.querySelector('figcaption');
    var closeBtn = lb.querySelector('.flightbox__close');
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
      modalOpen = true;
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      lb.classList.remove('is-on');
      lb.setAttribute('aria-hidden', 'true');
      d.body.style.overflow = '';
      modalOpen = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    qsa('[data-full]').forEach(function (el) {
      var media = el.querySelector('img');
      var label = el.querySelector('h3');
      el.addEventListener('click', function (e) {
        if (e.target.closest('a,button.farrow')) return;
        var src = el.getAttribute('data-full');
        open(src, media ? media.alt : '', label ? label.textContent.trim() : '');
      });
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* ---------------- 11. 기업 홍보영상 ---------------- */
  (function video() {
    var modal = d.getElementById('fvideoModal');
    var frame = d.getElementById('fvideoFrame');
    if (!modal || !frame) return;
    var closeBtn = modal.querySelector('.fmodal__close');
    var lastFocus = null;

    function open(id) {
      if (!id) return;
      lastFocus = d.activeElement;
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1" title="세광산업조명 기업 홍보영상" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      modal.classList.add('is-on');
      modal.setAttribute('aria-hidden', 'false');
      d.body.style.overflow = 'hidden';
      modalOpen = true;
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      if (!modal.classList.contains('is-on')) return;
      frame.innerHTML = '';
      modal.classList.remove('is-on');
      modal.setAttribute('aria-hidden', 'true');
      d.body.style.overflow = '';
      modalOpen = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    qsa('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-video')); });
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* ---------------- 12. 문의 폼 (시안 UI) ---------------- */
  (function form() {
    var f = d.getElementById('fcform');
    if (!f) return;
    var err = d.getElementById('fc-err');
    var note = d.getElementById('fc-note');
    var required = ['fc-company', 'fc-name', 'fc-phone', 'fc-message'];

    function clearBad() {
      qsa('.ffield.is-bad, .fcheck.is-bad', f).forEach(function (el) { el.classList.remove('is-bad'); });
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
      var agree = d.getElementById('fc-agree');
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
        note.innerHTML = '<b>문의 내용이 확인되었습니다.</b> 이 화면은 리뉴얼 시안이라 실제로 전송되지는 않습니다. ' +
          '바로 상담이 필요하시면 <a href="tel:0316838700">031-683-8700</a> 또는 ' +
          '<a href="mailto:sklight2000@naver.com">sklight2000@naver.com</a>으로 연락 주세요.';
        note.hidden = false;
      }
      f.reset();
    });
  })();

})();
