/* 大成新华演示站 · 网点飘落分隔条（独立模块，纯原生 Canvas 2D，无依赖）
 *
 * 作用于带 data-dotfall 的元素（.dot-rule）。分隔条第一次滚进视口时，几百颗网点从上方落下，
 * 带一点弹跳落到底部的四行半调网格里，从左到右依次落定；落定后一道“印刷波”扫过一次，然后静止，不再绘制。
 * 首页首屏向下滚动时，主视觉里的网点向下飘落（js/hero-fx.js），紧接着这里的第一条分隔条接住它们。
 *
 * 不做 / 停下：
 *  - 系统“减少动效”、地址带 ?motion=off、DCMotion 被关闭（含运行中途）：不创建画布或立即移除，显示 css/decor.css 里的静态网点条。
 *  - 首屏“暂停动效”按钮（html.fx-paused）：正在播放的分隔条暂停，恢复后继续。
 *  - 画布或脚本出错：移除画布，回到静态网点条。
 * 每条分隔条只播放一次（约 2–3 秒），之后不再占用任何绘制。
 */
(function (win, doc) {
  'use strict';

  var els = Array.prototype.slice.call(doc.querySelectorAll('[data-dotfall]'));
  var root = doc.documentElement;
  if (!els.length || !win.requestAnimationFrame || !('IntersectionObserver' in win)) return;

  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var forcedOff = /[?&]motion=off(&|$)/.test(win.location.search);
  function allowed() {
    if (forcedOff || (mqReduce && mqReduce.matches)) return false;
    if (win.DCMotion && typeof win.DCMotion.isEnabled === 'function') return !!win.DCMotion.isEnabled();
    return true;
  }
  if (!allowed()) return;

  var SP = 9, ROWS = 4, G = 2600, MAXDPR = 1.5;
  var INK = ['#1b49c8', '#1b49c8', '#1b49c8', '#2e6fde', '#121416'], CMYK = ['#00aeef', '#ec008c', '#e8c900'];
  var items = [], io = null, id = 0, last = 0, dead = false;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* 按分隔条当前宽度生成网点：底部四行、隔行错开半格，半径沿宽度做两段起伏，两端渐小 */
  function layout(it) {
    var w = it.el.clientWidth, ch = it.c.clientHeight, dpr = Math.min(win.devicePixelRatio || 1, MAXDPR);
    var cols, row, col, n, r, ramp, edge, d, rnd = Math.random, ph = it.phase;
    if (!w || !ch) return false;
    it.w = w; it.h = ch;
    it.c.width = Math.round(w * dpr); it.c.height = Math.round(ch * dpr);
    it.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.floor((w - SP) / SP);
    it.dots = [];
    for (row = 0; row < ROWS; row++) {
      for (col = 0; col <= cols; col++) {
        n = col / Math.max(1, cols);
        edge = Math.min(1, n / 0.12, (1 - n) / 0.12);
        ramp = 0.5 + 0.5 * Math.sin(n * Math.PI * 3 + ph + row * 0.5);
        r = (0.5 + 3.4 * ramp * edge) * (1 - row * 0.1);
        if (r < 0.9) continue;
        d = {
          tx: SP / 2 + col * SP + (row % 2) * SP / 2, ty: ch - 12 - row * SP, r: Math.min(r, SP / 2 - 0.3), n: n,
          color: rnd() < 0.035 ? CMYK[Math.floor(rnd() * 3)] : INK[Math.floor(rnd() * INK.length)],
          x: 0, y: 0, vy: 0, delay: n * 0.75 + rnd() * 0.5, done: false
        };
        d.x = d.tx + (rnd() - 0.5) * 48;
        d.y = -10 - rnd() * ch * 0.55;
        it.dots.push(d);
      }
    }
    return true;
  }
  function settleAll(it) {
    it.dots.forEach(function (d) { d.x = d.tx; d.y = d.ty; d.vy = 0; d.done = true; });
  }
  function draw(it) {
    var x = it.x, i, d, a, s, k, front = it.wave;
    x.clearRect(0, 0, it.w, it.h);
    for (i = 0; i < it.dots.length; i++) {
      d = it.dots[i];
      if (it.t < d.delay && !d.done) continue;
      a = clamp((d.y + 10) / 40, 0, 1);
      if (a <= 0) continue;
      s = 1;
      if (front > -1) { k = (d.n - front) / 0.06; s = 1 + 0.45 * Math.exp(-k * k); }
      x.globalAlpha = a;
      x.fillStyle = d.color;
      x.beginPath();
      x.arc(d.x, d.y, d.r * s, 0, 6.2832);
      x.fill();
    }
    x.globalAlpha = 1;
  }
  /* 推进一条分隔条：返回 true 表示还没播完 */
  function step(it, dt) {
    var i, d, all = true;
    it.t += dt;
    for (i = 0; i < it.dots.length; i++) {
      d = it.dots[i];
      if (d.done) continue;
      all = false;
      if (it.t < d.delay) continue;
      d.vy += G * dt;
      d.y += d.vy * dt;
      d.x += (d.tx - d.x) * Math.min(1, dt * 7);
      if (d.y >= d.ty) {
        d.y = d.ty;
        if (d.vy > 160) d.vy = -d.vy * 0.3;           // 落地弹一下
        else { d.vy = 0; d.x = d.tx; d.done = true; }
      }
    }
    if (all) {                                          // 全部落定后，一道印刷波扫过一次
      if (it.wave < -0.5) it.wave = -0.1;
      it.wave += dt * 0.9;
      if (it.wave > 1.15) { it.wave = -2; draw(it); return false; }
    }
    draw(it);
    return true;
  }

  function paused() { return root.classList.contains('fx-paused'); }
  function loop(now) {
    id = 0;
    if (dead) return;
    var dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016, busy = false;
    last = now;
    if (paused()) { last = 0; return; }
    try {
      items.forEach(function (it) {
        if (it.playing) { it.playing = step(it, dt); if (it.playing) busy = true; }
      });
    } catch (e) { teardown(); return; }
    if (busy) id = win.requestAnimationFrame(loop); else last = 0;
  }
  function kick() { if (!id && !dead && !paused()) id = win.requestAnimationFrame(loop); }

  function teardown() {
    dead = true;
    if (id && win.cancelAnimationFrame) win.cancelAnimationFrame(id);
    id = 0;
    if (io) { io.disconnect(); io = null; }
    items.forEach(function (it) {
      if (it.c.parentNode) it.c.parentNode.removeChild(it.c);
      it.el.classList.remove('df-on');
    });
    items = [];
  }

  function build() {
    els.forEach(function (el, i) {
      var c = doc.createElement('canvas'), x = c.getContext('2d'), it;
      if (!x) return;
      c.className = 'df-canvas'; c.setAttribute('aria-hidden', 'true');
      el.appendChild(c);
      it = { el: el, c: c, x: x, dots: [], t: 0, wave: -2, w: 0, h: 0, started: false, playing: false, phase: i * 1.7 };
      if (!layout(it)) { el.removeChild(c); return; }
      el.classList.add('df-on');
      items.push(it);
    });
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var it = items.filter(function (x) { return x.el === e.target; })[0];
        if (!it || it.started || !e.isIntersecting) return;
        it.started = true; it.playing = true; it.t = 0;
        io.unobserve(it.el);
        kick();
      });
    }, { threshold: 0.6 });
    items.forEach(function (it) { io.observe(it.el); });
  }

  /* 尺寸变化：重新排网点；已经开始播放的直接落定，避免画面跳动 */
  var rt = 0;
  function onResize() {
    win.clearTimeout(rt);
    rt = win.setTimeout(function () {
      if (dead) return;
      try {
        items.forEach(function (it) {
          if (!layout(it)) return;
          if (it.started) { settleAll(it); it.playing = false; it.wave = -2; draw(it); }
        });
      } catch (e) { teardown(); }
    }, 150);
  }

  try { build(); } catch (e) { teardown(); return; }
  win.addEventListener('resize', onResize, { passive: true });
  doc.addEventListener('dc:motion', function (e) { if (e && e.detail && e.detail.enabled === false) teardown(); });
  doc.addEventListener('dc:fxpause', function (e) { if (e && e.detail && !e.detail.paused) kick(); });
  if (mqReduce) {
    var onReduce = function (e) { if (e.matches) teardown(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }

  win.DCDotFall = {
    state: function () {
      return { dead: dead, rules: items.map(function (it) { return { dots: it.dots.length, started: it.started, playing: it.playing, t: Math.round(it.t * 100) / 100 }; }) };
    }
  };
})(window, document);
