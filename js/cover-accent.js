/* 首页文章卡片：基于封面图为信息区染上同色调
 * 取色用独立的 crossorigin Image + 缩略 canvas，避免污染 DOM 里的 <img>。
 * 结果按 URL 缓存到 localStorage，翻页/重访不重复解码。
 * 亮色：主色淡染叠在 --card-bg 上；暗色：极淡色洗，保留卡片透明感。
 * 近似无色的封面不强染色，信息区保持默认底色。
 */
(function () {
  'use strict';

  var CACHE_KEY = 'cover-accent:v1';
  var TONE_KEY = 'cover-tone:v1';
  var MAX_ENTRIES = 200;
  var SAMPLE = 16; // 缩略边长，越小越快
  var TONE_SAMPLE = 32; // 明暗判断用稍大的采样面
  var CARD_RATIO = Math.SQRT2; // 移动端卡片封面比例（√2:1）
  var TONE_THRESHOLD = 0.60;     // 底部区域 75 分位亮度阈值

  var cache = loadCache();
  var toneCache = loadToneCache();

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
  function loadToneCache() {
    try { return JSON.parse(localStorage.getItem(TONE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveToneCache() {
    try {
      var keys = Object.keys(toneCache);
      if (keys.length > MAX_ENTRIES) {
        keys.slice(0, keys.length - MAX_ENTRIES).forEach(function (k) { delete toneCache[k]; });
      }
      localStorage.setItem(TONE_KEY, JSON.stringify(toneCache));
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

  // ============ 底部文字黑白选择 ============
  function srgbLuminance(r, g, b) {
    function lin(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function toneFromColor(rgb) {
    return srgbLuminance(rgb[0], rgb[1], rgb[2]) >= TONE_THRESHOLD ? 'light' : 'dark';
  }

  // 按卡片封面的 cover 裁切，只取底部 25%（标题/日期所在区域）判断明暗
  function bottomTone(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return null;
    var c = document.createElement('canvas');
    c.width = TONE_SAMPLE; c.height = TONE_SAMPLE;
    var ctx = c.getContext('2d');
    var ratio = w / h;
    var sx = 0, sy = 0, sw = w, sh = h;
    if (ratio > CARD_RATIO) {
      sw = h * CARD_RATIO;
      sx = (w - sw) / 2;
    } else {
      sh = w / CARD_RATIO;
      sy = (h - sh) / 2;
    }
    try { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TONE_SAMPLE, TONE_SAMPLE); }
    catch (e) { return null; }
    var data;
    try { data = ctx.getImageData(0, 0, TONE_SAMPLE, TONE_SAMPLE).data; }
    catch (e) { return null; }
    var values = [];
    var startRow = Math.floor(TONE_SAMPLE * 0.75);
    for (var y = startRow; y < TONE_SAMPLE; y++) {
      for (var x = 0; x < TONE_SAMPLE; x++) {
        var i = (y * TONE_SAMPLE + x) * 4;
        if (data[i + 3] < 16) continue;
        values.push(srgbLuminance(data[i], data[i + 1], data[i + 2]));
      }
    }
    if (!values.length) return null;
    values.sort(function (a, b) { return a - b; });
    return values[Math.floor(values.length * 0.75)] >= TONE_THRESHOLD ? 'light' : 'dark';
  }

  function loadAndSample(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { cb({ rgb: dominantColor(img), tone: bottomTone(img) }); };
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
      var original = bg.getAttribute('data-cover-src');
      var lazy = bg.getAttribute('data-lazy-src');
      var src = original || lazy || bg.currentSrc || bg.src;
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

  function applyTone(item, tone) {
    if (tone === 'light' || tone === 'dark') item.setAttribute('data-cover-tone', tone);
  }

  // 构建时预计算的颜色表；命中时不需要再下载/采样图片。
  function precomputedColor(url) {
    var map = window.__COVER_COLORS;
    if (!map || !url || !Object.prototype.hasOwnProperty.call(map, url)) return undefined;
    var rgb = map[url];
    return rgb && rgb.length === 3 ? rgb : false;
  }

  // 构建时预计算的明暗表（可选，缺失时运行时采样补上）
  function precomputedTone(url) {
    var map = window.__COVER_TONES;
    if (!map || !url || !Object.prototype.hasOwnProperty.call(map, url)) return null;
    return map[url] === 'light' || map[url] === 'dark' ? map[url] : null;
  }

  // 构建时按标题/日期的实际文字区域算好的字色
  function precomputedTextTones(url) {
    var map = window.__COVER_TEXT_TONES;
    if (!map || !url || !Object.prototype.hasOwnProperty.call(map, url)) return null;
    var tones = map[url];
    return tones && typeof tones === 'object' ? tones : null;
  }

  function applyTextTones(item, tones) {
    if (!tones) return;
    var info = item.querySelector('.recent-post-info');
    if (!info) return;
    var title = info.querySelector('.article-title');
    var meta = info.querySelector('.article-meta-wrap');
    var content = info.querySelector('.content');
    if (title && tones.title) title.setAttribute('data-cover-tone', tones.title);
    if (meta && tones.meta) meta.setAttribute('data-cover-tone', tones.meta);
    var contentTone = tones.content || tones.title;
    if (content && contentTone) content.setAttribute('data-cover-tone', contentTone);
    if (tones.title) applyTone(item, tones.title);
  }

  function sampleAndApply(item, url) {
    var hasColor = !!cache[url];
    var hasTone = !!toneCache[url];
    if (hasColor) apply(item, cache[url]);
    if (hasTone) applyTone(item, toneCache[url]);
    if (hasColor && hasTone) return;
    loadAndSample(url, function (res) {
      if (!res) return;
      if (res.rgb && !hasColor) {
        cache[url] = res.rgb;
        saveCache();
        apply(item, res.rgb);
      }
      if (res.tone && !hasTone) {
        toneCache[url] = res.tone;
        saveToneCache();
        applyTone(item, res.tone);
      }
    });
  }

  function tint(item) {
    var info = item.querySelector('.recent-post-info');
    if (!info || info.classList.contains('no-cover')) return;
    var c = getCoverInfo(item);
    if (!c) return;
    if (c.type === 'color') {
      apply(item, c.color);
      applyTone(item, toneFromColor(c.color));
      return;
    }
    var preTone = precomputedTone(c.url);
    if (preTone) applyTone(item, preTone);
    applyTextTones(item, precomputedTextTones(c.url));
    var pre = precomputedColor(c.url);
    if (pre === false) return;
    if (pre) { apply(item, pre); return; }
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
    var url = header.getAttribute('data-cover-src') || urlFromBgValue(val);
    if (url) {
      var pre = precomputedColor(url);
      if (pre === false) return;
      if (pre) { apply(post, pre); return; }
      if (cache[url]) { apply(post, cache[url]); return; }
      loadAndSample(url, function (res) {
        if (!res || !res.rgb) return;
        cache[url] = res.rgb;
        saveCache();
        apply(post, res.rgb);
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
