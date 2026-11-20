/* 大成新华演示站 · 首屏主视觉增强（第三版 · 网点粒子版）
 * 纯原生 WebGL / Canvas 2D，无任何依赖；与 main.js、motion.js 互不依赖（motion.js 存在时听它的开关）。
 *
 * 概念：“网点成像”。首屏图片里的蓝色印刷网点被拆成几万个粒子：
 *  - 入场：粒子像被印刷辊带进来一样，从画面左侧按从左到右的顺序流入，落到各自的位置拼出图案；
 *  - 之后画面自己动，不跟随鼠标：
 *      · 每个网点在原位轻轻漂动（呼吸感）；
 *      · 每隔几秒有一道“印刷波”斜着扫过，经过的网点被掀起、放大、泛出青蓝色，再落回原处；
 *      · 约 8% 的网点会周期性地脱离纸面，沿纸张走势飘出一段后淡出，再在原位重新出现（持续的粒子流）；
 *      · 透明玻璃带自行流动：轻微的液态折射与色散，蓝青—淡紫的虹彩沿玻璃缓慢流转；
 *      · 玻璃高光处有闪烁的光点，整个画面里有少量缓慢上浮的微光尘；
 *      · 一条柔和的高光带每隔几秒扫过整幅图；
 *  - 向下滚动时，网点散开并向下飘落、变淡；下方第一条网点分隔条（js/dot-fall.js）接着把它们“接住”。
 *  叠在图上的标题和导语卡片（[data-fx-avoid]）下方的粒子动得更少，闪光点和微光尘在那里几乎隐去。
 *
 * 什么时候不做 / 会停：
 *  - 系统“减少动效”、地址带 ?motion=off、DCMotion 被关闭（含运行中途关闭）：不创建或立即拆除，只剩静态图片。
 *  - 图片加载失败：加 .is-fallback，显示第二版的 SVG 构图，不启动任何效果。
 *  - 标签页隐藏、主视觉滚出视口、用户点“暂停动效”：停止逐帧绘制，画面保留最后一帧；回来后从原处继续。
 *  - WebGL 不可用、图片像素读不到（如直接双击打开的 file:// 页面）或中途丢失：
 *    改用纯 CSS 的虹彩光泽（.hv-sheen）加少量 2D 粒子；连续掉帧时先降分辨率并减少网点数，再降级。
 *  - 任何一步抛错：拆除全部效果层，图片与文字不受影响。
 *
 * 性能约束：设备像素比上限 1.5（手机 1.25），画布长边上限 1680 像素（原图宽度）；
 * 网点数：大屏桌面约 1.7 万（另有约 900 个闪光点、500 个微光尘）、普通桌面最多 1.5 万、触屏 1 万、手机约 9 千，
 * 全部在 GPU 顶点着色器里计算位置。
 * 布局只在滚动/缩放后的下一帧读取一次，不监听鼠标。
 *
 * 调试/复查接口：window.DCHeroFx.state() 返回当前状态；.pause() / .resume() 等同于点按钮；
 * .renderAt(秒) 把效果时间推进到指定时刻并立即画一帧（仅用于核对画面，不代表实际播放）。
 */
(function (win, doc) {
  'use strict';

  var fig = doc.querySelector('[data-hero-fx]');
  if (!fig) return;
  var img = fig.querySelector('.hv-photo');
  var stage = fig.querySelector('.hv-zoom') || fig;
  var hero = (fig.closest && fig.closest('.hero')) || fig;
  var root = doc.documentElement;
  // 必须以 window 为 this 调用，否则部分浏览器会抛 Illegal invocation
  var raf = win.requestAnimationFrame ? function (fn) { return win.requestAnimationFrame(fn); } : null;
  var caf = win.cancelAnimationFrame ? function (id) { win.cancelAnimationFrame(id); } : null;
  if (!img || !raf) return;

  var mqReduce = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqSmall = win.matchMedia ? win.matchMedia('(max-width: 760px)') : null;
  var mqFine = win.matchMedia ? win.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var forcedOff = /[?&]motion=off(&|$)/.test(win.location.search);

  var MAX_DPR = 1.5, MAX_DPR_SMALL = 1.25, MAX_SIDE = 1680;
  var S = { built: false, dead: false, paused: false, inView: true, shown: !doc.hidden, running: false, id: 0, t: 0, last: 0, first: false, quality: 1, slow: 0, seen: 0, sp: 0, spT: 0 };
  var gl = null, glc = null, P = null, ptc = null, ptx = null, sheen = null, btn = null, io = null;
  var cssW = 0, cssH = 0, W = 0, H = 0, rect = null, dirty = true, fit = [1, 1, 0, 0], strength = 1, cellPx = 2;
  var N = { ink: 0, glint: 0, mote: 0, cellSrc: 2 };
  var parts = [];                       // 只在降级（无 WebGL）时使用的 2D 粒子
  var avoid = [], avoidDirty = true;    // 叠在图上的文字块（[data-fx-avoid]）在面板内的相对位置

  function motionAllowed() {
    if (forcedOff || (mqReduce && mqReduce.matches)) return false;
    if (win.DCMotion && typeof win.DCMotion.isEnabled === 'function') return !!win.DCMotion.isEnabled();
    return true;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function smooth(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  /* 判定“蓝色印刷网点”与“透明玻璃带”的像素（JS 取样与着色器里用同一套公式） */
  function lumOf(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function inkOf(r, g, b) { return clamp((b - Math.max(r, g) - 0.08) / 0.22, 0, 1) * clamp((0.9 - lumOf(r, g, b)) / 0.35, 0, 1); }
  function glassOf(r, g, b) { return clamp((b - r - 0.03) / 0.1, 0, 1) * clamp((lumOf(r, g, b) - 0.62) / 0.15, 0, 1); }

  /* ---------- 着色器 ---------- */
  var FILM = 'vec3 film(float t){ return vec3(0.84,0.86,0.985) + vec3(0.15,0.10,0.035)*cos(6.28318*(t + vec3(0.0,0.36,0.62))); }';

  // 背景：原图 + 玻璃带的液态折射与虹彩 + 高光带；网点处的墨色被“提起”，由粒子重新画出
  var BG_VS = [
    'attribute vec2 a_home;',
    'varying vec2 v_uv;',
    'void main(){',
    '  v_uv = vec2(a_home.x*0.5 + 0.5, 0.5 - a_home.y*0.5);',
    '  gl_Position = vec4(a_home, 0.0, 1.0);',
    '}'
  ].join('\n');
  var BG_FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 v_uv;',
    'uniform sampler2D u_tex;',
    'uniform vec2 u_res;',    // 画布像素
    'uniform vec4 u_fit;',    // object-fit:cover 映射：画面坐标 → 图片坐标
    'uniform float u_time;',
    'uniform float u_amt;',   // 光效强度（手机略弱）
    'uniform float u_sweep;', // 高光带位置
    'uniform float u_lift;',  // 网点墨色被提起的程度（1 = 全部由粒子画）
    'uniform float u_px;',    // 每个 CSS 像素对应的画布像素
    FILM,
    'vec3 img(vec2 uv){ return texture2D(u_tex, uv).rgb; }',
    'void main(){',
    '  vec2 uv = v_uv*u_fit.xy + u_fit.zw;',
    '  vec3 c0 = img(uv);',
    '  float lum = dot(c0, vec3(0.299, 0.587, 0.114));',
    '  float ink = clamp((c0.b - max(c0.r, c0.g) - 0.08)/0.22, 0.0, 1.0)*clamp((0.9 - lum)/0.35, 0.0, 1.0);',
    '  float g = clamp((c0.b - c0.r - 0.03)/0.1, 0.0, 1.0)*clamp((lum - 0.62)/0.15, 0.0, 1.0)*u_amt;',
    '  vec3 col = c0;',
    '  if (g > 0.01) {',
    // 玻璃自己在流动：缓慢变化的折射位移（约 ±5 个 CSS 像素）和三通道色散
    '    vec2 p = v_uv*u_res/u_px;',
    '    vec2 o = vec2(sin(p.y*0.028 + u_time*0.9) + 0.6*sin(p.x*0.017 - u_time*0.63),',
    '                  cos(p.x*0.024 + u_time*0.77) + 0.6*cos(p.y*0.014 + u_time*0.51));',
    '    vec2 ou = o*3.0*u_px/u_res*u_fit.xy;',
    '    vec3 cw = vec3(img(uv + ou*1.35).r, img(uv + ou).g, img(uv + ou*0.65).b);',
    '    col = mix(col, cw, g);',
    // 虹彩沿玻璃斜向流转
    '    float ph = dot(v_uv, vec2(1.1, 0.7))*1.7 - u_time*0.07 + lum*0.9 + 0.08*o.x;',
    '    col = mix(col, col*film(ph)*1.05, g*0.5);',
    '  }',
    '  col = mix(col, vec3(0.955, 0.948, 0.944), ink*u_lift);',
    // 柔和高光带：整幅图上很淡，经过玻璃时更亮
    '  float s = dot(v_uv, vec2(0.8, 0.6));',
    '  float x = (s - u_sweep*1.4)/0.12;',
    '  float band = exp(-x*x);',
    '  vec3 f2 = film(s*1.3 + u_time*0.03);',
    '  col = mix(col, col*f2*1.04, band*u_amt*(0.14 + 0.4*g));',
    '  col += band*u_amt*(0.02 + 0.08*g);',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  // 粒子：位置、透明度、大小全部在顶点着色器里按时间计算
  // a_info：x 透明度，y 大小系数，z 随机种子，w 种类（0 网点 / 1 玻璃闪光 / 2 微光尘）
  var PT_VS = [
    'attribute vec2 a_home;',
    'attribute vec3 a_col;',
    'attribute vec4 a_info;',
    'attribute vec2 a_rnd;',
    'uniform vec2 u_res;',
    'uniform vec4 u_fit;',
    'uniform float u_time;',
    'uniform float u_scroll;',
    'uniform float u_px;',
    'uniform float u_cell;',
    'uniform float u_wave;',
    'uniform vec4 u_av0;',
    'uniform vec4 u_av1;',
    'varying vec4 v_col;',
    'varying float v_size;',
    'varying float v_soft;',
    FILM,
    'float inRect(vec2 p, vec4 r){ return step(r.x, p.x)*step(p.x, r.z)*step(r.y, p.y)*step(p.y, r.w); }',
    'void main(){',
    '  float t = u_time, s = a_info.z, kind = a_info.w;',
    '  vec3 col = a_col;',
    '  float alpha = a_info.x, size = 1.0, soft = 0.0;',
    '  vec2 pos, off = vec2(0.0);',   // off 以 CSS 像素计
    '  if (kind < 0.5) {',
    '    vec2 home = (a_home - u_fit.zw)/u_fit.xy;',
    '    float calm = 1.0 - 0.8*max(inRect(home, u_av0), inRect(home, u_av1));',
    // 入场：从左往右依次被“印”上来，起点在各自位置的左侧
    '    float delay = 0.15 + clamp(home.x, 0.0, 1.0)*0.95 + s*0.45;',
    '    float k = clamp((t - delay)/1.25, 0.0, 1.0);',
    '    float e = 1.0 - (1.0 - k)*(1.0 - k)*(1.0 - k);',
    '    vec2 from = home + vec2(-0.3 - 0.35*a_rnd.x, (a_rnd.y - 0.5)*0.5);',
    '    pos = mix(from, home, e);',
    '    pos.y += sin(e*5.0 + s*31.0)*0.045*(1.0 - e);',
    '    float landed = step(0.999, e);',
    // 原位漂动：每颗网点沿各自的小圈缓慢游动，整片网点像在呼吸
    '    off += vec2(sin(home.y*11.0 + t*0.7 + s*6.2831), cos(home.x*9.0 - t*0.55 + s*4.0))*3.2*calm;',
    // 印刷波：斜向扫过，经过时网点掀起、放大、泛青
    '    float dw = (dot(home, vec2(0.78, 0.62)) - u_wave)/0.09;',
    '    float w = exp(-dw*dw)*calm*landed;',
    '    off += vec2(-0.45, -1.0)*w*22.0;',
    // 约 12% 的网点周期性脱离纸面，沿纸张走势飘出，淡出后回到原位
    '    float det = step(s, 0.12)*calm*landed;',
    '    float ph = fract(t/(6.0 + 6.0*a_rnd.x) + s*13.0);',
    '    float tr = smoothstep(0.0, 0.6, ph)*step(ph, 0.6);',
    '    float detA = ph < 0.6 ? 1.0 - smoothstep(0.34, 0.58, ph) : smoothstep(0.66, 0.88, ph);',
    '    off += det*(vec2(0.86, -0.5)*320.0*tr + vec2(sin(tr*8.0 + s*50.0), cos(tr*6.0 + s*40.0))*28.0*tr);',
    '    alpha *= mix(1.0, detA, det)*smoothstep(0.0, 0.3, k);',
    '    col = mix(col, vec3(0.36, 0.6, 1.0), w*0.7);',
    '    col = mix(col, film(s*7.0 + t*0.05)*vec3(0.5, 0.62, 1.0), det*tr*0.75);',
    '    size = u_cell*a_info.y*(1.0 + 1.2*w + 0.7*(1.0 - e) + 0.8*det*tr);',
    // 滚动：网点散开并向下飘落、变淡（下方第一条网点分隔条接着“接住”它们，见 js/dot-fall.js）
    '    vec2 dir = normalize(vec2(a_rnd.x - 0.5, a_rnd.y*0.8 + 0.1) + vec2(0.0001));',
    '    off += dir*(70.0 + 260.0*a_rnd.y)*u_scroll + vec2(0.0, 420.0)*u_scroll*u_scroll;',
    '    alpha *= 1.0 - 0.6*u_scroll;',
    '  } else if (kind < 1.5) {',
    // 玻璃高光上的闪光点
    '    vec2 home = (a_home - u_fit.zw)/u_fit.xy;',
    '    pos = home;',
    '    off += vec2(cos(t*0.4 + s*20.0), sin(t*0.5 + s*17.0))*3.0;',
    '    float tw = max(0.0, sin(t*(0.5 + a_rnd.x*1.3) + s*40.0));',
    '    tw = tw*tw*tw*tw*tw*tw;',
    '    alpha *= tw*smoothstep(1.0, 2.2, t)*(1.0 - 0.85*max(inRect(home, u_av0), inRect(home, u_av1)));',
    '    col = mix(vec3(0.33, 0.74, 1.0), vec3(0.66, 0.5, 1.0), a_rnd.x);',
    '    size = (5.0 + 7.0*a_rnd.y)*u_px*(0.5 + 0.7*tw);',
    '    soft = 1.0;',
    '    off += vec2(0.0, 220.0)*u_scroll;',
    '    alpha *= 1.0 - u_scroll;',
    '  } else {',
    // 微光尘：整幅画面里缓慢向右上漂浮，循环出现
    '    vec2 p = fract(a_home + vec2(0.010, -0.016)*t*(0.4 + a_rnd.x));',
    '    pos = p + vec2(sin(t*0.6 + s*30.0), cos(t*0.5 + s*20.0))*0.004;',
    '    float edge = smoothstep(0.0, 0.08, p.x)*(1.0 - smoothstep(0.92, 1.0, p.x))*smoothstep(0.0, 0.08, p.y)*(1.0 - smoothstep(0.92, 1.0, p.y));',
    '    alpha *= edge*(0.55 + 0.45*sin(t*1.3 + s*20.0))*smoothstep(0.8, 2.0, t)*(1.0 - 0.75*max(inRect(p, u_av0), inRect(p, u_av1)));',
    '    size = (2.2 + 3.0*a_rnd.y)*u_px;',
    '    off += vec2(0.0, 180.0)*u_scroll*(0.5 + a_rnd.x);',
    '  }',
    '  pos += off*u_px/u_res;',
    '  v_col = vec4(col, clamp(alpha, 0.0, 1.0));',
    '  v_size = max(size, 1.0);',
    '  v_soft = soft;',
    '  gl_PointSize = v_size;',
    '  gl_Position = vec4(pos.x*2.0 - 1.0, 1.0 - pos.y*2.0, 0.0, 1.0);',
    '}'
  ].join('\n');
  var PT_FS = [
    'precision mediump float;',
    'varying vec4 v_col;',
    'varying float v_size;',
    'varying float v_soft;',
    'void main(){',
    '  float d = length(gl_PointCoord - vec2(0.5))*2.0;',
    // 网点：边缘只留约 1 个像素的过渡，小点也是实心的
    '  float hard = 1.0 - smoothstep(1.0 - clamp(1.6/v_size, 0.08, 0.6), 1.0, d);',
    // 闪光点：柔和光晕 + 白色亮芯
    '  float sf = clamp(1.0 - d, 0.0, 1.0);',
    '  float a = mix(hard, sf*sf, v_soft)*v_col.a;',
    '  if (a < 0.003) discard;',
    '  vec3 rgb = mix(v_col.rgb, vec3(1.0), v_soft*sf*sf*sf);',
    '  gl_FragColor = vec4(rgb*a, a);',
    '}'
  ].join('\n');

  function compile(g, type, src) {
    var s = g.createShader(type);
    g.shaderSource(s, src); g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error('shader: ' + g.getShaderInfoLog(s));
    return s;
  }
  function program(g, vs, fs, attrs) {
    var p = g.createProgram(), i;
    g.attachShader(p, compile(g, g.VERTEX_SHADER, vs));
    g.attachShader(p, compile(g, g.FRAGMENT_SHADER, fs));
    for (i = 0; i < attrs.length; i++) g.bindAttribLocation(p, i, attrs[i]);
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error('link: ' + g.getProgramInfoLog(p));
    return p;
  }
  function uniforms(g, p, names) {
    var o = {}, i;
    for (i = 0; i < names.length; i++) o[names[i]] = g.getUniformLocation(p, 'u_' + names[i]);
    return o;
  }

  /* ---------- 从图片取样：网点、玻璃闪光点、微光尘 ---------- */
  var MOTE_COLORS = [[0.11, 0.29, 0.78], [0.18, 0.52, 0.87], [0.54, 0.44, 0.91]];
  function sampleImage() {
    var small = !!(mqSmall && mqSmall.matches), fine = !!(mqFine && mqFine.matches);
    var big = (stage.clientWidth || 0) >= 1100;
    var capInk = small ? 9000 : (fine ? (big ? 20000 : 15000) : 10000);
    var capGlint = small ? 220 : (big ? 900 : 560);
    var capMote = small ? 140 : (big ? 520 : 320);
    var sc = small ? 0.5 : 1, iw = img.naturalWidth, ih = img.naturalHeight;
    var w = Math.max(2, Math.round(iw * sc)), h = Math.max(2, Math.round(ih * sc));
    // 取样间距：桌面每 3 个原图像素一个网点，手机每 4 个；网点画得比间距略大，彼此相接，看得出是一颗颗的点
    var c = doc.createElement('canvas'), x, d, step = small ? 2 : 3, rnd = Math.random;
    var cand = [], ink = [], glint = [], mote = [], i, j, k, o, px, py, r, g, b, n, keep, tries, tmp;
    c.width = w; c.height = h;
    x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, h);
    d = x.getImageData(0, 0, w, h).data;      // 只有同源图片能读取；读不到时抛错，交给上层降级
    for (py = 0; py < h; py += step) {
      for (px = 0; px < w; px += step) {
        o = (py * w + px) * 4; r = d[o] / 255; g = d[o + 1] / 255; b = d[o + 2] / 255;
        k = inkOf(r, g, b);
        if (k > 0.05) cand.push(px, py, r, g, b, k);
      }
    }
    n = cand.length / 6;
    keep = Math.min(1, capInk / Math.max(1, n));
    for (i = 0; i < n; i++) {
      j = i * 6; k = cand[j + 5];
      if (keep < 1 && rnd() > keep * (0.55 + 0.9 * k)) continue;      // 浓墨优先保留
      // 颜色比原图略深：网点之间有空隙，整体看起来才和原图墨色接近
      ink.push([(cand[j] + rnd() * step) / w, (cand[j + 1] + rnd() * step) / h,
        cand[j + 2] * 0.84, cand[j + 3] * 0.86, cand[j + 4] * 0.93,
        clamp(0.45 + 0.6 * k, 0, 1), 1.05 + 0.7 * k, rnd(), 0, rnd(), rnd()]);
    }
    for (i = ink.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); tmp = ink[i]; ink[i] = ink[j]; ink[j] = tmp; }   // 打乱顺序：降级时只画前面一部分，仍然均匀
    if (ink.length > capInk) ink.length = capInk;
    for (tries = 0; glint.length < capGlint && tries < capGlint * 60; tries++) {
      px = Math.floor(rnd() * w); py = Math.floor(rnd() * h);
      o = (py * w + px) * 4; r = d[o] / 255; g = d[o + 1] / 255; b = d[o + 2] / 255;
      if (glassOf(r, g, b) > 0.5 && lumOf(r, g, b) > 0.78) glint.push([px / w, py / h, 0, 0, 0, 0.9 + 0.1 * rnd(), 1, rnd(), 1, rnd(), rnd()]);
    }
    for (i = 0; i < capMote; i++) {
      k = MOTE_COLORS[i % 3];
      mote.push([rnd(), rnd(), k[0], k[1], k[2], 0.4 + 0.4 * rnd(), 1, rnd(), 2, rnd(), rnd()]);
    }
    N.ink = ink.length; N.glint = glint.length; N.mote = mote.length; N.cellSrc = step / sc;
    return glint.concat(mote, ink);    // 闪光点和微光尘在前，网点在后
  }

  /* ---------- WebGL ---------- */
  function buildGL() {
    var c = doc.createElement('canvas'), g, opts, list, data, i, j, t;
    c.className = 'hv-gl'; c.setAttribute('aria-hidden', 'true');
    // preserveDrawingBuffer：暂停或离屏停止绘制后，画布保留最后一帧
    opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: true };
    g = c.getContext('webgl', opts) || c.getContext('experimental-webgl', opts);
    if (!g) return;
    list = sampleImage();
    data = new Float32Array(list.length * 11);
    for (i = 0; i < list.length; i++) for (j = 0; j < 11; j++) data[i * 11 + j] = list[i][j];
    P = { count: list.length };
    P.bg = program(g, BG_VS, BG_FS, ['a_home']);
    P.pt = program(g, PT_VS, PT_FS, ['a_home', 'a_col', 'a_info', 'a_rnd']);
    P.ubg = uniforms(g, P.bg, ['res', 'fit', 'time', 'amt', 'sweep', 'lift', 'px']);
    P.upt = uniforms(g, P.pt, ['res', 'fit', 'time', 'scroll', 'px', 'cell', 'wave', 'av0', 'av1']);
    P.quad = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, P.quad);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);   // 覆盖全屏的三角形
    P.buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, P.buf);
    g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
    t = g.createTexture();
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, t);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, 0);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, img);   // 直接用页面上已加载的那张图，不再请求
    if (g.getError() !== g.NO_ERROR) throw new Error('texture');
    g.useProgram(P.bg);
    g.uniform1i(g.getUniformLocation(P.bg, 'u_tex'), 0);
    c.addEventListener('webglcontextlost', function (e) { e.preventDefault(); dropGL(true); }, false);
    stage.appendChild(c);
    gl = g; glc = c;
  }
  /* 放弃 WebGL：移除画布；需要时换成 CSS 虹彩光泽 + 2D 粒子 */
  function dropGL(withFallback) {
    var c = glc, g = gl, ext;
    gl = null; glc = null; P = null;
    if (g) { try { ext = g.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* 已经丢失 */ } }
    if (c && c.parentNode) c.parentNode.removeChild(c);
    if (withFallback && !S.dead) {
      if (!sheen) buildSheen();
      if (!ptx) { try { buildParticles(); cssW = 0; dirty = true; } catch (e) { ptc = null; ptx = null; } }
    }
  }
  function buildSheen() {
    sheen = doc.createElement('div');
    sheen.className = 'hv-sheen'; sheen.setAttribute('aria-hidden', 'true');
    stage.appendChild(sheen);
  }
  function avoidRect(i) {
    var a = avoid[i];
    return a ? [a.il - 0.01, a.it - 0.01, a.ir + 0.01, a.ib + 0.01] : [2, 2, 3, 3];
  }
  function drawGL() {
    if (!gl) return;
    var t = S.t, g = gl, u, i, a0, a1, cnt;
    var cyc = (t % 9) / 9, sweep = cyc < 0.6 ? -0.25 + 1.5 * easeInOut(cyc / 0.6) : 9;   // 约 5.4 秒扫过，停 3.6 秒
    var lift = 1 - 0.22 * smooth(2.4, 3.6, t);                                             // 网点到位后，原图墨色留一层很淡的底
    var wc = t > 3.2 ? ((t - 3.2) % 6.5) / 6.5 : 1, wave = wc < 0.6 ? -0.25 + 1.9 * (wc / 0.6) : 9;   // 印刷波：约 3.9 秒扫过，停 2.6 秒
    var amt = strength * easeOut(clamp(t / 1.4, 0, 1));
    // 背景
    g.useProgram(P.bg);
    g.bindBuffer(g.ARRAY_BUFFER, P.quad);
    for (i = 1; i < 4; i++) g.disableVertexAttribArray(i);
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    u = P.ubg;
    g.uniform2f(u.res, W, H);
    g.uniform4f(u.fit, fit[0], fit[1], fit[2], fit[3]);
    g.uniform1f(u.time, t);
    g.uniform1f(u.amt, amt);
    g.uniform1f(u.sweep, sweep);
    g.uniform1f(u.lift, lift);
    g.uniform1f(u.px, W / (cssW || 1));
    g.drawArrays(g.TRIANGLES, 0, 3);
    // 粒子
    g.useProgram(P.pt);
    g.bindBuffer(g.ARRAY_BUFFER, P.buf);
    for (i = 0; i < 4; i++) g.enableVertexAttribArray(i);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 44, 0);
    g.vertexAttribPointer(1, 3, g.FLOAT, false, 44, 8);
    g.vertexAttribPointer(2, 4, g.FLOAT, false, 44, 20);
    g.vertexAttribPointer(3, 2, g.FLOAT, false, 44, 36);
    u = P.upt;
    a0 = avoidRect(0); a1 = avoidRect(1);
    g.uniform2f(u.res, W, H);
    g.uniform4f(u.fit, fit[0], fit[1], fit[2], fit[3]);
    g.uniform1f(u.time, t);
    g.uniform1f(u.scroll, S.sp);
    g.uniform1f(u.px, W / (cssW || 1));
    g.uniform1f(u.cell, cellPx);
    g.uniform1f(u.wave, wave);
    g.uniform4f(u.av0, a0[0], a0[1], a0[2], a0[3]);
    g.uniform4f(u.av1, a1[0], a1[1], a1[2], a1[3]);
    cnt = N.glint + N.mote + Math.round(N.ink * (S.quality < 1 ? 0.6 : 1));   // 降级时少画一些网点
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.drawArrays(g.POINTS, 0, Math.min(cnt, P.count));
    g.disable(g.BLEND);
    if (!S.first) { S.first = true; glc.classList.add('is-ready'); }
  }

  /* ---------- 降级用的 2D 粒子（无 WebGL 时） ---------- */
  // 四条沿纸张走势（左下 → 右上）的流线：[起点高度, 起伏幅度, 起伏频率, 相位]
  var LANES = [[0.92, 0.07, 1.6, 0.0], [0.80, 0.09, 1.3, 1.7], [0.67, 0.08, 1.9, 3.1], [0.53, 0.06, 1.5, 4.6]];
  var COLORS = ['27,73,200', '46,134,222', '138,112,232', '255,255,255'];
  function buildParticles() {
    var c = doc.createElement('canvas'), x = c.getContext('2d'), small, n, i, a, dist;
    if (!x) return;
    c.className = 'hv-pt'; c.setAttribute('aria-hidden', 'true');
    stage.appendChild(c);
    ptc = c; ptx = x;
    small = !!(mqSmall && mqSmall.matches);
    n = small ? 40 : 110;
    parts = [];
    for (i = 0; i < n; i++) {
      a = Math.random() * 6.2832; dist = 0.62 + Math.random() * 0.4;
      parts.push({
        u: Math.random(), lane: i % 4, off: (Math.random() - 0.5) * 0.09,
        sp: 0.008 + Math.random() * 0.014, r: 1 + Math.random() * 1.7,
        kind: Math.random() < 0.2 ? 3 : i % 3, ph: Math.random() * 6.2832, tw: 0.5 + Math.random() * 0.9,
        sx: 0.5 + Math.cos(a) * dist, sy: 0.5 + Math.sin(a) * dist * 0.9,
        delay: Math.random() * 0.8, a: 0.34 + Math.random() * 0.4, x: 0, y: 0, k: 0
      });
    }
  }
  function stepParticles() {
    if (!ptx) return;
    var t = S.t, i, p, L, fx, fy, k;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      L = LANES[p.lane];
      fx = (p.u + p.sp * t) % 1;
      fy = L[0] - 0.44 * fx + L[1] * Math.sin(6.2832 * fx * L[2] + L[3] + t * 0.1) + p.off;
      k = easeOut(clamp((t - p.delay) / 1.6, 0, 1));
      p.k = k; p.fx = fx;
      p.x = p.sx + (fx - p.sx) * k;
      p.y = p.sy + (fy - p.sy) * k - 0.5 * S.sp;
    }
  }
  function drawParticles() {
    if (!ptx) return;
    var t = S.t, s = W / (cssW || 1), kind, i, p, a, edge;
    var appear = clamp(t / 0.35, 0, 1), calm = 1 - 0.28 * clamp((t - 2.4) / 2, 0, 1);
    ptx.clearRect(0, 0, W, H);
    for (kind = 0; kind < 4; kind++) {
      ptx.fillStyle = 'rgb(' + COLORS[kind] + ')';
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (p.kind !== kind) continue;
        edge = p.k < 1 ? 1 : smooth(0, 0.07, p.fx) * (1 - smooth(0.93, 1, p.fx));
        a = p.a * appear * calm * edge * (0.72 + 0.28 * Math.sin(t * p.tw + p.ph)) * (1 - S.sp);
        if (avoid.length && overText(p.x, p.y)) a *= 0.16;
        if (a <= 0.01) continue;
        ptx.globalAlpha = a;
        ptx.beginPath();
        ptx.arc(p.x * W, p.y * H, p.r * s, 0, 6.2832);
        ptx.fill();
        if (kind === 3) { ptx.globalAlpha = a * 0.55; ptx.strokeStyle = 'rgb(27,73,200)'; ptx.lineWidth = 0.7 * s; ptx.stroke(); }
      }
    }
    ptx.globalAlpha = 1;
  }

  /* ---------- 叠在图上的文字（全屏版） ---------- */
  /* 把 [data-fx-avoid] 元素换算成面板内的相对坐标。文字块不在面板上（如图文并列版式）时列表为空。 */
  function measureAvoid() {
    avoidDirty = false;
    avoid = [];
    if (!rect || !rect.width || !rect.height) return;
    var els = hero.querySelectorAll('[data-fx-avoid]'), i, r, w = rect.width, h = rect.height;
    for (i = 0; i < els.length; i++) {
      r = els[i].getBoundingClientRect();
      if (!r.width || !r.height || r.right <= rect.left || r.left >= rect.right || r.bottom <= rect.top || r.top >= rect.bottom) continue;
      avoid.push({ il: (r.left - rect.left) / w, it: (r.top - rect.top) / h, ir: (r.right - rect.left) / w, ib: (r.bottom - rect.top) / h });
    }
  }
  function overText(x, y) {
    for (var i = 0; i < avoid.length; i++) {
      if (x > avoid[i].il - 0.01 && x < avoid[i].ir + 0.01 && y > avoid[i].it - 0.01 && y < avoid[i].ib + 0.01) return true;
    }
    return false;
  }

  /* ---------- 尺寸、位置与滚动进度（只在需要时读一次布局） ---------- */
  function objectPos() {
    var v, m;
    try { v = win.getComputedStyle(img).objectPosition || ''; } catch (e) { v = ''; }
    m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(v);
    return m ? [parseFloat(m[1]) / 100, parseFloat(m[2]) / 100] : [0.5, 0.5];
  }
  function measure() {
    dirty = false;
    rect = stage.getBoundingClientRect();
    var w = rect.width, h = rect.height, small, dpr, k, ia, pa, pos;
    var vh = win.innerHeight || root.clientHeight, py = win.pageYOffset || root.scrollTop || 0, absTop;
    if (!w || !h) return false;
    // 滚动进度：面板上边接近视口顶部后才从 0 走到 1（全屏版几乎一滚动就开始；手机上图片在中间时不散开）
    absTop = rect.top + py;
    S.spT = clamp((py - Math.max(0, absTop - vh * 0.1)) / (h * 0.9), 0, 1);
    if (Math.abs(w - cssW) < 0.5 && Math.abs(h - cssH) < 0.5 && W) {   // 只是滚动：尺寸没变
      if (avoidDirty) measureAvoid();
      return true;
    }
    cssW = w; cssH = h;
    small = !!(mqSmall && mqSmall.matches);
    dpr = Math.min(win.devicePixelRatio || 1, small ? MAX_DPR_SMALL : MAX_DPR) * S.quality;
    k = Math.min(1, MAX_SIDE / (Math.max(w, h) * dpr));
    W = Math.max(2, Math.round(w * dpr * k)); H = Math.max(2, Math.round(h * dpr * k));
    if (glc) { glc.width = W; glc.height = H; gl.viewport(0, 0, W, H); }
    if (ptc) { ptc.width = W; ptc.height = H; }
    ia = (img.naturalWidth || 16) / (img.naturalHeight || 9); pa = w / h; pos = objectPos();
    fit = pa < ia ? [pa / ia, 1, (1 - pa / ia) * pos[0], 0] : [1, ia / pa, 0, (1 - ia / pa) * pos[1]];
    // 网点间距（画布像素）= 取样间距（原图像素） × 每个原图像素在画布上的大小
    cellPx = Math.max(1.4, N.cellSrc * W / ((img.naturalWidth || 1) * fit[0]));
    strength = small ? 0.85 : 1;
    measureAvoid();
    return true;
  }

  /* ---------- 每帧 ---------- */
  function step(dt) {
    S.sp += (S.spT - S.sp) * (1 - Math.exp(-dt * 6));   // 滚动进度平滑跟随
    stepParticles();
  }
  function watchSpeed(raw) {
    // 连续掉帧（约 22fps 以下）时先降分辨率并少画网点，再放弃 WebGL。超过 250ms 的间隔视为被系统节流，不计入。
    if (!gl || raw > 250) return;
    S.seen++; if (raw > 45) S.slow++;
    if (S.seen < 90) return;
    if (S.slow > 55) {
      if (S.quality > 0.7) { S.quality = 0.66; cssW = 0; dirty = true; }
      else dropGL(true);
    }
    S.seen = 0; S.slow = 0;
  }
  function frame(now) {
    S.id = 0;
    if (!S.running) return;
    var raw = S.last ? now - S.last : 16, dt = clamp(raw / 1000, 0, 0.05);
    S.last = now; S.t += dt;
    try {
      if (dirty && !measure()) { S.id = raf(frame); return; }
      // 双保险：IntersectionObserver 的通知晚到时，只要面板已整体滚出视口，这一帧就不画
      if (rect && (rect.bottom <= 0 || rect.top >= (win.innerHeight || root.clientHeight))) { S.id = raf(frame); return; }
      step(dt); drawGL(); drawParticles();
      if (S.t > 3) watchSpeed(raw);
    } catch (e) { destroy(); return; }
    S.id = raf(frame);
  }
  /* 不在连续绘制时（暂停、离屏）尺寸变了，要补画一帧，否则画布会被清空 */
  function redrawOnce() {
    if (!S.built || S.dead || S.running || !S.first) return;
    raf(function () {
      if (S.dead || S.running) return;
      try { cssW = 0; if (measure()) { drawGL(); drawParticles(); } } catch (e) { destroy(); }
    });
  }
  function sync() {
    var want = S.built && !S.dead && !S.paused && S.inView && S.shown;
    if (want === S.running) return;
    S.running = want;
    if (want) { fig.classList.add('fx-run'); S.last = 0; dirty = true; S.id = raf(frame); }
    else { fig.classList.remove('fx-run'); if (S.id && caf) caf(S.id); S.id = 0; }
  }

  /* ---------- 暂停 / 开启按钮 ---------- */
  function label() {
    if (!btn) return;
    btn.lastChild.textContent = S.paused ? '开启动效' : '暂停动效';
    btn.setAttribute('title', S.paused ? '继续播放页面上的连续动效' : '暂停页面上的连续动效（首屏网点与光泽、关键词滚动、背景网点）');
  }
  /* 暂停对整页生效：给 <html> 加 .fx-paused（css/decor.css 里的走马灯、网点纹理随之停下），并通知 js/dot-fall.js */
  function broadcast() {
    var ev;
    root.classList[S.paused ? 'add' : 'remove']('fx-paused');
    try { ev = new win.CustomEvent('dc:fxpause', { detail: { paused: S.paused } }); doc.dispatchEvent(ev); } catch (e) { /* 旧浏览器：只靠 class */ }
  }
  function setPaused(p, remember) {
    S.paused = !!p;
    fig.classList[S.paused ? 'add' : 'remove']('is-paused');
    label();
    broadcast();
    if (remember) { try { win.sessionStorage.setItem('dc_fx_paused', S.paused ? '1' : ''); } catch (e) { /* 无痕模式等 */ } }
    sync();
  }
  function buildButton() {
    btn = doc.createElement('button');
    btn.type = 'button'; btn.className = 'fx-toggle';
    btn.innerHTML = '<i aria-hidden="true"></i><span></span>';
    btn.addEventListener('click', function () { setPaused(!S.paused, true); });
    fig.insertBefore(btn, fig.querySelector('.hv-tags'));
    label();
  }

  /* ---------- 事件（不监听鼠标） ---------- */
  function onScroll() { dirty = true; }
  function onResize() { dirty = true; avoidDirty = true; redrawOnce(); }
  function onVis() { S.shown = !doc.hidden; sync(); }
  function onMotion(e) { if (e && e.detail && e.detail.enabled === false) destroy(); }
  function onReduce(e) { if (e.matches) destroy(); }
  function listen(on) {
    var f = on ? 'addEventListener' : 'removeEventListener', o = { passive: true };
    doc[f]('visibilitychange', onVis);
    win[f]('scroll', onScroll, o);
    win[f]('resize', onResize, o);
  }

  /* ---------- 建立 / 拆除 ---------- */
  function build() {
    if (S.built || S.dead) return;
    S.built = true;
    try { buildGL(); } catch (e) { dropGL(false); }
    if (!gl) {
      buildSheen();
      try { buildParticles(); } catch (e) { ptc = null; ptx = null; }
    }
    buildButton();
    try { if (win.sessionStorage.getItem('dc_fx_paused') === '1') setPaused(true, false); } catch (e) { /* 忽略 */ }
    fig.classList.add('fx-on');
    listen(true);
    // 文字块入场时带位移，入场结束后再量一次它们的位置
    win.setTimeout(function () { avoidDirty = true; dirty = true; }, 1800);
    if ('IntersectionObserver' in win) {
      io = new IntersectionObserver(function (es) { S.inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.02 });
      io.observe(fig);
    }
    sync();
  }
  /* 拆除全部效果层，回到静态图片（可重复调用） */
  function destroy() {
    if (S.dead) return;
    S.dead = true; S.running = false;
    if (S.id && caf) caf(S.id);
    S.id = 0;
    if (S.built) listen(false);
    if (io) { io.disconnect(); io = null; }
    dropGL(false);
    [ptc, sheen, btn].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
    ptc = null; ptx = null; sheen = null; btn = null; parts = [];
    fig.classList.remove('fx-on', 'fx-run', 'is-paused');
    root.classList.remove('fx-paused');
  }
  function start() {
    if (S.built || S.dead) return;
    // 出场特效（js/intro.js）播放期间先不建，等它结束再开始入场
    if (root.classList.contains('intro-on')) { doc.addEventListener('dc:intro-done', function once() { doc.removeEventListener('dc:intro-done', once); start(); }); return; }
    if (fig.classList.contains('is-fallback')) { S.dead = true; return; }
    if (!motionAllowed()) return;                               // 动效关闭：什么都不建，只有静态图
    if (!img.complete) { img.addEventListener('load', start); return; }
    if (!img.naturalWidth) { fig.classList.add('is-fallback'); hero.classList.add('has-fallback'); S.dead = true; return; }
    try { build(); } catch (e) { destroy(); }
  }

  img.addEventListener('error', function () { fig.classList.add('is-fallback'); hero.classList.add('has-fallback'); destroy(); S.dead = true; });
  doc.addEventListener('dc:motion', onMotion);
  if (mqReduce) {
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }
  start();

  win.DCHeroFx = {
    state: function () {
      return {
        built: S.built, dead: S.dead, running: S.running, paused: S.paused, inView: S.inView, shown: S.shown,
        mode: gl ? 'halftone' : (sheen ? 'sheen' : 'none'), webgl: !!gl, sheen: !!sheen,
        particles: gl ? { ink: N.ink, glint: N.glint, mote: N.mote, drawn: N.glint + N.mote + Math.round(N.ink * (S.quality < 1 ? 0.6 : 1)) } : { fallback2d: parts.length },
        canvas: [W, H], cellPx: Math.round(cellPx * 100) / 100, quality: S.quality,
        time: Math.round(S.t * 100) / 100, scroll: Math.round(S.sp * 1000) / 1000,
        fallback: fig.classList.contains('is-fallback')
      };
    },
    /* 复查用：把效果时间推进到 t 秒并立即画一帧，不依赖 requestAnimationFrame。只用于核对画面，不代表实际播放 */
    renderAt: function (t) {
      var guard = 0, dt;
      if (!S.built || S.dead) return null;
      try {
        cssW = 0;
        if (!measure()) return null;
        while (S.t < t && guard++ < 4000) { dt = Math.min(0.05, t - S.t); S.t += dt; step(dt); }
        drawGL(); drawParticles();
      } catch (e) { return null; }
      return win.DCHeroFx.state();
    },
    pause: function () { if (S.built && !S.dead) setPaused(true, true); },
    resume: function () { if (S.built && !S.dead) setPaused(false, true); },
    destroy: destroy
  };
})(window, document);
