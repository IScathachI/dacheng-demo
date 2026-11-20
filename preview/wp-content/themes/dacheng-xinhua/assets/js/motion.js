/* 大成新华演示站 · 动效模块（纯原生，无依赖；与 main.js 的内容/表单逻辑互不依赖）
 *
 * 加载方式：在 <head> 里同步引入（<script src="js/motion.js"></script>），
 * 这样首屏不会出现“先显示、再隐藏、再进入”的闪动。
 *
 * 安全约定：
 *  - 内容默认可见。只有本脚本运行、浏览器支持 IntersectionObserver、
 *    且用户未开启“减少动效”时，才给 <html> 加 .motion-ok（css/motion.css 据此生效）。
 *  - 初始化出错或 3 秒内未完成，会自动撤销 .motion-ok，页面回到全部可见。
 *  - 不劫持滚动、不替换鼠标指针、不播放声音。
 *
 * HTML 约定见 css/motion.css 顶部说明（data-reveal / data-reveal-group /
 * data-split / data-scrub / data-parallax / data-delay）。
 *
 * 对外接口：window.DCMotion.refresh() 重新扫描新增内容；DCMotion.disable() 关闭动效。
 * 关闭时会在 document 上派发 dc:motion 事件（detail.enabled=false），首屏光效与服务翻牌据此一并停止。
 * 复查开关：任意页面地址加 ?motion=off（或 &motion=off）即以“无动效”状态打开，便于整页截图核对内容。
 */
(function (win, doc) {
  'use strict';

  var root = doc.documentElement;
  var STEP = 80;          // 同批进入的错峰间隔（ms）
  var MAX_STEP = 6;       // 错峰上限，避免长列表拖得太久
  var reduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var supported = 'IntersectionObserver' in win && 'requestAnimationFrame' in win && !!root.classList;
  var forcedOff = /[?&]motion=off(&|$)/.test(win.location.search);   // 复查/整页截图用：地址加 ?motion=off 可关闭动效
  var enabled = supported && !forcedOff && !(reduce && reduce.matches);
  var booted = false, failsafe = 0, ticking = false;
  var io = null, mo = null, scrubs = [], pars = [];

  if (enabled) {
    root.classList.add('motion-ok');
    failsafe = win.setTimeout(function () { if (!booted) disable(); }, 3000);
  }

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- 关闭：撤销全部状态，页面保持可读 ---------- */
  function disable() {
    enabled = false;
    win.clearTimeout(failsafe);
    root.classList.remove('motion-ok', 'motion-ready');
    if (io) { io.disconnect(); io = null; }
    if (mo) { mo.disconnect(); mo = null; }
    win.removeEventListener('scroll', onScroll);
    win.removeEventListener('resize', onScroll);
    pars.forEach(function (p) { p.el.style.removeProperty('--py'); });
    scrubs = []; pars = []; waiting = [];
    notify(false);
  }
  /* 通知其他效果模块（js/hero-fx.js、js/flip.js）动效已关闭，让它们一并停下 */
  function notify(on) {
    var ev;
    try { ev = new win.CustomEvent('dc:motion', { detail: { enabled: on } }); }
    catch (e) { try { ev = doc.createEvent('CustomEvent'); ev.initCustomEvent('dc:motion', false, false, { enabled: on }); } catch (e2) { return; } }
    try { doc.dispatchEvent(ev); } catch (e3) { /* 监听方出错不影响这里 */ }
  }

  /* ---------- 页头滚动状态（不属于动画，始终生效） ---------- */
  function headerState() {
    var h = doc.querySelector('.site-header');
    if (!h) return;
    function set() { h.classList[(win.pageYOffset || root.scrollTop || 0) > 8 ? 'add' : 'remove']('is-scrolled'); }
    win.addEventListener('scroll', set, { passive: true });
    set();
  }

  /* ---------- 标题分行：把每一行内容包进 .ln-i ---------- */
  function prepSplit(el) {
    if (el.classList.contains('is-split')) return;
    var lines = all('.ln', el), i, inner, ln;
    if (!lines.length) {
      ln = doc.createElement('span'); ln.className = 'ln';
      while (el.firstChild) ln.appendChild(el.firstChild);
      el.appendChild(ln); lines = [ln];
    }
    for (i = 0; i < lines.length; i++) {
      ln = lines[i];
      inner = doc.createElement('span'); inner.className = 'ln-i';
      inner.style.setProperty('--i', i);
      while (ln.firstChild) inner.appendChild(ln.firstChild);
      ln.appendChild(inner);
    }
    el.setAttribute('data-lines', lines.length);
    el.classList.add('is-split');
  }

  /* ---------- 进入 ---------- */
  function doneAfter(el) {
    if (el.hasAttribute('data-split')) return 900 + (parseInt(el.getAttribute('data-lines'), 10) || 1) * 90;
    if (el.getAttribute('data-reveal') === 'clip') return 1750;   // 覆盖全屏版较长的展开与缩放
    return 1150;   // 含组件内部的延后细节（如流程蓝线）
  }
  function show(el, delay, instant) {
    if (instant) { el.classList.add('is-in', 'is-done'); return; }
    var d = delay + (parseInt(el.getAttribute('data-delay'), 10) || 0);
    if (d) el.style.setProperty('--d', d + 'ms');
    el.classList.add('is-in');
    win.setTimeout(function () { el.classList.add('is-done'); el.style.removeProperty('--d'); }, d + doneAfter(el));
  }
  function domOrder(a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; }
  function onIntersect(entries) {
    var batch = [];
    entries.forEach(function (en) {
      var el = en.target;
      if (en.isIntersecting) batch.push(el);
      else if (en.boundingClientRect.bottom <= 0) show(el, 0, true);   // 已在视口上方：直接显示
      else return;
      io.unobserve(el);
    });
    batch.sort(domOrder);
    batch.forEach(function (el, i) { show(el, Math.min(i, MAX_STEP) * STEP, false); });
  }
  var pending = null;   // 非空时表示正在做一次“同步首屏判断”
  var waiting = [];     // 已交给 IntersectionObserver、尚未进入的元素（滚到页面底部时兜底显示）
  function flushAtBottom(vh) {
    if (!waiting.length) return;
    var y = win.pageYOffset || root.scrollTop || 0;
    if (y + vh < root.scrollHeight - 4) return;
    var rest = waiting; waiting = [];
    rest.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      if (io) io.unobserve(el);
      show(el, 0, false);
    });
  }
  function watch(el) {
    if (!io || el.nodeType !== 1 || el.classList.contains('is-in') || el.__dcWatched) return;
    var t = el.tagName;
    if (t === 'NOSCRIPT' || t === 'SCRIPT' || t === 'TEMPLATE' || t === 'STYLE') return;
    el.__dcWatched = true;
    if (pending) pending.push(el); else io.observe(el);
  }
  /* 扫描并登记目标。
     已经在视口内的元素不等 IntersectionObserver，直接在这里进入：
     这样首屏内容不依赖浏览器何时派发可见性回调（后台标签页、截图工具等场景更稳）。
     读取位置会让浏览器先按“隐藏初始态”计算一次样式，所以随后加类仍会有过渡。 */
  function place(list) {
    var vh = win.innerHeight || root.clientHeight, now = [];
    list.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom <= 0) show(el, 0, true);                       // 在视口上方（如带锚点打开）：直接显示
      else if (r.top < vh && (r.width || r.height)) now.push(el);
      else { waiting.push(el); io.observe(el); }                  // 视口以下：滚动到时再进入
    });
    now.sort(domOrder);
    now.forEach(function (el, i) { show(el, Math.min(i, MAX_STEP) * STEP, false); });
  }
  function scan(ctx) {
    var list;
    pending = [];
    all('[data-split]', ctx).forEach(function (el) { prepSplit(el); watch(el); });
    all('[data-reveal]', ctx).forEach(watch);
    all('[data-reveal-group]', ctx).forEach(function (g) {
      Array.prototype.forEach.call(g.children, watch);
      if (mo && !g.__dcGroup) { g.__dcGroup = true; mo.observe(g, { childList: true }); }
    });
    list = pending; pending = null;
    place(list);
  }
  /* 分组内容被脚本重新渲染（如专题筛选）时，新子元素同样进入（同样先做同步判断） */
  function onMutate(records) {
    var list;
    pending = [];
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, watch);
    });
    list = pending; pending = null;
    if (list.length) place(list);
  }

  /* ---------- 滚动联动：文字分段点亮 + 轻视差（rAF 节流，只读不改滚动） ---------- */
  function finePointer() {
    return !!win.matchMedia && win.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;
  }
  function onScroll() { if (!ticking) { ticking = true; win.requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    if (!enabled) return;
    var vh = win.innerHeight || root.clientHeight, i, k, s, p, r, n, count, y;
    flushAtBottom(vh);   // 已到页面底部仍未进入的元素，直接显示，避免任何内容被永久隐藏
    for (i = 0; i < scrubs.length; i++) {
      s = scrubs[i];
      if (s.done) continue;
      r = s.el.getBoundingClientRect();
      if (r.top > vh) continue;
      n = s.segs.length;
      p = (vh * 0.88 - r.top) / (r.height + vh * 0.3);
      count = Math.max(0, Math.min(n, Math.floor(p * (n + 1))));
      if (count > s.count) {                       // 只增不减：读过的文字不再变灰
        for (k = s.count; k < count; k++) s.segs[k].classList.add('on');
        s.count = count;
        if (count === n) s.done = true;
      }
    }
    for (i = 0; i < pars.length; i++) {
      p = pars[i];
      r = p.el.getBoundingClientRect();
      if ((!r.width && !r.height) || r.bottom < -200 || r.top > vh + 200) continue;   // 未显示（如回退用的 SVG）或离屏的不处理
      y = ((r.top - p.y) + r.height / 2 - vh / 2) * p.f;   // 减去已施加的位移，避免自我叠加
      y = Math.max(-60, Math.min(60, Math.round(y * 10) / 10));
      if (y !== p.y) { p.y = y; p.el.style.setProperty('--py', y + 'px'); }
    }
  }
  function collectScroll() {
    all('[data-scrub]').forEach(function (el) {
      if (el.__dcScrub) return;
      var segs = all('.seg', el);
      if (!segs.length) return;
      el.__dcScrub = true;
      el.classList.add('is-scrub');
      scrubs.push({ el: el, segs: segs, count: 0, done: false });
    });
    if (finePointer()) {
      all('[data-parallax]').forEach(function (el) {
        if (el.__dcPar) return;
        el.__dcPar = true;
        pars.push({ el: el, f: parseFloat(el.getAttribute('data-parallax')) || 0.06, y: 0 });
      });
    }
  }

  /* ---------- 启动 ---------- */
  function begin() {
    scan(doc);
    collectScroll();
    win.addEventListener('scroll', onScroll, { passive: true });
    win.addEventListener('resize', onScroll, { passive: true });
    update();
  }
  function boot() {
    io = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    if ('MutationObserver' in win) mo = new MutationObserver(onMutate);
    booted = true;
    win.clearTimeout(failsafe);
    root.classList.add('motion-ready');
    if (reduce) {
      var onChange = function (e) { if (e.matches) disable(); };
      if (reduce.addEventListener) reduce.addEventListener('change', onChange);
      else if (reduce.addListener) reduce.addListener(onChange);
    }
    // 首页出场特效（js/intro.js）正在播放时，首屏的进入动画等它结束再开始，免得在遮罩后面悄悄播完
    if (root.classList.contains('intro-on')) {
      var go = function () {
        doc.removeEventListener('dc:intro-done', go);
        if (!enabled) return;
        try { begin(); } catch (e) { disable(); }
      };
      doc.addEventListener('dc:intro-done', go);
      return;
    }
    begin();
  }
  function start() {
    try { headerState(); } catch (e) { /* 页头状态失败不影响阅读 */ }
    if (!enabled) return;
    try { boot(); } catch (e) { disable(); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();

  win.DCMotion = {
    refresh: function () { if (enabled && booted) { try { scan(doc); collectScroll(); update(); } catch (e) { disable(); } } },
    disable: disable,
    isEnabled: function () { return enabled; }
  };
})(window, document);
