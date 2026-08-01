/* 首页文章卡片：基于封面图为信息区染上同色调
 * 取色用独立的 crossorigin Image + 缩略 canvas，避免污染 DOM 里的 <img>。
 * 结果按 URL 缓存到 localStorage，翻页/重访不重复解码。
 * 亮色：主色淡染叠在 --card-bg 上；暗色：极淡色洗，保留卡片透明感。
 * 近似无色的封面不强染色，信息区保持默认底色。
 */
(function () {
  'use strict';

  var CACHE_KEY = 'cover-accent:v1';
  var MAX_ENTRIES = 200;
  var SAMPLE = 16; // 缩略边长，越小越快

  var cache = loadCache();

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveCache() {
    try {
      var keys = Object.keys(cache);
      if (keys.length > MAX_ENTRIES) {
        keys.slice(0, keys.length - MAX_ENTRIES).forEach(function (k) { delete cache[k]; });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* 隐私模式等，忽略 */ }
  }

  function clamp(n) { return n < 0 ? 0 : n > 255 ? 255 : n; }

  // ============ 颜色解析（用于 div 形式封面的纯色/渐变） ============
  function parseColor(str) {
    str = str.trim();
    if (str[0] === '#') {
      var h = str.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length === 6 || h.length === 8) {
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      return null;
    }
    var m = str.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      var p = m[1].split(',').map(function (s) { return parseFloat(s); });
      if (p.length >= 3) return [p[0], p[1], p[2]];
    }
    return null;
  }
  function colorFromBgValue(val) {
    if (!val) return null;
    var hex = val.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hex) { var c = parseColor(hex[0]); if (c) return c; }
    var rgb = val.match(/rgba?\([^)]+\)/i);
    if (rgb) return parseColor(rgb[0]);
    return null;
  }
  function urlFromBgValue(val) {
    if (!val) return null;
    var m = val.match(/url\((['"]?)([^)'"]+)\1\)/i);
    return m ? m[2] : null;
  }

  // ============ RGB <-> HSL ============
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var l = (mx + mn) / 2, h, s;
    if (mx === mn) { h = 0; s = 0; }
    else {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hsl2rgb(h, s, l) {
    if (s === 0) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
  }

  // 提饱和 + 把亮度拉到中段，保证淡染可见且不刺眼；近似无色返回 null
  function tune(r, g, b) {
    var hsl = rgb2hsl(r, g, b);
    if (hsl[1] < 0.08) return null;
    hsl[1] = Math.min(0.85, hsl[1] * 1.25);
    hsl[2] = hsl[2] * 0.45 + 0.286; // 向 ~0.52 收敛
    var out = hsl2rgb(hsl[0], hsl[1], hsl[2]);
    return [Math.round(clamp(out[0])), Math.round(clamp(out[1])), Math.round(clamp(out[2]))];
  }

  // ============ 从已加载图片取主色（饱和度加权） ============
  function dominantColor(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return null;
    var c = document.createElement('canvas');
    c.width = SAMPLE; c.height = SAMPLE;
    var ctx = c.getContext('2d');
    try { ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE); }
    catch (e) { return null; }
    var data;
    try { data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data; }
    catch (e) { return null; } // 跨域污染 / CORS 失败
    var R = 0, G = 0, B = 0, W = 0, Rn = 0, Gn = 0, Bn = 0, Wn = 0;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 16) continue;
      var chroma = Math.max(r, g, b) - Math.min(r, g, b); // 0..255
      var w1 = chroma; // 鲜艳像素主导，忽略白/灰背景
      R += r * w1; G += g * w1; B += b * w1; W += w1;
      Rn += r; Gn += g; Bn += b; Wn++;
    }
    var rgb;
    if (W > 0) rgb = [R / W, G / W, B / W];
    else if (Wn > 0) rgb = [Rn / Wn, Gn / Wn, Bn / Wn];
    else return null;
    return tune(rgb[0], rgb[1], rgb[2]);
  }

  function loadAndSample(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { cb(dominantColor(img)); };
    img.onerror = function () { cb(null); };
    img.src = url;
  }

  // ============ 单张卡片处理 ============
  // 封面图走 vanilla-lazyload：真图 URL 存在 data-lazy-src，视口外 src 是占位图。
  // 故优先用 data-lazy-src 作取色 URL 与缓存键，避免给占位图取色。
  function getCoverInfo(item) {
    var bg = item.querySelector('.post-bg');
    if (!bg) return null;
    if (bg.tagName === 'IMG') {
      var lazy = bg.getAttribute('data-lazy-src');
      var src = lazy || bg.currentSrc || bg.src;
      return src ? { type: 'img', url: src, el: bg, ready: lazy ? bg.getAttribute('data-ll-status') === 'loaded' : bg.complete } : null;
    }
    // div 形式：<div class="post-bg" style="background: ...">
    var val = bg.getAttribute('style') || '';
    var url = urlFromBgValue(val);
    if (url) return { type: 'img', url: url, el: null, ready: true };
    var col = colorFromBgValue(val);
    if (col) return { type: 'color', color: col, ready: true };
    return null;
  }

  // 染色目标整张卡片：--cover-accent 写到 .recent-post-item 上，
  // 封面图盖在左侧自然过渡，信息区透明叠在染色卡片上，避免外露白边。
  function apply(item, rgb) {
    item.style.setProperty('--cover-accent', rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
  }

  function sampleAndApply(item, url) {
    if (cache[url]) { apply(item, cache[url]); return; }
    loadAndSample(url, function (rgb) {
      if (!rgb) return;
      cache[url] = rgb;
      saveCache();
      apply(item, rgb);
    });
  }

  function tint(item) {
    var info = item.querySelector('.recent-post-info');
    if (!info || info.classList.contains('no-cover')) return;
    var c = getCoverInfo(item);
    if (!c) return;
    if (c.type === 'color') { apply(item, c.color); return; }
    if (c.ready) { sampleAndApply(item, c.url); return; }
    // 真图尚未加载：等 lazyload swap 真图触发 load 后再取色
    if (!c.el) return;
    c.el.addEventListener('load', function onLoad() {
      c.el.removeEventListener('load', onLoad);
      sampleAndApply(item, c.url);
    });
  }

  // ============ 文章页 #post：取 #page-header.post-bg 封面主色，写到 #post 上 ============
  // 仅文章详情页存在 #post；封面以 inline style 的 background-image 挂在
  // #page-header.post-bg，与首页 .post-bg 同源，复用上面的取色/缓存/染色逻辑。
  function tintPost() {
    var post = document.getElementById('post');
    if (!post) return;
    var header = document.getElementById('page-header');
    if (!header || !header.classList.contains('post-bg')) return;
    var val = header.getAttribute('style') || '';
    var url = urlFromBgValue(val);
    if (url) {
      if (cache[url]) { apply(post, cache[url]); return; }
      loadAndSample(url, function (rgb) {
        if (!rgb) return;
        cache[url] = rgb;
        saveCache();
        apply(post, rgb);
      });
      return;
    }
    var col = colorFromBgValue(val);
    if (col) apply(post, col);
  }

  function run() {
    var items = document.querySelectorAll('.recent-post-item');
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains('ads-wrap')) continue;
      tint(items[i]);
    }
    tintPost();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // pjax 当前关闭，按现有脚本约定兜底：日后开启则切页后重跑
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', run, 'cover_accent_run');
  } else {
    document.addEventListener('pjax:complete', run);
  }
})();
