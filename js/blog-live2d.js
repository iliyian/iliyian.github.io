(() => {
  if (window.__blogLive2DLoaded) return;
  window.__blogLive2DLoaded = true;

  const assetBase = 'https://r2-imgs.iliyian.com/live2d/';
  // const assetBase = '/live2d/';
  const base = `${assetBase}models/37/`;
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const defaultWidgetSize = Math.min(520, Math.max(360, Math.floor(viewportHeight * 0.52)));
  // 可在加载本文件前设置 window.blogLive2DConfig 覆盖这些默认值。
  // 示例：window.blogLive2DConfig = { model: { scale: 0.9 }, tracking: { tiltSensitivity: 0.4 } }。
  const config = {
    mobile: {
      // 移动端检测：portrait 用视口宽高比判断；也可以手动设 true/false。
      detect: 'portrait',
      // detect 为 portrait 时，innerWidth / innerHeight 小于该值就启用移动端配置。
      aspectRatio: 1,
      // 移动端整体缩放倍率；会同时缩小 canvas 尺寸和模型 scale。
      scale: 0.85,
      // 移动端可选覆盖 canvas 位置，例如 { right: -12, bottom: -8 }。
      canvas: {},
      // 移动端可选覆盖模型位置，例如 { offset: [0.45, -1.05] }。
      model: {},
    },
    canvas: {
      // 挂件固定到哪个角；目前 l2d-widget 支持 bottom-left / bottom-right。
      position: 'bottom-right',
      // canvas 的 CSS 宽高，单位 px；模型只会画在这个区域内。
      width: defaultWidgetSize * 0.62,
      height: defaultWidgetSize,
      // canvas 容器离窗口右/下边缘的距离，单位 px；bottom-left 时可用 left 覆盖左边距。
      right: 0,
      bottom: 0,
      left: 0,
      // canvas 容器层级。
      zIndex: 9999,
    },
    model: {
      // 初始显示皮肤下标：0 原皮，1 一位质数，2 快乐的捕鸟人，3 泉眼深处，4 完美的流体。
      initialIndex: 4,
      // 模型在 canvas 内的缩放；1 是当前基准大小。
      scale: 1.2,
      // 模型在 canvas 内的偏移；[x, y]，x 正值右移，y 正值上移。
      offset: [0, -1.62],
      // motion 自带语音和脚本手动播放语音的音量，范围 0~1。
      volume: 0.9,
      // 脚本侧语音口型参数；按模型存在情况依次尝试。
      lipSyncIds: ['ParamMouthForm'],
      lipSyncMin: -90,
      lipSyncMax: 180,
      lipSyncThreshold: 0.08,
      lipSyncSmooth: 0.12,
      typingSpeed: 120,
      idleDelay: 420000,
    },
    tracking: {
      // 眼球左右/上下跟随幅度，作用于 ParamEyeBallX/Y。
      eyeSensitivity: 1,
      // 头部跟随幅度，作用于 ParamAngleX/Y 等非 Body、非 EyeBall、非 Z 轴参数。
      headSensitivity: 1,
      // 身体跟随幅度，作用于 ParamBodyAngleX/Y。
      bodySensitivity: 1,
      // 左右倾斜幅度，作用于 Axis=2 的 Z 轴参数，如 ParamAngleZ / ParamBodyAngleZ。
      tiltSensitivity: 1,
      // 鼠标追踪满量程半径 = “脸”命中区域宽高 * radiusX/Y；值越大越不敏感。
      radiusX: 6,
      radiusY: 3,
      // 如果“脸”命中区域太小，半径至少为 canvas 宽高的这个比例。
      minRadiusX: 0.22,
      minRadiusY: 0.22,
      // 手动平滑系数；越大响应越快，1 表示立即到位；null 表示按模型 SmoothTime 自动换算。
      smooth: null,
      // 自动平滑换算：smooth = autoSmoothBase / max(SmoothTime, autoSmoothBase)。
      autoSmoothBase: 0.08,
      // 自动平滑结果的上下限，避免太慢或瞬移。
      autoSmoothMin: 0.08,
      autoSmoothMax: 0.45,
    },
  };

  function mergeConfig(target, source) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = mergeConfig({ ...(target[key] ?? {}) }, value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  function isMobile() {
    if (config.mobile.detect === true || config.mobile.detect === false) return config.mobile.detect;
    if (config.mobile.detect === 'portrait') {
      return window.innerWidth / window.innerHeight < config.mobile.aspectRatio;
    }
    return window.matchMedia('(max-width: 768px)').matches || (navigator.maxTouchPoints ?? 0) > 0;
  }

  function applyMobileConfig() {
    if (!isMobile()) return;
    const scale = typeof config.mobile.scale === 'number' ? config.mobile.scale : 1;
    config.canvas.width = Math.round(config.canvas.width * scale);
    config.canvas.height = Math.round(config.canvas.height * scale);
    config.model.scale *= scale;
    mergeConfig(config.canvas, config.mobile.canvas);
    mergeConfig(config.model, config.mobile.model);
  }

  mergeConfig(config, window.blogLive2DConfig || window.BLOG_LIVE2D_CONFIG);

  applyMobileConfig();

  const widgetHeight = config.canvas.height;
  const widgetWidth = config.canvas.width;
  const models = [
    {
      name: '原皮',
      raw: '90d8644e2a1bbecca3c845c41937b1dd.model3.json',
      clean: '90d8644e2a1bbecca3c845c41937b1dd.blog.model3.json',
      command: '90d8644e2a1bbecca3c845c41937b1dd',
    },
    {
      name: '一位质数',
      raw: '1efa04e576aa5447703fe8053127c4c8.model3.json',
      clean: '1efa04e576aa5447703fe8053127c4c8.blog.model3.json',
      command: '1efa04e576aa5447703fe8053127c4c8',
    },
    {
      name: '快乐的捕鸟人',
      raw: 'a30907361155f9736acdb00055ebc043.model3.json',
      clean: 'a30907361155f9736acdb00055ebc043.blog.model3.json',
      command: 'a30907361155f9736acdb00055ebc043',
    },
    {
      name: '泉眼深处',
      raw: '68ebbe52a1db89b500a70221ab49c47d.model3.json',
      clean: '68ebbe52a1db89b500a70221ab49c47d.blog.model3.json',
      command: '68ebbe52a1db89b500a70221ab49c47d',
    },
    {
      name: '完美的流体',
      raw: '662961567ba67e016ed9633ff2991193.model3.json',
      clean: '662961567ba67e016ed9633ff2991193.blog.model3.json',
      command: '662961567ba67e016ed9633ff2991193',
    },
  ];

  const sourceCache = new Map();
  const boundInstances = new WeakSet();
  const initialModel = clamp(Math.trunc(config.model.initialIndex ?? 0), 0, models.length - 1);
  const modelOrder = [initialModel, ...models.map((_, index) => index).filter((index) => index !== initialModel)];
  let widget;
  let currentModel = initialModel;
  let currentSource;
  let muted = false;
  let audio;
  let lipSyncSource;
  let lipSyncAnimation;
  let lipSyncIds = [];
  const lipSyncValues = {};
  let hideTimer;
  let expressionClearTimer;
  let expressionClearToken = 0;
  let activeExpression;
  let panel;
  let speech;
  let mouseTrackingInstalled = false;
  let busyUntil = 0;
  let idleTimer;
  let tick10Enabled = true;
  let switching = false;
  let startGreetingPending = true;
  let mouseX = 0;
  let mouseY = 0;
  let lastPointerDown;
  let tapDebugInstalled = false;
  let tapBatchTimer;
  const pendingTapAreas = new Set();
  const mouseTrackingValues = {};

  function debugLive2D(label, details) {
    console.log(`[blog-live2d] ${label}`, { time: performance.now().toFixed(0), ...details });
  }

  function pointerDebug(event) {
    const canvas = widget?.l2d?.getCanvas?.();
    const rect = canvas?.getBoundingClientRect?.();
    const pointer = {
      clientX: Math.round(event.clientX),
      clientY: Math.round(event.clientY),
    };
    if (rect) {
      pointer.canvasX = Math.round(event.clientX - rect.left);
      pointer.canvasY = Math.round(event.clientY - rect.top);
      pointer.canvasWidth = Math.round(rect.width);
      pointer.canvasHeight = Math.round(rect.height);
    }
    return pointer;
  }

  function installTapDebug() {
    if (tapDebugInstalled) return;
    tapDebugInstalled = true;
    document.addEventListener('pointerdown', (event) => {
      lastPointerDown = pointerDebug(event);
      debugLive2D('pointerdown', {
        model: models[currentModel]?.name,
        pointer: lastPointerDown,
        hitAreas: widget?.l2d?.getHitAreaBounds?.() ?? [],
      });
    }, { passive: true, capture: true });
  }

  function installFetchGuard() {
    const originalFetch = window.fetch;
    if (originalFetch.__blogLive2DGuarded) return;
    const guardedFetch = (input, init) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (typeof url === 'string' && url.endsWith('/NullValue')) {
        return Promise.resolve(new Response(new ArrayBuffer(0), { status: 200 }));
      }
      return originalFetch(input, init);
    };
    guardedFetch.__blogLive2DGuarded = true;
    window.fetch = guardedFetch;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatText(text) {
    return escapeHtml(text ?? '')
      .replaceAll('{$br}', '<br>')
      .replaceAll('{$intimacy}', '∞');
  }

  function addStyle() {
    if (document.getElementById('blog-live2d-style')) return;
    const style = document.createElement('style');
    style.id = 'blog-live2d-style';
    style.textContent = `
      #blog-live2d-speech {
        position: fixed;
        right: ${Math.max(18, config.canvas.right + Math.round(widgetWidth * 0.7))}px;
        bottom: ${config.canvas.bottom + Math.round(widgetHeight * 0.68)}px;
        z-index: 10001;
        max-width: min(320px, calc(100vw - ${widgetWidth + 36}px));
        padding: 10px 14px;
        border-radius: 12px;
        color: rgba(255,255,255,.96);
        background: rgba(107,91,122,.9);
        box-shadow: 0 8px 28px rgba(0,0,0,.22);
        backdrop-filter: blur(10px);
        font-size: 14px;
        line-height: 1.65;
        opacity: 0;
        transform: translateY(8px) scale(.96);
        transform-origin: right bottom;
        pointer-events: none;
        transition: opacity .22s ease, transform .22s ease;
      }
      #blog-live2d-speech.blog-live2d-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      #blog-live2d-panel {
        position: fixed;
        right: 14px;
        bottom: 16px;
        z-index: 10002;
        width: min(280px, calc(100vw - 28px));
        max-height: min(480px, calc(100vh - 32px));
        overflow: auto;
        padding: 12px;
        border-radius: 14px;
        background: rgba(25,23,32,.88);
        color: rgba(255,255,255,.94);
        box-shadow: 0 12px 36px rgba(0,0,0,.28);
        backdrop-filter: blur(14px);
        font-size: 14px;
      }
      #blog-live2d-panel .blog-live2d-panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        font-weight: 600;
      }
      #blog-live2d-panel button {
        width: 100%;
        margin: 4px 0;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;
        color: rgba(255,255,255,.94);
        background: rgba(255,255,255,.08);
        cursor: pointer;
        text-align: left;
      }
      #blog-live2d-panel button:hover {
        background: rgba(255,255,255,.16);
      }
      #blog-live2d-panel .blog-live2d-close {
        width: auto;
        margin: 0;
        padding: 2px 8px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSpeech() {
    if (speech) return speech;
    speech = document.createElement('div');
    speech.id = 'blog-live2d-speech';
    document.body.appendChild(speech);
    return speech;
  }

  let typingTimer;

  function hideSpeech() {
    clearTimeout(typingTimer);
    speech?.classList.remove('blog-live2d-visible');
  }

  function pulseMouth() {
    if (!lipSyncIds.length) return;
    for (const id of lipSyncIds) {
      lipSyncValues[id] = config.model.lipSyncMin + Math.random() * (config.model.lipSyncMax - config.model.lipSyncMin);
    }
    applyForcedParams();
    setTimeout(() => {
      for (const id of lipSyncIds) delete lipSyncValues[id];
      applyForcedParams();
    }, config.model.typingSpeed / 2);
  }

  function showSpeech(text, duration = 5000, sound) {
    if (!text) return;
    const el = ensureSpeech();
    clearTimeout(hideTimer);
    clearTimeout(typingTimer);
    el.innerHTML = '';
    el.classList.add('blog-live2d-visible');

    const raw = String(text ?? '').replaceAll('{$br}', '\n').replaceAll('{$intimacy}', '∞');
    let i = 0;
    const tick = () => {
      if (i >= raw.length) {
        typingTimer = 0;
        if (!sound) hideTimer = setTimeout(hideSpeech, duration);
        return;
      }
      const ch = raw[i];
      if (ch === '\n') {
        el.innerHTML += '<br>';
      } else if (ch === '<') {
        el.innerHTML += '&lt;';
      } else if (ch === '>') {
        el.innerHTML += '&gt;';
      } else if (ch === '&') {
        el.innerHTML += '&amp;';
      } else if (ch === '"') {
        el.innerHTML += '&quot;';
      } else {
        el.innerHTML += ch;
      }
      if (ch !== '\n' && !sound) pulseMouth();
      i++;
      typingTimer = setTimeout(tick, config.model.typingSpeed);
    };
    tick();

    if (!sound) return;

    const syncDuration = () => {
      if (audio !== sound || !Number.isFinite(sound.duration)) return;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideSpeech, sound.duration * 1000 + 300);
    };

    sound.addEventListener('loadedmetadata', syncDuration, { once: true });
    sound.addEventListener('ended', () => {
      if (audio !== sound) return;
      clearTimeout(hideTimer);
      hideSpeech();
    }, { once: true });
    if (sound.readyState >= 1) syncDuration();
  }

  function closePanel() {
    panel?.remove();
    panel = null;
  }

  let panelAutoHide;

  function closePanel() {
    clearTimeout(panelAutoHide);
    panel?.remove();
    panel = null;
  }

  function openPanel(title, items) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'blog-live2d-panel';
    panel.addEventListener('mouseenter', () => clearTimeout(panelAutoHide));
    panel.addEventListener('mouseleave', () => { panelAutoHide = setTimeout(closePanel, 3000); });
    const header = document.createElement('div');
    header.className = 'blog-live2d-panel-title';
    const label = document.createElement('span');
    label.textContent = title;
    const close = document.createElement('button');
    close.className = 'blog-live2d-close';
    close.textContent = '×';
    close.addEventListener('click', closePanel);
    header.append(label, close);
    panel.appendChild(header);
    items.forEach((item) => {
      const button = document.createElement('button');
      button.textContent = item.text;
      button.addEventListener('click', item.onClick);
      panel.appendChild(button);
    });
    document.body.appendChild(panel);
    panelAutoHide = setTimeout(closePanel, 8000);
  }

  async function loadSource(index) {
    if (sourceCache.has(index)) return sourceCache.get(index);
    const response = await fetch(`${base}${models[index].raw}`);
    const source = await response.json();
    sourceCache.set(index, source);
    return source;
  }

  function motions() {
    return currentSource?.FileReferences?.Motions ?? {};
  }

  function entries(group) {
    return motions()[group] ?? [];
  }

  function findEntry(group, name) {
    if (!group) return null;
    const list = entries(group);
    if (!name) return list.find((entry) => resourceFile(entry.File) || resourceFile(entry.Sound) || entry.Text || entry.Choices) ?? null;
    return list.find((entry) => entry.Name === name) ?? null;
  }

  function findEntryByFile(group, file) {
    if (!group || !file) return null;
    return entries(group).find((entry) => entry.File === file) ?? null;
  }

  function entryIndex(group, entry) {
    return entries(group).indexOf(entry);
  }

  function randomEntry(groups) {
    const candidates = groups.flatMap((group) => entries(group)
      .filter((entry) => resourceFile(entry.File) || resourceFile(entry.Sound) || entry.Text || entry.Choices)
      .map((entry) => ({ group, entry })));
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  function expressionId(name) {
    if (!name || name === 'NullValue') return null;
    return name.endsWith('.exp3') ? name : name.replace(/\.exp3\.json$/, '.exp3');
  }

  function resourceFile(file) {
    if (!file || file === 'NullValue') return null;
    return file;
  }

  function updateLipSyncIds() {
    const params = widget?.l2d?.getParams?.() ?? [];
    const ids = new Set(params.map((param) => param.id));
    lipSyncIds = config.model.lipSyncIds.filter((id) => ids.has(id));
    debugLive2D('lipsync params', { model: models[currentModel]?.name, lipSyncIds });
  }

  function applyForcedParams() {
    widget?.l2d?.setParams?.({ ...mouseTrackingValues, ...lipSyncValues });
  }

  function stopLipSync() {
    if (lipSyncAnimation) cancelAnimationFrame(lipSyncAnimation);
    lipSyncAnimation = null;
    lipSyncSource = null;
    for (const id of lipSyncIds) delete lipSyncValues[id];
    applyForcedParams();
  }

  function installLipSync(sound) {
    if (!sound || !lipSyncIds.length) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(sound);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    lipSyncSource = source;
    const data = new Uint8Array(analyser.fftSize);
    let current = 0;
    const tick = () => {
      if (lipSyncSource !== source || sound.ended) {
        stopLipSync();
        audioCtx.close().catch(() => {});
        return;
      }
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) { const c = (v - 128) / 128; sum += c * c; }
      const rms = Math.sqrt(sum / data.length);
      const target = rms > config.model.lipSyncThreshold ? config.model.lipSyncMax : config.model.lipSyncMin;
      current += (target - current) * config.model.lipSyncSmooth;
      for (const id of lipSyncIds) lipSyncValues[id] = current;
      applyForcedParams();
      lipSyncAnimation = requestAnimationFrame(tick);
    };
    tick();
  }


  function stopAudio() {
    stopLipSync();
    if (!audio) return;
    audio.pause();
    audio = null;
  }

  function playSound(file) {
    const soundFile = resourceFile(file);
    if (!soundFile || muted) return null;
    stopAudio();
    updateLipSyncIds();
    audio = new Audio(soundFile.startsWith('http') ? soundFile : `${base}${soundFile}`);
    audio.crossOrigin = 'anonymous';
    audio.volume = config.model.volume;
    audio.play().catch(() => {});
    installLipSync(audio);
    return audio;
  }

  function setExpression(expr) {
    if (!expr || activeExpression === expr) return;
    activeExpression = expr;
    widget.l2d.setExpression(expr);
  }

  function clearExpression() {
    if (!widget?.l2d?.getExpressions?.().includes('e_idle.exp3')) return;
    setExpression('e_idle.exp3');
  }

  function scheduleClearExpression(duration) {
    clearTimeout(expressionClearTimer);
    const token = ++expressionClearToken;
    expressionClearTimer = setTimeout(() => {
      if (token !== expressionClearToken) return;
      clearExpression();
    }, duration);
  }

  function commandIncludes(command, name) {
    return String(command ?? '').split(';').some((part) => part.trim() === name);
  }

  function scheduleIdle(delay = config.model.idleDelay) {
    clearTimeout(idleTimer);
    if (!tick10Enabled) return;
    idleTimer = setTimeout(() => {
      playRandom(['Tick10']);
    }, delay);
  }

  function cancelIdle() {
    clearTimeout(idleTimer);
  }

  function applyCommand(command) {
    if (!command) return false;
    if (command.includes('mute_sound')) {
      muted = true;
      widget.l2d.setVolume(0);
      stopAudio();
      return true;
    }
    if (command.includes('unmute_sound')) {
      muted = false;
      widget.l2d.setVolume(config.model.volume);
      return true;
    }
    if (command.includes('motions enable Tick10')) {
      tick10Enabled = true;
      scheduleIdle();
      return true;
    }
    if (command.includes('motions disable Tick10')) {
      tick10Enabled = false;
      cancelIdle();
      return true;
    }
    if (command.includes('start_mtn Tick10')) {
      playRandom(['Tick10']);
      return true;
    }
    const match = command.match(/change_(?:cos|model)\s+([a-f0-9]+)\.bin3/i);
    if (match) {
      const index = models.findIndex((model) => model.command === match[1]);
      if (index >= 0) void widget.switchModel(modelOrder.indexOf(index));
      return true;
    }
    return false;
  }

  function openChoices(title, choices) {
    openPanel(title, choices.map((choice) => ({
      text: choice.Text,
      onClick() {
        const next = choice.NextMtn;
        if (next) {
          const [group, name] = next.split(':');
          const target = findEntry(group, name);
          if (target?.Choices) {
            openChoices(target.Text || target.Name || choice.Text, target.Choices);
          } else {
            closePanel();
            playEntry(group, target);
          }
        }
      },
    })));
  }

  function playEntry(group, entry) {
    if (!entry || switching) return false;
    cancelIdle();
    if (entry.Choices?.length) {
      debugLive2D('choices', {
        model: models[currentModel]?.name,
        group,
        name: entry.Name,
        text: entry.Text,
        choices: entry.Choices.map((choice) => choice.Text),
      });
      openChoices(entry.Text || entry.Name || group, entry.Choices);
      return true;
    }
    applyCommand(entry.Command);
    const duration = entry.TextDuration || entry.MotionDuration || 5200;
    if (entry.Interruptable !== true) busyUntil = performance.now() + duration;
    const sound = playSound(entry.Sound);
    if (entry.Text) showSpeech(entry.Text, duration, sound);
    const expr = expressionId(entry.Expression);
    debugLive2D('play entry', {
      model: models[currentModel]?.name,
      group,
      name: entry.Name,
      file: entry.File,
      expression: expr,
      sound: entry.Sound,
      text: entry.Text,
      priority: entry.Priority ?? 4,
      pointer: lastPointerDown,
    });
    if (expr) {
      expressionClearToken++;
      clearTimeout(expressionClearTimer);
      setExpression(expr);
    }
    const motionFile = resourceFile(entry.File);
    const motionIndex = entryIndex(group, entry);
    if (motionFile && motionIndex >= 0) {
      widget.l2d.playMotion(group, motionIndex, entry.Priority ?? 4);
    }
    if (commandIncludes(entry.Command, 'clear_exp') || commandIncludes(entry.PostCommand, 'clear_exp')) {
      scheduleClearExpression(Math.max(duration - 300, 0));
    }
    if (entry.PostCommand) setTimeout(() => applyCommand(entry.PostCommand), duration);
    if (entry.NextMtn) {
      setTimeout(() => {
        const [nextGroup, nextName] = entry.NextMtn.split(':');
        playEntry(nextGroup, findEntry(nextGroup, nextName));
      }, duration);
    } else {
      setTimeout(() => scheduleIdle(), duration);
    }
    return true;
  }

  function playRandom(groups) {
    const picked = randomEntry(groups);
    if (!picked) return false;
    return playEntry(picked.group, picked.entry);
  }

  function openVoiceList() {
    const root = findEntry('语音列表', '语音列表目录');
    if (root?.Choices) openChoices(root.Text || '语音列表', root.Choices);
  }

  function playStartGreeting() {
    playEntry('Start', findEntry('Start', '问候'));
  }

  function openCostumes() {
    const root = findEntry('换装', '换装');
    if (root?.Choices) openChoices(root.Text || '切换时装', root.Choices);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mouseTrackingItems() {
    const controller = currentSource?.Controllers?.MouseTracking;
    if (controller?.Enabled === false) return [];
    return controller?.Items ?? [];
  }

  function installMouseTracking() {
    if (mouseTrackingInstalled) return;
    mouseTrackingInstalled = true;

    document.addEventListener('mousemove', (event) => {
      const canvas = widget?.l2d?.getCanvas?.();
      const canvasRect = canvas?.getBoundingClientRect?.();
      const faceBounds = widget?.l2d?.getHitAreaBounds?.()
        ?.find((area) => area.name === '脸');

      if (canvasRect && faceBounds) {
        const originX = canvasRect.left + (faceBounds.x + faceBounds.w / 2) * canvasRect.width;
        const originY = canvasRect.top + (faceBounds.y + faceBounds.h / 2) * canvasRect.height;
        const radiusX = Math.max(faceBounds.w * canvasRect.width * config.tracking.radiusX, canvasRect.width * config.tracking.minRadiusX);
        const radiusY = Math.max(faceBounds.h * canvasRect.height * config.tracking.radiusY, canvasRect.height * config.tracking.minRadiusY);
        mouseX = clamp((event.clientX - originX) / radiusX, -1, 1);
        mouseY = clamp((event.clientY - originY) / radiusY, -1, 1);
        return;
      }

      if (canvasRect) {
        const originX = canvasRect.left + canvasRect.width * 0.58;
        const originY = canvasRect.top + canvasRect.height * 0.28;
        mouseX = clamp((event.clientX - originX) / (canvasRect.width * 0.45), -1, 1);
        mouseY = clamp((event.clientY - originY) / (canvasRect.height * 0.45), -1, 1);
        return;
      }

      mouseX = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mouseY = clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    }, { passive: true });

    const tick = () => {
      const params = {};
      for (const item of mouseTrackingItems()) {
        if (!item.Id) continue;
        const min = typeof item.Min === 'number' ? item.Min : -1;
        const max = typeof item.Max === 'number' ? item.Max : 1;
        const axis = item.Axis ?? 0;
        let input = axis === 1 ? -mouseY : mouseX;
        if (axis === 2) input = mouseX;
        const center = typeof item.DefaultValue === 'number' ? item.DefaultValue : (min + max) / 2;
        const halfRange = (max - min) / 2;
        const sensitivity = item.Id.includes('EyeBall')
          ? config.tracking.eyeSensitivity
          : item.Id.includes('Body')
            ? config.tracking.bodySensitivity
            : axis === 2
              ? config.tracking.tiltSensitivity
              : config.tracking.headSensitivity;
        const target = clamp(center + input * halfRange * sensitivity, min, max);
        const current = mouseTrackingValues[item.Id] ?? center;
        const smooth = typeof config.tracking.smooth === 'number'
          ? clamp(config.tracking.smooth, 0.01, 1)
          : typeof currentSource?.Controllers?.MouseTracking?.SmoothTime === 'number'
            ? clamp(
              config.tracking.autoSmoothBase / Math.max(currentSource.Controllers.MouseTracking.SmoothTime, config.tracking.autoSmoothBase),
              config.tracking.autoSmoothMin,
              config.tracking.autoSmoothMax,
            )
            : config.tracking.autoSmoothMin;
        const next = current + (target - current) * smooth;
        mouseTrackingValues[item.Id] = next;
        params[item.Id] = next;
      }
      if (Object.keys(params).length) {
        Object.assign(mouseTrackingValues, params);
        applyForcedParams();
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function setCanvasPlacement(next = {}) {
    mergeConfig(config.canvas, next);
    const canvas = widget?.l2d?.getCanvas?.();
    const container = canvas?.parentElement;
    if (!container) return;

    container.style.width = `${config.canvas.width}px`;
    container.style.height = `${config.canvas.height}px`;
    container.style.zIndex = String(config.canvas.zIndex);
    container.style.bottom = `${config.canvas.bottom}px`;
    container.style.left = '';
    container.style.right = '';
    if (config.canvas.position === 'bottom-right') {
      container.style.right = `${config.canvas.right}px`;
    } else {
      container.style.left = `${config.canvas.left ?? config.canvas.right}px`;
    }
    canvas.width = config.canvas.width * window.devicePixelRatio;
    canvas.height = config.canvas.height * window.devicePixelRatio;
    widget.l2d.resize();
  }

  function setModelPlacement(next = {}) {
    mergeConfig(config.model, next);
    widget?.l2d?.setScale?.(config.model.scale);
    widget?.l2d?.setPosition?.(config.model.offset[0], config.model.offset[1]);
    widget?.l2d?.setVolume?.(muted ? 0 : config.model.volume);
  }

  function setTracking(next = {}) {
    mergeConfig(config.tracking, next);
    Object.keys(mouseTrackingValues).forEach((key) => {
      delete mouseTrackingValues[key];
    });
  }

  function whitePointIds() {
    const items = currentSource?.Controllers?.ArtmeshOpacity?.Items ?? [];
    return [...new Set(items
      .filter((item) => item.Name === '白点')
      .flatMap((item) => item.Ids ?? []))];
  }

  function activeAppModel() {
    const delegate = widget?.l2d?._state?.l2d6Model?._subdelegates?.[0];
    return delegate?.getLive2DManager?.()?._models?.[0] ?? null;
  }

  function hideWhitePoints(appModel = activeAppModel()) {
    const ids = whitePointIds();
    const model = appModel?._model;
    const coreModel = model?._model;
    const opacities = coreModel?.drawables?.opacities;
    if (!ids.length || !model || !opacities) return false;

    const wanted = new Set(ids);
    const drawableIds = Array.from(coreModel.drawables?.ids ?? []);

    let hidden = false;
    drawableIds.forEach((drawableId, index) => {
      if (wanted.has(drawableId)) {
        opacities[index] = 0;
        hidden = true;
      }
    });
    return hidden;
  }

  function installWhitePointHider() {
    const appModel = activeAppModel();
    if (!appModel || appModel.__blogLive2DWhitePointHider) return;

    const originalDoDraw = appModel.doDraw;
    if (typeof originalDoDraw === 'function') {
      appModel.doDraw = function(...args) {
        hideWhitePoints(this);
        return originalDoDraw.apply(this, args);
      };
    }
    appModel.__blogLive2DWhitePointHider = true;
    hideWhitePoints(appModel);
  }

  function pickTapHit(areaNames) {
    const hits = areaNames
      .map((areaName) => currentSource?.HitAreas?.find((area) => area.Name === areaName) ?? { Name: areaName })
      .filter(Boolean);
    return hits.sort((a, b) => (a.Order ?? 999) - (b.Order ?? 999))[0] ?? null;
  }

  function playTap(areaName) {
    if (performance.now() < busyUntil) return;
    const hit = currentSource?.HitAreas?.find((area) => area.Name === areaName);
    debugLive2D('tap', {
      model: models[currentModel]?.name,
      areaName,
      motionGroup: hit?.Motion,
      hit,
      pointer: lastPointerDown,
    });
    if (hit?.Motion) {
      playRandom([hit.Motion]);
      return;
    }
    playRandom([areaName, 'Tap', '1-3', '2-3', '3-3', '1']);
  }

  function enqueueTap(areaName) {
    pendingTapAreas.add(areaName);
    clearTimeout(tapBatchTimer);
    tapBatchTimer = setTimeout(() => {
      const hit = pickTapHit([...pendingTapAreas]);
      pendingTapAreas.clear();
      if (hit?.Name) playTap(hit.Name);
    }, 0);
  }

  function bindEvents() {
    const instance = widget.l2d;
    if (boundInstances.has(instance)) return;
    boundInstances.add(instance);
    instance.on('loaded', () => {
      if (instance !== widget.l2d) return;
      installTapDebug();
      installWhitePointHider();
      installMouseTracking();
      updateLipSyncIds();
      if (startGreetingPending) {
        startGreetingPending = false;
        playStartGreeting();
      } else {
        scheduleIdle(3000);
      }
    });
    instance.on('motionstart', (group, index, duration, file) => {
      if (instance !== widget.l2d) return;
      const entry = findEntryByFile(group, file);
      const expr = expressionId(entry?.Expression);
      debugLive2D('motionstart', {
        model: models[currentModel]?.name,
        group,
        index,
        duration,
        file,
        expression: expr,
        entry: entry?.Name,
      });
        if (expr) setExpression(expr);
    });
    instance.on('expressionchange', (expression) => {
      if (instance !== widget.l2d) return;
      debugLive2D('expressionchange', {
        model: models[currentModel]?.name,
        expression,
      });
    });
    instance.on('tap', (areaName) => {
      if (instance !== widget.l2d) return;
      enqueueTap(areaName);
    });
  }

  async function init() {
    const api = window.L2D_WIDGET;
    if (!api?.createWidget) {
      console.warn('[blog-live2d] l2d-widget was not loaded.');
      return;
    }

    installFetchGuard();
    addStyle();
    currentSource = await loadSource(currentModel);

    widget = api.createWidget({
      position: config.canvas.position,
      size: { width: config.canvas.width, height: config.canvas.height },
      transitionDuration: 900,
      primaryColor: 'rgba(107,91,122,0.88)',
      model: modelOrder.map((modelIndex) => {
        const model = models[modelIndex];
        return {
          path: `${base}${model.raw}`,
          scale: config.model.scale,
          offset: config.model.offset,
          volume: config.model.volume,
          logLevel: 'warn',
          tips: false,
        };
      }),
      menus: {
        align: 'left',
        extraItems: [
          {
            icon: 'mdi:gesture-tap',
            label: '随机语音',
            onClick() {
              playRandom(['Tap', '1-3', '2-3', '3-3', '4-6', '5-5', '6-5']);
            },
          },
          {
            icon: 'mdi:playlist-music',
            label: '语音列表',
            onClick() {
              openVoiceList();
            },
          },
          {
            icon: 'mdi:tshirt-crew',
            label: '切换时装',
            onClick() {
              openCostumes();
            },
          },
          {
            icon: 'mdi:volume-high',
            label: '语音开关',
            onClick() {
              muted = !muted;
              widget.l2d.setVolume(muted ? 0 : config.model.volume);
              if (muted) stopAudio();
              showSpeech(muted ? '禁言' : '解除禁言', 1800);
            },
          },
        ],
      },
    });

    const widgetSwitchModel = widget.switchModel.bind(widget);
    widget.switchModel = async (widgetIndex) => {
      const modelIndex = modelOrder[widgetIndex] ?? widgetIndex;
      if (switching) return;
      switching = true;
      cancelIdle();
      stopAudio();
      const oldAudio = activeAppModel()?._audioElement;
      if (oldAudio) { oldAudio.pause(); oldAudio.src = ''; }
      currentModel = modelIndex;
      currentSource = await loadSource(currentModel);
      await widgetSwitchModel(modelOrder.indexOf(currentModel));
      bindEvents();
      installWhitePointHider();
      installMouseTracking();
      Object.keys(mouseTrackingValues).forEach((key) => { delete mouseTrackingValues[key]; });
      updateLipSyncIds();
      activeExpression = null;
      switching = false;
      scheduleIdle(2500);
    };

    bindEvents();
    setCanvasPlacement();

    window.blogLive2D = {
      widget,
      models,
      source: () => currentSource,
      switchModel(index) { return widget.switchModel(modelOrder.indexOf(index)); },
      play(group, name) {
        return playEntry(group, findEntry(group, name));
      },
      random() {
        return playRandom(['Tap', '1-3', '2-3', '3-3', '4-6', '5-5', '6-5']);
      },
      voiceList: openVoiceList,
      costumes: openCostumes,
      setPlacement(scale = config.model.scale, x = config.model.offset[0], y = config.model.offset[1]) {
        setModelPlacement({ scale, offset: [x, y] });
      },
      setModelPlacement,
      setCanvasPlacement,
      setTracking,
      config,
      mute() {
        muted = true;
        widget.l2d.setVolume(0);
        stopAudio();
      },
      unmute() {
        muted = false;
        widget.l2d.setVolume(config.model.volume);
      },
    };
  }

  ready(() => {
    if (window.L2D_WIDGET) {
      void init();
      return;
    }
    loadScript(`${assetBase}l2d-widget/index.min.js`).then(init).catch(() => {
      console.warn(`[blog-live2d] failed to load ${assetBase}l2d-widget/index.min.js`);
    });
  });
})();
