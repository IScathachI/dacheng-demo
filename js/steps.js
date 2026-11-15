/* 大成新华演示站 · 服务流程时间线（独立模块，纯原生，无依赖）
 *
 * 作用于 [data-steps]（首页“从诊断到落地，五步推进”）。
 * 随着页面滚动，顶部进度线从左往右填满；走到哪一步，那一步的图标点亮、卡片浮起、编号由描边变实心。
 * 往回滚动时会退回，是随滚动可逆的。不监听鼠标，不阻止滚动。
 *
 * 不做：系统“减少动效”、?motion=off、DCMotion 被关闭（含运行中途）时不启用，五步全部以点亮状态静态显示。
 * 样式在 css/decor.css 的“服务流程时间线”一节。
 */
(function (win, doc) {
  'use strict';

  var list = doc.querySelector('[data-steps]');
  if (!list || !win.requestAnimationFrame) return;
  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var forcedOff = /[?&]motion=off(&|$)/.test(win.location.search);
  if (forcedOff || (mqReduce && mqReduce.matches)) return;
  if (win.DCMotion && typeof win.DCMotion.isEnabled === 'function' && !win.DCMotion.isEnabled()) return;

  var items = Array.prototype.slice.call(list.children), ticking = false, active = true;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function update() {
    ticking = false;
    if (!active) return;
    var r = list.getBoundingClientRect(), vh = win.innerHeight || doc.documentElement.clientHeight;
    if (r.bottom < -200 || r.top > vh + 200) return;
    // 列表上沿进入视口下部 18% 处开始，列表下沿到达视口中上部时走完
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1), n = items.length, i;
    list.style.setProperty('--p', p.toFixed(3));
    for (i = 0; i < n; i++) items[i].classList[p >= i / n + 0.06 ? 'add' : 'remove']('is-on');
  }
  function onScroll() { if (!ticking) { ticking = true; win.requestAnimationFrame(update); } }
  function off() {
    active = false;
    win.removeEventListener('scroll', onScroll);
    win.removeEventListener('resize', onScroll);
    list.classList.remove('is-live');
    list.style.removeProperty('--p');
    items.forEach(function (li) { li.classList.remove('is-on'); });
  }

  list.classList.add('is-live');
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', onScroll, { passive: true });
  doc.addEventListener('dc:motion', function (e) { if (e && e.detail && e.detail.enabled === false) off(); });
  if (mqReduce) {
    var onReduce = function (e) { if (e.matches) off(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }
  update();
})(window, document);
