/* 大成新华演示站 · 服务翻牌交互（第三版，纯原生，无依赖）
 *
 * 作用于带 data-flip-grid 的容器（卡片结构见 css/flip.css 顶部说明，由 js/main.js 的 svcFlip() 生成）。
 * 需放在 main.js 之后加载（卡片是 main.js 渲染出来的）。
 *
 * 操作方式：
 *  - 点正面的“查看简介”按钮，或点卡片空白处：翻到背面；背面有“了解详情”链接和“翻回正面”按钮。
 *  - 键盘：Tab 到按钮后按 Enter / 空格翻面；焦点在已翻开的卡片内时按 Esc 翻回。
 *  - 触屏：点按即可，不依赖悬停，不影响页面滚动。
 *  - 桌面精确指针：悬停时卡片轻微倾斜（只在进入某张卡片时读一次位置）。
 *
 * 无障碍：翻面按钮与详情链接是两个独立控件，没有嵌套；背对用户的一面加 inert 与 aria-hidden，
 * 并由样式设为 visibility:hidden，其中的链接/按钮不会被 Tab 到；用按钮翻面后焦点移到新露出的一面。
 *
 * 动效关闭（系统“减少动效”、?motion=off、DCMotion.disable()）时不启用翻牌：
 * 卡片保持静态展开，名称、介绍、详情链接全部直接可见。
 */
(function (win, doc) {
  'use strict';

  var grids = Array.prototype.slice.call(doc.querySelectorAll('[data-flip-grid]'));
  if (!grids.length) return;

  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqFine = win.matchMedia ? win.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var forcedOff = /[?&]motion=off(&|$)/.test(win.location.search);
  var active = false;
  var tilt = { card: null, rect: null, x: 0, y: 0, id: 0 };

  function motionAllowed() {
    if (forcedOff || (mqReduce && mqReduce.matches)) return false;
    if (win.DCMotion && typeof win.DCMotion.isEnabled === 'function') return !!win.DCMotion.isEnabled();
    return true;
  }
  function cardsOf(g) { return Array.prototype.slice.call(g.querySelectorAll('.flip')); }
  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) { el.setAttribute('aria-hidden', 'true'); el.setAttribute('inert', ''); }
    else { el.removeAttribute('aria-hidden'); el.removeAttribute('inert'); }
  }
  /* 按当前朝向同步两面的可达性与按钮状态 */
  function syncCard(card) {
    var flipped = card.classList.contains('is-flipped');
    var b = card.querySelector('.flip-front .flip-btn');
    setHidden(card.querySelector('.flip-front'), flipped);
    setHidden(card.querySelector('.flip-back'), !flipped);
    if (b) b.setAttribute('aria-expanded', String(flipped));
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }
  function flip(card, to, moveFocus) {
    var flipped = typeof to === 'boolean' ? to : !card.classList.contains('is-flipped');
    var hadFocus = card.contains(doc.activeElement);
    card.classList[flipped ? 'add' : 'remove']('is-flipped');
    syncCard(card);
    // 用按钮/键盘翻面，或焦点原本就在将被隐藏的一面里：把焦点移到新露出的一面
    if (moveFocus || hadFocus) focusEl(flipped ? card.querySelector('.flip-back') : card.querySelector('.flip-front .flip-btn'));
  }

  function onClick(e) {
    if (!active) return;
    var t = e.target, card = t.closest ? t.closest('.flip') : null, btn;
    if (!card) return;
    btn = t.closest('.flip-btn');
    if (btn) { flip(card, btn.getAttribute('data-flip-to') !== 'front', true); return; }
    if (t.closest('a,button,input,select,textarea,label')) return;          // 链接等控件照常工作
    if (win.getSelection && String(win.getSelection())) return;             // 正在选中文字时不翻
    flip(card, undefined, false);
  }
  function onKey(e) {
    if (!active || e.key !== 'Escape') return;
    var card = e.target.closest ? e.target.closest('.flip.is-flipped') : null;
    if (card) flip(card, false, true);
  }

  /* 悬停倾斜：位置只在进入某张卡片时读一次，之后每帧只写两个 CSS 变量 */
  function resetTilt() {
    var turn = tilt.card && tilt.card.querySelector('.flip-turn');
    if (turn) { turn.style.removeProperty('--tx'); turn.style.removeProperty('--ty'); }
    tilt.card = null; tilt.rect = null;
  }
  function applyTilt() {
    tilt.id = 0;
    if (!active || !tilt.card || !tilt.rect || !tilt.rect.width) return;
    var turn = tilt.card.querySelector('.flip-turn');
    var nx = (tilt.x - tilt.rect.left) / tilt.rect.width - 0.5, ny = (tilt.y - tilt.rect.top) / tilt.rect.height - 0.5;
    if (!turn) return;
    turn.style.setProperty('--ty', (Math.max(-0.5, Math.min(0.5, nx)) * 8).toFixed(2) + 'deg');
    turn.style.setProperty('--tx', (Math.max(-0.5, Math.min(0.5, ny)) * -6).toFixed(2) + 'deg');
  }
  function onMove(e) {
    if (!active || e.pointerType === 'touch' || !(mqFine && mqFine.matches)) return;
    var card = e.target.closest ? e.target.closest('.flip') : null;
    if (card !== tilt.card) { resetTilt(); tilt.card = card; tilt.rect = card ? card.getBoundingClientRect() : null; }
    if (!card) return;
    tilt.x = e.clientX; tilt.y = e.clientY;
    if (!tilt.id && win.requestAnimationFrame) tilt.id = win.requestAnimationFrame(applyTilt);
  }

  function activate() {
    if (active) return;
    active = true;
    grids.forEach(function (g) {
      g.classList.add('is-flip');
      cardsOf(g).forEach(function (c) { c.classList.remove('is-flipped'); syncCard(c); });
    });
  }
  /* 关闭翻牌：回到静态展开的卡片，清掉所有隐藏标记 */
  function deactivate() {
    active = false;
    resetTilt();
    grids.forEach(function (g) {
      g.classList.remove('is-flip');
      cardsOf(g).forEach(function (c) {
        c.classList.remove('is-flipped');
        setHidden(c.querySelector('.flip-front'), false);
        setHidden(c.querySelector('.flip-back'), false);
      });
    });
  }

  grids.forEach(function (g) {
    g.addEventListener('click', onClick);
    g.addEventListener('keydown', onKey);
    g.addEventListener('pointermove', onMove, { passive: true });
    g.addEventListener('pointerleave', resetTilt, { passive: true });
  });
  doc.addEventListener('dc:motion', function (e) { if (e && e.detail && e.detail.enabled === false) deactivate(); });
  if (mqReduce) {
    var onReduce = function (e) { if (e.matches) deactivate(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }
  try { if (motionAllowed()) activate(); } catch (e) { deactivate(); }

  win.DCFlip = { isActive: function () { return active; }, deactivate: deactivate };
})(window, document);
