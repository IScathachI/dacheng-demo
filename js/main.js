/* 大成新华演示站 - 全站脚本（纯原生，无外部依赖）
   内容均为演示样本，不含真实客户、业绩、资质或联系方式。 */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  /* ---------- 内容数据 ---------- */
  var ICON = {
    green: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 38c0-16 10-26 32-28 0 20-10 30-28 30"/><path d="M8 40c6-10 12-16 20-20"/></svg>',
    system: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="8" width="14" height="10" rx="2"/><rect x="28" y="8" width="14" height="10" rx="2"/><rect x="17" y="30" width="14" height="10" rx="2"/><path d="M13 18v6h22v-6M24 24v6"/></svg>',
    manage: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 40V8M8 40h34"/><path d="M14 32l8-9 6 5 10-13"/><path d="M33 15h5v5"/></svg>',
    vocs: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20c6-6 10 6 18 0s12-6 18 0M6 30c6-6 10 6 18 0s12-6 18 0"/><circle cx="14" cy="10" r="2"/><circle cx="26" cy="8" r="2"/><circle cx="36" cy="11" r="2"/></svg>',
    train: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l18-8 18 8-18 8z"/><path d="M14 19v11c0 3 5 6 10 6s10-3 10-6V19"/><path d="M42 14v14"/></svg>'
  };

  var SERVICES = [
    { id: 'green', icon: 'green', name: '绿色印刷认证咨询',
      short: '协助出版、印刷企业梳理环保要求与申报准备，对接具备资质的认证机构。',
      intro: '面向承印出版物的印刷企业，以及有绿色印刷采购要求的出版单位。我们提供的是咨询与辅导：帮助企业理解要求、完成现状诊断、规范内部记录并准备申报材料；认证由具备资质的认证机构依其程序独立实施，我们不颁发证书，也不对认证结果作任何承诺。',
      scope: ['绿色印刷相关标准与要求的宣贯和解读', '原辅材料（油墨、纸张、润版液、胶粘剂等）使用与采购记录梳理', '生产现场环保与职业健康要点的现状诊断', '申报资料的整理、查缺补漏与内部预审', '迎接认证机构审核前的模拟自查与问题整改辅导'],
      process: ['现状沟通与范围确认', '差距分析与整改清单', '制度、记录与现场辅导', '内部自查与预审', '协助对接认证机构并跟进整改'],
      deliver: ['差距分析报告', '整改与资料准备清单', '内部自查记录模板', '培训与答疑记录'],
      fit: ['计划了解或推进绿色印刷认证的印刷企业', '对供应商有绿色印刷要求的出版单位', '希望建立原辅材料管控记录的发行、印制部门'] },
    { id: 'system', icon: 'system', name: '管理体系咨询',
      short: '帮助企业建立并运行质量、环境等管理体系，使制度与现场做法一致。',
      intro: '围绕企业实际业务流程搭建文件化体系，而不是堆砌文件。根据企业需要，可涵盖质量、环境、职业健康安全等体系的建立、运行与持续改进辅导。证书由认证机构依程序决定，本机构仅提供咨询辅导服务。',
      scope: ['体系现状评估与范围、方针、目标策划', '流程梳理与文件体系搭建', '内部审核员培训与内审辅导', '管理评审准备与运行记录检查', '外部审核前的问题自查与整改辅导'],
      process: ['调研与体系策划', '文件编制与评审', '试运行与培训', '内审与管理评审', '审核准备与持续改进'],
      deliver: ['体系策划方案', '流程与文件清单', '内审与管理评审记录模板', '整改跟踪表'],
      fit: ['需要规范管理、提升协作效率的出版印刷企业', '有客户或招标体系要求的企业', '准备体系升级或换版的企业'] },
    { id: 'manage', icon: 'manage', name: '管理提升咨询',
      short: '面向生产、质量、成本与班组管理，提供诊断、方法导入与落地辅导。',
      intro: '针对印刷企业常见的现场与管理痛点，如交期、返工、物料浪费、设备管理和班组协作，开展诊断并导入适合企业规模的管理方法。我们更关注方案能否在现场执行，具体改善幅度需依企业实际情况评估，不作保证性承诺。',
      scope: ['生产与质量现状诊断', '现场 5S、标准作业与可视化管理', '返工、损耗与成本构成分析', '设备点检与维护制度', '管理人员与班组长能力培训'],
      process: ['诊断访谈与现场观察', '问题归类与改善课题确定', '方法导入与试点', '标准固化与复盘', '推广与持续跟进'],
      deliver: ['诊断报告', '改善课题清单', '标准作业与点检表模板', '复盘与推广建议'],
      fit: ['希望提升现场管理水平的印刷厂', '正在进行规模扩张或流程调整的企业', '需要培养中层管理人员的企业'] },
    { id: 'vocs', icon: 'vocs', name: 'VOCs 控制咨询',
      short: '梳理印刷环节的挥发性有机物来源，辅导源头替代、过程管控与台账管理。',
      intro: '围绕印刷、涂布、复合、清洗等环节的 VOCs 管理，提供来源识别、管控措施建议与台账规范辅导。治理设备选型、监测与排放达标判定需由具备相应资质的专业机构实施，我们可协助企业梳理需求并准备资料。',
      scope: ['VOCs 排放环节与含 VOCs 原辅材料清单梳理', '源头替代与工艺优化思路', '管理台账、记录与制度规范', '相关法规与标准要求的宣贯', '协助企业与监测、治理服务方沟通需求'],
      process: ['排查与资料收集', '来源识别与风险分级', '管控方案建议', '台账与制度落地', '自查与持续改进'],
      deliver: ['VOCs 来源排查清单', '管控措施建议', '台账记录模板', '员工培训材料'],
      fit: ['使用溶剂型油墨、涂布或复合工艺的企业', '需要完善环保台账与制度的印刷企业', '正在评估源头替代的企业'] },
    { id: 'train', icon: 'train', name: '课程培训',
      short: '围绕行业标准、绿色印刷、内审与现场管理开展公开课与企业内训。',
      intro: '课程以行业实际场景为主线，既可面向企业内部定制，也可作为公开课报名。课程安排、讲师与时间均以正式通知为准，本演示站展示的课程仅为样例。',
      scope: ['绿色印刷标准与要求解读', '体系内审员能力培训', 'VOCs 管理基础', '印刷现场管理与班组长培训', '企业定制内训'],
      process: ['需求沟通', '课程方案确认', '授课与互动演练', '课后答疑与资料提供'],
      deliver: ['课程大纲', '培训资料', '课后答疑'],
      fit: ['需要宣贯标准的出版、印刷、发行企业', '希望培养内部审核或环保管理人员的企业'] }
  ];

  var CASES = [
    { id: 'demo-green', topic: 'green', tag: '绿色印刷', title: '示例：中型印刷企业的绿色印刷申报准备',
      need: '企业计划了解绿色印刷要求，但原辅材料记录分散、制度不统一，不清楚申报前还缺哪些准备。',
      doing: '现状访谈与现场走访 → 对照要求形成差距清单 → 统一采购与使用记录 → 内部预审并整改 → 协助对接认证机构。',
      result: '预期交付：差距分析报告、整改清单、规范化记录模板、培训记录。认证结论由认证机构独立作出。' },
    { id: 'demo-vocs', topic: 'vocs', tag: 'VOCs', title: '示例：涂布与清洗环节的 VOCs 台账规范',
      need: '企业在涂布、清洗环节使用多种含溶剂材料，缺少系统台账，管理人员难以掌握来源与用量。',
      doing: '材料清单梳理 → 排放环节识别 → 建立使用与废弃物台账 → 班组培训 → 月度自查。',
      result: '预期交付：VOCs 来源排查清单、台账模板、管控措施建议、培训材料。' },
    { id: 'demo-system', topic: 'system', tag: '管理体系', title: '示例：出版发行单位供应商管理流程梳理',
      need: '出版单位希望规范印制供应商选择、评价与质量反馈流程，以便与印刷厂沟通有据可依。',
      doing: '流程访谈 → 绘制供应商管理流程 → 设计评价表与反馈单 → 试运行并修订 → 内部宣贯。',
      result: '预期交付：流程图、供应商评价与反馈模板、试运行问题清单。' },
    { id: 'demo-manage', topic: 'manage', tag: '管理提升', title: '示例：印刷车间返工与损耗改善课题',
      need: '车间换版与调机损耗偏高，返工原因记录不完整，改善缺少抓手。',
      doing: '现场观察 → 返工原因分类 → 选定试点机台 → 导入标准作业与点检 → 复盘固化。',
      result: '预期交付：诊断报告、标准作业与点检表、改善复盘建议。改善幅度需依企业实际评估。' }
  ];

  var NEWS = [
    { id: 'demo-n1', topic: 'green', tag: '绿印动态', title: '示例：印刷企业推进绿色印刷，可以先做哪几件事',
      sum: '演示内容：从认识要求、盘点原辅材料到建立记录，梳理一份企业可自查的起步清单。',
      body: ['本文为演示站的版式样例，不代表真实新闻或政策发布。', '推进绿色印刷，企业通常可以从三个方面起步：第一，了解适用的标准与要求，明确自身所处环节；第二，盘点油墨、纸张、润版液、胶粘剂等原辅材料的来源与使用情况；第三，把采购、验收、使用与废弃物处理的记录固定下来。', '具体要求请以官方发布的现行标准和认证机构的要求为准。正式上线后，本栏目将由甲方提供并审核的内容替换。'] },
    { id: 'demo-n2', topic: 'vocs', tag: '关注VOCs', title: '示例：VOCs 管理台账应包含哪些基本信息',
      sum: '演示内容：以台账为切入点，说明原辅材料、用量、环节与处置记录的基本组织方式。',
      body: ['本文为演示样例，不构成合规结论或法律意见。', '一份清晰的台账通常记录：材料名称与类别、含 VOCs 情况说明、领用与使用环节、数量、废弃物及处置去向、记录人与日期。', '台账格式应与企业流程匹配，并结合当地主管部门的具体要求。'] },
    { id: 'demo-n3', topic: 'notice', tag: '公司动态', title: '示例：网站新闻栏目说明',
      sum: '演示内容：说明“新闻公告”栏目将发布的内容类型，以及与公众号的对应关系。',
      body: ['本栏目用于对应公众号菜单“新闻公告”。正式运行后，可发布培训通知、服务动态与行业资讯。', '当前页面内容均为演示样本，不代表任何真实公告。'] },
    { id: 'demo-n4', topic: 'notice', tag: '公司动态', title: '示例：培训报名流程说明',
      sum: '演示内容：展示培训报名从提交信息到确认通知的流程示意。',
      body: ['本文为演示样例。正式上线后，报名信息将提交至后台并由工作人员联系确认。', '目前的报名表单仅为界面演示，内容不会被发送。'] },
    { id: 'demo-n5', topic: 'system', tag: '体系认证', title: '示例：管理体系建立后，内审应关注什么',
      sum: '演示内容：以内审为例，说明体系运行记录的检查思路。',
      body: ['本文为演示样例，不代表真实新闻或标准解读。', '内审通常关注：制度是否与现场做法一致、记录是否完整可追溯、问题是否得到整改闭环。具体要求以所依据的标准和认证机构的要求为准。'] },
    { id: 'demo-n6', topic: 'event', tag: '参会情况', title: '示例：行业会议参会简报版式',
      sum: '演示内容：展示“参会情况”栏目的版式——时间、会议、要点与后续动作；不含任何真实会议信息。',
      body: ['本文只展示栏目版式，未记载任何真实会议。', '正式栏目可包含：会议名称、时间地点、参会要点、与企业的关联与后续动作。内容须由甲方提供并确认。'] },
    { id: 'demo-n7', topic: 'assoc', tag: '协会合作', title: '示例：协会合作动态版式',
      sum: '演示内容：展示“协会合作”栏目的版式；不含任何真实协会或合作事实。',
      body: ['本文只展示栏目版式，不代表任何真实合作。', '正式栏目可发布与行业协会开展的活动、交流与合作进展，须以双方确认的事实为准。'] }
  ];

  var NEWS_TOPICS = [
    { k: 'all', n: '全部' }, { k: 'green', n: '绿印动态' }, { k: 'vocs', n: '关注VOCs' }, { k: 'system', n: '体系认证' },
    { k: 'event', n: '参会情况' }, { k: 'assoc', n: '协会合作' }, { k: 'notice', n: '公司动态' }
  ];
  var CASE_TOPICS = [{ k: 'all', n: '全部' }, { k: 'green', n: '绿色印刷' }, { k: 'system', n: '体系咨询' }, { k: 'manage', n: '管理咨询' }, { k: 'vocs', n: 'VOCs' }];
  var RES_TOPICS = [{ k: 'all', n: '全部' }, { k: 'green', n: '绿标解读' }, { k: 'vocs', n: 'VOCs 知识' }, { k: 'system', n: '体系' }, { k: 'train', n: '培训' }];

  var COURSES = [
    { id: 'c1', name: '绿色印刷要求解读（样例课程）', form: '公开课 / 企业内训', aud: '印刷企业管理与技术人员、出版印制人员' },
    { id: 'c2', name: '管理体系内审员能力培训（样例课程）', form: '企业内训', aud: '体系管理者、内审员' },
    { id: 'c3', name: 'VOCs 台账与现场管控基础（样例课程）', form: '公开课 / 企业内训', aud: '环保、生产、车间管理人员' },
    { id: 'c4', name: '班组长现场管理实务（样例课程）', form: '企业内训', aud: '班组长、车间主任' }
  ];

  var RES = [
    { cat: '标准与规范（绿标解读）', items: [
      { n: '绿色印刷标准发布与更新说明', m: false, t: ['green'] },
      { n: '绿色印刷标准小知识', m: false, t: ['green'] },
      { n: '绿色印刷标准要点解读', m: false, t: ['green'] },
      { n: 'VOCs 管理相关法规与标准索引', m: false, t: ['vocs'] },
      { n: '管理体系相关标准索引', m: false, t: ['system'] }] },
    { cat: '工具与模板', items: [
      { n: '原辅材料使用记录模板', m: true, t: ['green'] },
      { n: 'VOCs 台账模板', m: true, t: ['vocs'] },
      { n: '内部自查表', m: true, t: ['green', 'system'] }] },
    { cat: '培训资料', items: [
      { n: '培训课件摘要', m: true, t: ['train'] },
      { n: '常见问题解答', m: false, t: ['green', 'train'] }] }
  ];
  /* ---------- 工具函数 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function qs(k) { var m = new RegExp('[?&]' + k + '=([^&]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function member() { return store('dc_demo_member'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 弹窗 ---------- */
  var lastFocus = null;
  function closeModal() {
    var m = $('.modal-back'); if (!m) return;
    m.remove(); document.removeEventListener('keydown', trap);
    var t = lastFocus;
    if (!t || !t.focus || !t.isConnected || !t.offsetParent) t = $('.menu-btn') && $('.menu-btn').offsetParent ? $('.menu-btn') : ($('.brand') || document.body);
    t.focus();
  }
  function trap(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', $('.modal')).filter(function (x) { return !x.disabled; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function openModal(title, html, actions) {
    closeModal(); lastFocus = document.activeElement;
    var back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><button class="x" aria-label="关闭弹窗">×</button><h3 id="mt">' + title + '</h3><div>' + html + '</div><div class="acts">' + (actions || '<button class="btn sm" data-close>知道了</button>') + '</div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', function (e) { if (e.target === back || e.target.closest('.x') || e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', trap);
    var first = $('[data-close]', back) || $('.x', back); first.focus();
    return back;
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  window.DC = { openModal: openModal, toast: toast };

  /* ---------- 页头页脚 ---------- */
  var LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#0b2545"/><path d="M9 13h13a9 9 0 010 18H9z" fill="none" stroke="#fff" stroke-width="3"/><path d="M26 11l5 18" stroke="#3fb6d3" stroke-width="3" stroke-linecap="round"/><circle cx="30.5" cy="10.5" r="2.2" fill="#3fb6d3"/></svg>';
  var page = document.body.getAttribute('data-page') || '';
  function cur(p) { return page === p ? ' aria-current="page"' : ''; }

  function buildHeader() {
    var m = member();
    var sub = SERVICES.map(function (s) { return '<li><a href="service.html?id=' + s.id + '">' + s.name + '</a></li>'; }).join('');
    var h = '<a class="skip" href="#main">跳到正文</a>';
    if (!sstore('dc_bar_closed')) h += '<div class="demo-bar" id="demo-bar">演示版网站：内容为样例，表单与会员功能仅作界面演示，不会发送或保存到服务器。<button aria-label="关闭提示">×</button></div>';
    h += '<header class="site-header"><div class="wrap"><a class="brand" href="index.html" aria-label="大成新华 首页">' + LOGO + '<span><b>大成新华</b><small>北京大成新华认证咨询有限公司</small></span></a>' +
      '<button class="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="展开导航"><svg width="22" height="22" viewBox="0 0 22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h16M3 11h16M3 16h16"/></svg></button>' +
      '<nav class="nav" id="nav" aria-label="主导航"><ul>' +
      '<li><a class="top" href="index.html"' + cur('home') + '>首页</a></li>' +
      '<li><a class="top" href="services.html"' + (page === 'services' ? ' aria-current="page"' : '') + '>服务</a><ul class="sub">' + sub + '</ul></li>' +
      '<li><a class="top" href="cases.html"' + cur('cases') + '>案例</a></li>' +
      '<li><a class="top" href="news.html"' + (['news', 'training', 'resources'].indexOf(page) > -1 ? ' aria-current="page"' : '') + '>资讯与培训</a><ul class="sub"><li><a href="news.html">新闻与行业资讯</a></li><li><a href="training.html">课程培训</a></li><li><a href="resources.html">标准化资料 / 下载中心</a></li></ul></li>' +
      '<li><a class="top" href="about.html"' + cur('about') + '>关于我们</a></li>' +
      '<li><a class="top" href="contact.html"' + cur('contact') + '>联系我们</a></li></ul>' +
      '<div class="nav-actions">' +
      (m ? '<a class="btn sm ghost" href="member.html">会员中心</a>' : '<a class="btn sm ghost" href="login.html">会员登录</a><a class="btn sm" href="register.html">会员注册</a>') +
      '<button class="btn sm ghost" data-support type="button">在线客服</button></div></nav></div></header>';
    return h;
  }
  function buildFooter() {
    return '<footer class="site-footer"><div class="wrap"><div class="foot-grid"><div><h4>北京大成新华认证咨询有限公司</h4><p>面向出版、印刷、发行企业的认证咨询、管理咨询与行业培训服务机构。我们提供咨询辅导，不发放认证证书。</p></div>' +
      '<div><h4>服务</h4><ul>' + SERVICES.map(function (s) { return '<li><a href="service.html?id=' + s.id + '">' + s.name + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h4>资讯与培训</h4><ul><li><a href="news.html">新闻与行业资讯</a></li><li><a href="training.html">课程培训</a></li><li><a href="resources.html">标准化资料 / 下载中心</a></li><li><a href="cases.html">案例示例</a></li></ul></div>' +
      '<div><h4>联系与会员</h4><ul><li><a href="contact.html">联系我们 / 在线留言</a></li><li><a href="login.html">会员登录（演示）</a></li><li><a href="register.html">会员注册（演示）</a></li><li><a href="member.html">会员专享（演示）</a></li><li><a href="wechat-menu.html">公众号菜单对照</a></li><li><button class="btn sm ghost-light" data-support type="button">在线客服</button></li></ul></div></div>' +
      '<div class="foot-bottom"><span>网站演示版 · 页面内容为样例，不代表真实客户、业绩或资质 · 备案与版权信息待甲方提供</span><span>公众号入口：<a href="index.html">大成官网</a> · <a href="news.html">新闻公告</a> · <a href="register.html">会员注册</a></span></div></div></footer>';
  }

  function supportModal() {
    var back = openModal('在线客服（演示）',
      '<p class="notice">演示功能：没有接入真实客服系统，对话内容不会发送给任何人。</p><div class="chat" id="chat" aria-live="polite"><div class="bubble bot">您好，请选择想了解的问题：</div></div><div class="quick">' +
      '<button class="chip" data-q="a">服务范围</button><button class="chip" data-q="b">是否直接发证</button><button class="chip" data-q="c">如何联系</button><button class="chip" data-q="d">培训报名</button></div>');
    var ans = {
      a: ['我们的服务范围？', '包含绿色印刷认证咨询、管理体系咨询、管理提升、VOCs 控制咨询与课程培训，详见“服务”页面。'],
      b: ['是否直接发证？', '不是。我们是咨询机构，不发放认证证书；认证由具备资质的认证机构依其程序独立实施，我们也不承诺认证结果。'],
      c: ['如何联系？', '可使用“联系我们”页的在线留言（演示）。电话、邮箱、QQ 与公众号二维码均待甲方提供。'],
      d: ['培训报名？', '请前往“课程培训”页查看样例课程并体验报名流程；目前报名表单仅为演示，内容不会发送。']
    };
    back.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      var a = ans[b.getAttribute('data-q')], c = $('#chat');
      c.insertAdjacentHTML('beforeend', '<div class="bubble me">' + a[0] + '</div><div class="bubble bot">' + a[1] + '</div>');
      c.scrollTop = c.scrollHeight;
    });
  }

  function initLayout() {
    var h = $('#site-header'), f = $('#site-footer');
    if (h) h.outerHTML = buildHeader();
    if (f) f.outerHTML = buildFooter();
    var btn = $('.menu-btn'), nav = $('#nav');
    function setNav(o) { nav.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); btn.setAttribute('aria-label', o ? '收起导航' : '展开导航'); }
    if (btn) btn.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
    var bar = $('#demo-bar'); if (bar) $('button', bar).addEventListener('click', function () { bar.remove(); sstore('dc_bar_closed', '1'); });
    document.addEventListener('click', function (e) {
      var sp = e.target.closest('[data-support]');
      if (sp) {
        var fromMenu = nav && nav.contains(sp) && nav.classList.contains('open');
        if (fromMenu) setNav(false);
        supportModal();
        if (fromMenu) lastFocus = btn; // 导航已收起，关闭后焦点回到可见的菜单按钮
      }
      var d = e.target.closest('[data-demo]');
      if (d) { e.preventDefault(); openModal(d.getAttribute('data-demo-title') || '演示功能', '<p>' + d.getAttribute('data-demo') + '</p>'); }
    });
    // 页头装饰：套准十字
    $$('.page-hero').forEach(function (p) {
      p.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 200 200" fill="none" stroke="#3fb6d3" stroke-width="1.5" aria-hidden="true"><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="34"/><path d="M100 10v180M10 100h180"/></svg>');
    });
    // 滚动显现
    var rv = $$('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .08 });
      rv.forEach(function (x) { io.observe(x); });
    } else rv.forEach(function (x) { x.classList.add('in'); });
  }

  /* ---------- 渲染：各列表/详情 ---------- */
  function svcCard(s, i) {
    return '<a class="svc" href="service.html?id=' + s.id + '"><span class="num">0' + (i + 1) + '</span>' + ICON[s.icon] + '<h3>' + s.name + '</h3><p>' + s.short + '</p><span class="more">了解详情 →</span></a>';
  }
  function caseCard(c) {
    return '<article class="card"><div class="meta"><span class="badge">演示内容</span><span>' + c.tag + '</span></div><h3>' + c.title + '</h3><dl class="case-steps"><dt>需求</dt><dd>' + c.need + '</dd><dt>服务过程</dt><dd>' + c.doing.split('→').map(function (x) { return x.trim().replace(/。$/, ''); }).join(' → ') + '</dd><dt>预期交付</dt><dd>' + c.result.replace('预期交付：', '') + '</dd></dl><span class="spacer"></span><a class="link-arrow" href="case.html?id=' + c.id + '">查看完整示例</a></article>';
  }
  /* 专题筛选条：链接形式（?topic=xxx），支持直接打开/刷新；未知参数回退到“全部” */
  function topicOf(list) { var t = qs('topic'); return list.some(function (x) { return x.k === t; }) ? t : 'all'; }
  function topicBar(id, list, cur, onPick) {
    var el = $(id); if (!el) return;
    function paint(c) {
      el.innerHTML = list.map(function (x) { return '<a class="chip' + (x.k === c ? ' on' : '') + '" href="?topic=' + x.k + '" data-topic="' + x.k + '"' + (x.k === c ? ' aria-current="true"' : '') + '>' + x.n + '</a>'; }).join('');
    }
    paint(cur);
    el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-topic]'); if (!a) return;
      var k = a.getAttribute('data-topic'); e.preventDefault();
      try { history.replaceState(null, '', '?topic=' + k); } catch (x) { location.search = '?topic=' + k; return; }
      paint(k); onPick(k);
      var n = $('a.chip.on', el); if (n) n.focus();
    });
  }
  function renderNewsPage() {
    if (!$('#news-all')) return;
    function draw(t) {
      var items = NEWS.filter(function (n) { return t === 'all' || n.topic === t; });
      fill('#news-all', items.map(newsItem).join('') || '<li style="padding:24px">该专题暂无演示内容。</li>');
    }
    var cur = topicOf(NEWS_TOPICS); draw(cur); topicBar('#news-chips', NEWS_TOPICS, cur, draw);
  }
  function renderCasePage() {
    if (!$('#case-all')) return;
    function draw(t) {
      var items = CASES.filter(function (c) { return t === 'all' || c.topic === t; });
      fill('#case-all', items.map(function (c) { return '<div>' + caseCard(c) + '</div>'; }).join('') || '<p>该专题暂无演示内容。</p>');
      var n = $('#case-note'); if (n) n.innerHTML = t === 'green' ? '<b>绿色印刷方向：</b>真实服务案例须经客户授权并核实后发布；下列为虚拟演示样例，不是已完成的业绩。' : '<b>演示内容：</b>以下均为虚拟场景样例，不是真实客户、合作单位或已完成业绩。正式案例须经客户授权并核实后发布。';
    }
    var cur = topicOf(CASE_TOPICS); draw(cur); topicBar('#case-chips', CASE_TOPICS, cur, draw);
  }
  function newsItem(n, i) {
    return '<li><a href="article.html?id=' + n.id + '"><span class="tag">' + n.tag + '<br><span class="badge">演示内容</span></span><span><h3>' + n.title + '</h3><p>' + n.sum + '</p></span><span class="link-arrow">阅读</span></a></li>';
  }
  function fill(id, html) { var e = $(id); if (e) e.innerHTML = html; }

  function renderLists() {
    fill('#svc-grid', SERVICES.map(svcCard).join(''));
    fill('#case-home', CASES.slice(0, 3).map(function (c) { return '<div class="reveal">' + caseCard(c) + '</div>'; }).join(''));
    fill('#news-home', NEWS.slice(0, 3).map(newsItem).join(''));
    fill('#course-home', COURSES.slice(0, 3).map(courseCard).join(''));
    fill('#course-all', COURSES.map(courseCard).join(''));
    renderNewsPage(); renderCasePage();
  }
  function courseCard(c) {
    return '<article class="card"><div class="meta"><span class="badge">演示内容</span><span>' + c.form + '</span></div><h3>' + c.name + '</h3><p>面向：' + c.aud + '</p><p>时间、地点、费用：待正式通知。</p><span class="spacer"></span><button class="btn sm" type="button" data-enroll="' + c.id + '">体验报名</button></article>';
  }

  function renderService() {
    var root = $('#svc-root'); if (!root) return;
    var s = SERVICES.filter(function (x) { return x.id === qs('id'); })[0] || SERVICES[0];
    document.title = s.name + ' - 大成新华（演示站）';
    $('#svc-title').textContent = s.name; $('#svc-intro').textContent = s.short;
    var li = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    root.innerHTML = '<div class="article"><h2>服务简介</h2><p>' + s.intro + '</p><h2>适用对象</h2>' + li(s.fit) + '<h2>服务内容</h2>' + li(s.scope) +
      '<h2 id="process">服务流程</h2><ol>' + s.process.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol><h2 id="deliver">预期交付物</h2>' + li(s.deliver) +
      '<p class="disclaimer">说明：本机构是咨询服务机构，不是发证机构；不直接颁发证书，不承诺认证或审核结果。</p></div>' +
      '<aside><div class="panel"><h3>咨询该服务</h3><p style="font-size:.92rem;color:var(--muted)">留下需求，体验咨询流程（演示，内容不会发送）。</p><a class="btn" href="contact.html?topic=' + s.id + '#form">咨询方案</a></div>' +
      '<div class="panel"><h3>其他服务</h3><ul style="margin:0;font-size:.95rem">' + SERVICES.filter(function (x) { return x !== s; }).map(function (x) { return '<li><a href="service.html?id=' + x.id + '">' + x.name + '</a></li>'; }).join('') + '</ul></div></aside>';
  }
  function renderCase() {
    var root = $('#case-root'); if (!root) return;
    var c = CASES.filter(function (x) { return x.id === qs('id'); })[0] || CASES[0];
    document.title = c.title + ' - 大成新华（演示站）';
    $('#case-title').textContent = c.title;
    root.innerHTML = '<div class="article"><p class="notice"><b>演示内容：</b>以下为虚拟的服务场景样例，用于展示“需求—服务过程—预期交付”的呈现方式，并非真实客户或已完成业绩。</p>' +
      '<h2>客户需求</h2><p>' + c.need + '</p><h2>服务过程</h2><ol>' + c.doing.split('→').map(function (x) { return '<li>' + x.trim() + '</li>'; }).join('') + '</ol><h2>预期交付</h2><p>' + c.result + '</p>' +
      '<p><a class="btn" href="contact.html#form">就类似需求咨询</a> <a class="btn ghost" href="cases.html">返回案例列表</a></p></div>' +
      '<aside><div class="panel"><h3>相关服务</h3><p><a href="services.html">查看全部服务</a></p></div></aside>';
  }
  function renderArticle() {
    var root = $('#article-root'); if (!root) return;
    var n = NEWS.filter(function (x) { return x.id === qs('id'); })[0] || NEWS[0];
    document.title = n.title + ' - 大成新华（演示站）';
    $('#article-title').textContent = n.title;
    root.innerHTML = '<div class="article"><p><span class="badge">演示内容</span> <span style="color:var(--muted)">' + n.tag + '</span></p>' + n.body.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '<p><a class="btn ghost" href="news.html">返回资讯列表</a></p></div>' +
      '<aside><div class="panel"><h3>更多资讯</h3><ul style="margin:0">' + NEWS.filter(function (x) { return x !== n; }).map(function (x) { return '<li><a href="article.html?id=' + x.id + '">' + x.title + '</a></li>'; }).join('') + '</ul></div></aside>';
  }
  function renderResources() {
    var root = $('#res-root'); if (!root) return;
    function draw(t) {
      var html = RES.map(function (g) {
        var items = g.items.filter(function (i) { return t === 'all' || i.t.indexOf(t) > -1; });
        if (!items.length) return '';
        return '<div><h3>' + g.cat + '</h3><div class="table-wrap"><table class="table"><thead><tr><th>资料</th><th>状态</th><th>权限</th><th>操作</th></tr></thead><tbody>' +
          items.map(function (i) { return '<tr><td>' + i.n + '</td><td><span class="pending">待甲方提供</span></td><td>' + (i.m ? '<span class="badge blue">会员专享</span>' : '公开') + '</td><td><button class="btn sm ghost" type="button" data-res="' + (i.m ? 1 : 0) + '" data-name="' + esc(i.n) + '">获取资料</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
      }).join('');
      root.innerHTML = html || '<p>该专题暂无资料条目。</p>';
      var n = $('#res-note'); if (n) n.innerHTML = t === 'green' ? '<b>绿标解读：</b>用于展示标准发布信息、小知识与要点解读的栏目结构。条目为占位，不是现行标准原文或正式政策，须以官方发布为准。' : '<b>演示功能：</b>资料条目为占位，文件待甲方提供；会员专享需先登录演示账号。';
    }
    var cur = topicOf(RES_TOPICS); draw(cur); topicBar('#res-chips', RES_TOPICS, cur, draw);
  }
  function scrollToHash() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
  function renderMember() {
    var root = $('#member-root'); if (!root) return;
    var m = member();
    if (!m) {
      root.innerHTML = '<div class="panel"><h3>请先登录演示账号</h3><p>会员专享内容需要体验账号。演示账号不收集真实密码，仅保存在本浏览器。</p><a class="btn" href="login.html">会员登录（演示）</a> <a class="btn ghost" href="register.html">会员注册（演示）</a></div>';
      return;
    }
    root.innerHTML = '<div class="panel"><p>欢迎，<b>' + esc(m.nick) + '</b>（演示账号）</p><p style="color:var(--muted);font-size:.92rem">下列资料为占位，文件待甲方提供。</p><div class="cols c3">' +
      ['原辅材料使用记录模板', 'VOCs 台账模板', '内部自查表'].map(function (x) { return '<div class="card"><span class="badge blue">会员专享</span><h3>' + x + '</h3><button class="btn sm" data-res="0" data-name="' + x + '" type="button">获取资料</button></div>'; }).join('') +
      '</div><p style="margin-top:24px"><button class="btn ghost" id="logout" type="button">退出演示账号</button></p></div>';
    $('#logout').addEventListener('click', function () { store('dc_demo_member', null); toast('已退出演示账号'); setTimeout(function () { location.href = 'index.html'; }, 700); });
  }

  /* ---------- 表单 ---------- */
  function validate(form) {
    var ok = true, first = null;
    $$('.field', form).forEach(function (f) {
      var i = $('input,select,textarea', f); if (!i) return;
      var v = (i.value || '').trim(), bad = false, msg = $('.err', f);
      if (i.required && !v) { bad = true; if (msg) msg.textContent = '请填写此项'; }
      else if (v && i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { bad = true; if (msg) msg.textContent = '邮箱格式不正确'; }
      else if (v && i.name === 'phone' && !/^[0-9+\-\s()]{7,20}$/.test(v)) { bad = true; if (msg) msg.textContent = '请输入有效的联系电话'; }
      else if (v && i.minLength > 0 && v.length < i.minLength) { bad = true; if (msg) msg.textContent = '内容至少 ' + i.minLength + ' 个字'; }
      f.classList.toggle('bad', bad); i.setAttribute('aria-invalid', bad);
      if (bad && !first) first = i; ok = false === bad ? ok : false;
    });
    var ck = $('input[type=checkbox][required]', form);
    if (ck && !ck.checked) { ok = false; if (!first) first = ck; toast('请先勾选确认'); }
    if (first) first.focus();
    return ok;
  }
  function initForms() {
    $$('form[data-kind]').forEach(function (form) {
      form.setAttribute('novalidate', '');
      var t = qs('topic'), sel = $('select[name=topic]', form);
      if (t && sel) sel.value = t;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var kind = form.getAttribute('data-kind');
        if (kind === 'register') {
          store('dc_demo_member', { nick: $('[name=nick]', form).value.trim(), type: $('[name=org]', form).value });
          openModal('演示账号已创建', '<p>已在本浏览器中创建演示账号，未收集密码，也未提交到任何服务器。</p>', '<a class="btn sm" href="member.html">进入会员专享</a>');
          return;
        }
        var label = { contact: '留言', enroll: '报名' }[kind] || '提交';
        openModal('仅演示，内容未发送', '<p>您的' + label + '内容已通过基础校验，但本网站为演示版，<b>内容未被发送，也不会被保存</b>，工作人员不会收到。正式上线后将接入后台。</p>');
        form.reset();
      });
      $$('input,select,textarea', form).forEach(function (i) { i.addEventListener('input', function () { var f = i.closest('.field'); if (f) f.classList.remove('bad'); }); });
    });
    var lg = $('#demo-login');
    if (lg) lg.addEventListener('click', function () {
      if (!member()) store('dc_demo_member', { nick: '演示用户', type: '印刷企业' });
      toast('已登录演示账号'); setTimeout(function () { location.href = 'member.html'; }, 600);
    });
    document.addEventListener('click', function (e) {
      var r = e.target.closest('[data-res]');
      if (r) {
        if (r.getAttribute('data-res') === '1' && !member()) { openModal('会员专享（演示）', '<p>该资料为会员专享。请先登录演示账号体验。</p>', '<a class="btn sm ghost" href="register.html">会员注册</a><a class="btn sm" href="login.html">会员登录</a>'); return; }
        openModal('资料待提供', '<p>“' + r.getAttribute('data-name') + '”的正式文件待甲方提供，当前演示站没有可下载文件。</p>');
      }
      var en = e.target.closest('[data-enroll]');
      if (en) {
        var c = COURSES.filter(function (x) { return x.id === en.getAttribute('data-enroll'); })[0];
        var b = openModal('课程报名（演示）', '<p class="notice">演示功能：提交后内容不会发送。</p><p><b>' + c.name + '</b></p><form data-kind="enroll" id="enroll-form"><div class="field"><label for="en-n">姓名 <i>*</i></label><input id="en-n" name="name" required><div class="err" role="alert"></div></div><div class="field"><label for="en-p">联系电话 <i>*</i></label><input id="en-p" name="phone" required inputmode="tel"><div class="err" role="alert"></div></div><div class="field"><label for="en-c">单位名称 <i>*</i></label><input id="en-c" name="org" required><div class="err" role="alert"></div></div><button class="btn" type="submit">提交报名（演示）</button></form>', '<button class="btn sm ghost" data-close>取消</button>');
        initForms.bound = false; bindModalForm(b);
      }
    });
  }
  function bindModalForm(b) {
    var form = $('form', b);
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!validate(form)) return;
      closeModal(); openModal('仅演示，内容未发送', '<p>报名信息已通过基础校验，但本网站为演示版，<b>内容未被发送，也不会被保存</b>，工作人员不会收到。</p>');
    });
    $$('input', form).forEach(function (i) { i.addEventListener('input', function () { i.closest('.field').classList.remove('bad'); }); });
  }

  /* ---------- 启动 ---------- */
  initLayout();
  renderLists(); renderService(); renderCase(); renderArticle(); renderResources(); renderMember(); initForms(); scrollToHash();
  // 列表渲染后的新元素也参与显现
  $$('.reveal').forEach(function (x) { x.classList.add('in'); });
})();
