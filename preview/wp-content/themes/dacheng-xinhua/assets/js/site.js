/* 大成新华企业官网主题 · 导航（纯原生，无依赖）
   手机导航展开/收起、Esc 收起并把焦点还给菜单按钮、点击导航外部或导航内链接时收起。
   页头滚动阴影由 motion.js 的 headerState 负责；没有本脚本时导航在桌面端照常可用。 */
(function () {
  'use strict';
  var button = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (!button || !nav) return;
  function toggle(open, restoreFocus) {
    nav.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    if (restoreFocus) button.focus();
  }
  button.addEventListener('click', function () { toggle(!nav.classList.contains('open')); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('open')) toggle(false, true);
  });
  document.addEventListener('click', function (event) {
    if (nav.classList.contains('open') && !nav.contains(event.target) && !button.contains(event.target)) toggle(false);
  });
  nav.addEventListener('click', function (event) { if (event.target.closest('a')) toggle(false); });
  // 窗口变宽回到桌面导航时，清掉手机端的展开状态
  var wide = window.matchMedia ? window.matchMedia('(min-width: 1081px)') : null;
  if (wide) {
    var reset = function () { if (wide.matches && nav.classList.contains('open')) toggle(false); };
    if (wide.addEventListener) wide.addEventListener('change', reset); else if (wide.addListener) wide.addListener(reset);
  }
})();
