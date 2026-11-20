/* 大成新华企业官网主题 · 首页出场特效（独立模块，纯原生 Canvas 2D，无依赖；移植自 dacheng-demo）
 *
 * 打开首页时：上千颗印刷网点从画面四周飞来，拼出公司简称，下方浮出公司全称与 CMYK 色标。
 * 简称与全称来自后台“公司资料”，由主题在本脚本之前输出 window.DCIntroConfig = {text, sub}。
 * WordPress 版：同一浏览器会话只播放一次（sessionStorage），刷新不再重播。
 *  - 互动：鼠标（或手指）划过时网点被拨开，离开后弹回原位；一道波光会周期性地扫过字面。
 *  - 退场：约 3.6 秒后自动退场；拨动网点时会多停留一会儿（最长约 8 秒）。点击任意处、滚轮、按任意键、
 *    或点“跳过开场”立即退场。退场时网点向下散落、遮罩淡出，同时首屏开始入场（motion.js、hero-fx.js 在等它）。
 *
 * 什么时候不播放（直接显示页面）：
 *  - 系统“减少动效”、地址带 ?motion=off 或 ?intro=0、动效被关闭；
 *  - 地址带锚点（如 index.html#services）；浏览器前进/后退返回；从本站其他页面点链接回到首页；
 *  - 页面在后台标签页中打开。
 *  - 本浏览器会话已经播放过一次。
 *  从站外打开首页时播放；地址加 ?intro=1 可强制播放。
 *
 * 安全约定：脚本在 <head> 里同步执行，决定播放时先给 <html> 加 .intro-on（css/intro.css 用纸色盖住页面，
 * 防止页面闪一下）；任何出错、或 9 秒内没有正常结束，都会立即移除遮罩并通知首屏开始入场。
 */
(function (win, doc) {
  'use strict';

  var root = doc.documentElement, q = win.location.search;
  var force = /[?&]intro=1(&|$)/.test(q);
  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqFine = win.matchMedia ? win.matchMedia('(hover: hover) and (pointer: fine)') : null;
  if (/[?&](intro=0|motion=off)(&|$)/.test(q)) return;
  if (!win.requestAnimationFrame || !doc.createElement('canvas').getContext) return;
  if (mqReduce && mqReduce.matches) return;
  if (win.DCMotion && typeof win.DCMotion.isEnabled === 'function' && !win.DCMotion.isEnabled()) return;
  if (!force && !shouldPlay()) return;

  function seen() { try { return win.sessionStorage.getItem('dc_intro_seen') === '1'; } catch (e) { return false; } }
  function shouldPlay() {
    var nav = null, type = 'navigate', ref = doc.referrer;
    if (win.location.hash) return false;                       // 带锚点打开：直接去目标位置
    if (seen()) return false;                                  // 本会话已播放过
    try { nav = win.performance && win.performance.getEntriesByType ? win.performance.getEntriesByType('navigation')[0] : null; } catch (e) { nav = null; }
    if (nav && nav.type) type = nav.type;
    if (type === 'back_forward') return false;
    if (ref) { try { if (new URL(ref, win.location.href).origin === win.location.origin) return false; } catch (e) { /* 忽略 */ } }
    return true;
  }

  root.classList.add('intro-on');
  try { win.sessionStorage.setItem('dc_intro_seen', '1'); } catch (e) { /* 无痕模式等：照常播放 */ }

  var CFG = win.DCIntroConfig || {};
  var TEXT = String(CFG.text || '大成新华').replace(/\s+/g, '').slice(0, 8) || '大成新华';
  var SUB = String(CFG.sub || '');
  var FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC","Hiragino Sans GB",sans-serif';
  var BLUE = '#1b49c8', INK = '#121416', CMYK = ['#00aeef', '#ec008c', '#e8c900'];
  var done = false, removed = false, el = null, cv = null, cx = null, dots = [], groups = {};
  var W = 0, H = 0, dpr = 1, gap = 8, elapsed = 0, last = 0, id = 0, formedAt = 0, formed = false;
  var phase = 'form', tExit = 0, deadline = 3.6, MAX_STAY = 8;
  var ptr = { x: -9999, y: -9999, on: false }, down = null, push = 0;
  var failsafe = win.setTimeout(function () { finish(true); }, 9000);

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOutBack(x) { var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  function notify() {
    var ev;
    try { ev = new win.CustomEvent('dc:intro-done'); }
    catch (e) { ev = doc.createEvent('CustomEvent'); ev.initCustomEvent('dc:intro-done', false, false, null); }
    doc.dispatchEvent(ev);
  }
  function remove() {
    if (removed) return;
    removed = true;
    if (id && win.cancelAnimationFrame) win.cancelAnimationFrame(id);
    id = 0;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null; dots = []; groups = {};
  }
  /* 结束开场：hard=true 时直接移除（出错、超时、后台标签页），否则播放退场 */
  function finish(hard) {
    if (done) return;
    done = true;
    win.clearTimeout(failsafe);
    unlisten();
    root.classList.remove('intro-on');
    try { notify(); } catch (e) { /* 监听方出错不影响这里 */ }
    if (hard || !el) { remove(); return; }
    phase = 'exit'; tExit = elapsed;
    dots.forEach(function (d) {
      d.fx = d.x; d.fy = d.y;
      d.evx = (Math.random() - 0.5) * 260; d.evy = -60 - Math.random() * 260; d.ex = 0; d.ey = 0;
    });
    el.classList.add('is-out');
    win.setTimeout(remove, 1000);
  }

  /* ---------- 用文字的形状生成网点 ---------- */
  function buildDots() {
    // 窄屏（手机）字号占比略大、网点更细，否则“成”“新”这类多笔画的字会糊在一起
    var narrow = W < 560;
    // 整行字宽约占屏宽的 76%（窄屏 86%），按字数平分；四个字时与演示站一致
    var per = (narrow ? 0.86 : 0.76) / Math.max(TEXT.length, 3);
    var fs = Math.min(W * per, H * 0.3, 300), ss = 3, oc = doc.createElement('canvas'), ox = oc.getContext('2d');
    var gfs, tw, cols, rows, data, i, j, a, u, v, k, cxp, cyp, rnd = Math.random, d, ang, R, col, n = 0;
    gap = clamp(Math.round(fs / 25), narrow ? 4 : 5, 12);
    gfs = fs / gap;                                            // 以“网点格”为单位的字号
    ox.font = '700 ' + (gfs * ss) + 'px ' + FONT;
    tw = ox.measureText(TEXT).width / ss;
    cols = Math.ceil(tw) + 2; rows = Math.ceil(gfs * 1.25) + 2;
    oc.width = cols * ss; oc.height = rows * ss;
    ox.font = '700 ' + (gfs * ss) + 'px ' + FONT;
    ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillStyle = '#000';
    ox.fillText(TEXT, oc.width / 2, oc.height / 2 + gfs * ss * 0.04);
    data = ox.getImageData(0, 0, oc.width, oc.height).data;
    cxp = W / 2; cyp = H * 0.46;
    dots = []; groups = {};
    for (j = 0; j < rows; j++) {
      for (i = 0; i < cols; i++) {
        a = 0;
        for (v = 0; v < ss; v++) for (u = 0; u < ss; u++) a += data[(((j * ss + v) * oc.width) + i * ss + u) * 4 + 3];
        a /= ss * ss * 255;
        if (a < 0.18) continue;
        k = rnd();
        col = k < 0.03 ? CMYK[Math.floor(rnd() * 3)] : (k < 0.08 ? INK : BLUE);
        ang = rnd() * 6.2832; R = Math.sqrt(W * W + H * H) * 0.55 * (0.7 + 0.6 * rnd());
        d = {
          tx: cxp + (i - cols / 2 + 0.5) * gap, ty: cyp + (j - rows / 2 + 0.5) * gap,
          r: gap * 0.5 * (0.35 + 0.65 * a) * 0.92, n: i / cols, col: col,
          sx: cxp + Math.cos(ang) * R, sy: cyp + Math.sin(ang) * R,
          delay: rnd() * 0.3 + (i / cols) * 0.3, dur: 0.85 + rnd() * 0.35,
          ox: 0, oy: 0, vx: 0, vy: 0, x: 0, y: 0
        };
        dots.push(d);
        (groups[col] = groups[col] || []).push(d);
        n++;
      }
    }
    el.style.setProperty('--ih', (rows * gap) + 'px');
    return n;
  }

  /* ---------- 每帧 ---------- */
  function step(dt) {
    var i, d, k, e, bx, by, dx, dy, dist, f, m, RR = Math.max(95, gap * 15), all = true;
    push = 0;
    if (phase === 'exit') {
      for (i = 0; i < dots.length; i++) {
        d = dots[i];
        d.evy += 2300 * dt; d.ex += d.evx * dt; d.ey += d.evy * dt;
        d.x = d.fx + d.ex; d.y = d.fy + d.ey;
      }
      return;
    }
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      k = clamp((elapsed - d.delay) / d.dur, 0, 1);
      if (k < 1) all = false;
      e = easeOutBack(k);
      bx = d.sx + (d.tx - d.sx) * e; by = d.sy + (d.ty - d.sy) * e;
      if (ptr.on && k > 0.5) {                                   // 拨开：离指针越近推得越远
        dx = bx + d.ox - ptr.x; dy = by + d.oy - ptr.y; dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < RR) { f = Math.pow(1 - dist / RR, 2) * 7600; d.vx += dx / dist * f * dt; d.vy += dy / dist * f * dt; }
      }
      d.vx += (-d.ox * 34 - d.vx * 5.5) * dt; d.vy += (-d.oy * 34 - d.vy * 5.5) * dt;   // 像弹簧一样慢慢弹回原位
      d.ox += d.vx * dt; d.oy += d.vy * dt;
      m = Math.abs(d.ox) + Math.abs(d.oy); if (m > push) push = m;
      d.x = bx + d.ox; d.y = by + d.oy;
    }
    if (all && !formed) { formed = true; formedAt = elapsed; el.classList.add('is-formed'); }
  }
  function draw() {
    var c, list, i, d, s, front, kx, alpha = 1;
    cx.clearRect(0, 0, W, H);
    if (phase === 'exit') alpha = clamp(1 - (elapsed - tExit) / 0.8, 0, 1);
    front = formed && phase !== 'exit' ? ((elapsed - formedAt) % 2.2) / 2.2 * 1.6 - 0.3 : -9;   // 波光：从左到右扫过字面
    cx.globalAlpha = alpha;
    for (c in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, c)) continue;
      list = groups[c];
      cx.fillStyle = c;
      cx.beginPath();
      for (i = 0; i < list.length; i++) {
        d = list[i];
        kx = (d.n - front) / 0.07;
        s = 1 + 0.32 * Math.exp(-kx * kx);
        cx.moveTo(d.x + d.r * s, d.y);
        cx.arc(d.x, d.y, d.r * s, 0, 6.2832);
      }
      cx.fill();
    }
    cx.globalAlpha = 1;
  }
  function loop(now) {
    id = 0;
    if (removed) return;
    var dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016;
    last = now; elapsed += dt;
    try { step(dt); draw(); } catch (e) { finish(true); return; }
    if (phase === 'form' && elapsed > deadline) finish(false);
    if (!removed) id = win.requestAnimationFrame(loop);
  }

  /* ---------- 交互 ---------- */
  function onMove(e) {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
    deadline = Math.min(Math.max(deadline, elapsed + 1.8), MAX_STAY);   // 正在拨动：多停留一会儿
  }
  function onLeave() { ptr.on = false; }
  function onDown(e) { down = { x: e.clientX, y: e.clientY }; onMove(e); }
  function onUp(e) {
    if (e.pointerType !== 'mouse') ptr.on = false;
    if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 12) finish(false);   // 轻点 / 单击：进入
    down = null;
  }
  // 用来跳过开场的这一下按键 / 滚轮不再让页面滚走，退场后首屏仍停在顶部（Tab 照常移动焦点）
  var SCROLL_KEYS = { ' ': 1, Spacebar: 1, PageDown: 1, PageUp: 1, ArrowDown: 1, ArrowUp: 1, Home: 1, End: 1, Enter: 1 };
  function onKey(e) {
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    if (SCROLL_KEYS[e.key]) e.preventDefault();
    finish(false);
  }
  function onSkip(e) { e.stopPropagation(); finish(false); }
  function onWheel(e) { if (e.cancelable) e.preventDefault(); finish(false); }
  function onResize() { finish(false); }
  function onVis() { if (doc.hidden) finish(true); }
  function listen() {
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.querySelector('.intro-skip').addEventListener('click', onSkip);
    win.addEventListener('keydown', onKey);
    win.addEventListener('wheel', onWheel, { passive: false });
    win.addEventListener('resize', onResize);
    doc.addEventListener('visibilitychange', onVis);
  }
  function unlisten() {
    if (el) {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
    }
    win.removeEventListener('keydown', onKey);
    win.removeEventListener('wheel', onWheel, { passive: false });
    win.removeEventListener('resize', onResize);
    doc.removeEventListener('visibilitychange', onVis);
  }

  /* ---------- 建立 ---------- */
  function build() {
    if (done) return;
    if (doc.hidden) { finish(true); return; }                  // 后台标签页：不播放
    var fine = !!(mqFine && mqFine.matches);
    el = doc.createElement('div');
    el.className = 'intro';
    el.innerHTML = '<canvas aria-hidden="true"></canvas>' +
      '<p class="intro-sub" aria-hidden="true"><i></i><span></span></p>' +
      '<p class="intro-hint" aria-hidden="true">' + (fine ? '移动鼠标拨动网点 · 单击任意处进入' : '手指划过拨动网点 · 轻点进入') + '</p>' +
      '<button type="button" class="intro-skip">跳过开场</button>';
    el.querySelector('.intro-sub span').textContent = SUB;    // 公司全称来自后台，按纯文本写入
    if (!SUB) el.querySelector('.intro-sub').style.display = 'none';
    doc.body.appendChild(el);
    cv = el.firstChild; cx = cv.getContext('2d');
    if (!cx) throw new Error('no 2d');
    W = win.innerWidth || root.clientWidth; H = win.innerHeight || root.clientHeight;
    dpr = Math.min(win.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!buildDots()) throw new Error('no dots');
    listen();
    id = win.requestAnimationFrame(loop);
  }
  function start() { try { build(); } catch (e) { finish(true); } }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();

  win.DCIntro = {
    state: function () { return { playing: !done, phase: phase, dots: dots.length, elapsed: Math.round(elapsed * 100) / 100, formed: formed, gap: gap, maxPushPx: Math.round(push), pointer: ptr.on }; },
    skip: function () { finish(false); }
  };
})(window, document);
