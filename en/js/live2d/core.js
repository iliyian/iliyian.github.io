/* blog-live2d / core — 命名空间、配置、共享状态、通用工具 */
(() => {
  if (window.BlogLive2D) return;

  const assetBase = 'https://r2-imgs.iliyian.com/live2d/';
  // const assetBase = '/live2d/';
  const base = `${assetBase}models/37/`;
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  const defaultWidgetSize = Math.min(520, Math.max(360, Math.floor(viewportHeight * 0.52)));

  // 可在加载本文件前设置 window.blogLive2DConfig 覆盖这些默认值。
  // 示例：window.blogLive2DConfig = { model: { scale: 0.9 }, tracking: { tiltSensitivity: 0.4 } }。
  const config = {
    // 调试日志默认关闭。排查时在控制台执行
    // localStorage.setItem('blog-live2d-debug', '1') 后刷新，
    // 或临时设 window.blogLive2DConfig = { debug: true }。
    // 留 null 表示「跟随 localStorage」；显式 true/false 会覆盖它。
    debug: null,
    mobile: {
      // 手机端默认不加载 Live2D；如需在手机端显示，改为 true。
      enable: false,
      // 移动端检测：portrait 用视口宽高比判断；也可以手动设 true/false。
      detect: 'portrait',
      // detect 为 portrait 时，innerWidth / innerHeight 小于该值就启用移动端配置。
      aspectRatio: 1,
      // 移动端整体缩放倍率；会同时缩放 canvas 尺寸和模型 scale。
      // scale: 0.85,
      scale: 2,
      // 移动端可选覆盖 canvas 位置，例如 { right: -12, bottom: -8 }。
      canvas: {
        width: defaultWidgetSize * 0.62,
        height: defaultWidgetSize * 0.62,
      },
      // 移动端可选覆盖模型位置，例如 { offset: [0.45, -1.05] }。
      model: {
        offset: [0.1, -3.7],
      },
      // 滚动时淡入淡出
      scrollFade: true,
    },
    canvas: {
      // 挂件固定到哪个角；目前 l2d-widget 支持 bottom-left / bottom-right。
      position: 'bottom-right',
      // canvas 的 CSS 宽高，单位 px；模型只会画在这个区域内。
      width: defaultWidgetSize * 0.7,
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
      offset: [0, -2.5],
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
      radiusX: 12,
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
    chat: {
      systemPrompt: `你是一个名叫37的可爱看板娘，性格活泼开朗，喜欢和人聊天。你的回复要简短温暖（1-3句话），像朋友间 的对话一样自然。用中文回复，偶尔可以加入一些可爱的语气词。回复不超过50字。你正在和一个访客在你的个人博客上聊天。
你的回复必须严格遵循以下 JSON 格式：
{"en": "你的英文台词", "zh": "对应的唯美中文翻译"}
不要输出除 JSON 之外的任何多余字符。`,
    },
  };

  const models = [
    {
      name: '原皮',
      raw: '90d8644e2a1bbecca3c845c41937b1dd.webp.model3.json',
      command: '90d8644e2a1bbecca3c845c41937b1dd',
    },
    {
      name: '一位质数',
      raw: '1efa04e576aa5447703fe8053127c4c8.webp.model3.json',
      command: '1efa04e576aa5447703fe8053127c4c8',
    },
    {
      name: '快乐的捕鸟人',
      raw: 'a30907361155f9736acdb00055ebc043.webp.model3.json',
      command: 'a30907361155f9736acdb00055ebc043',
    },
    {
      name: '泉眼深处',
      raw: '68ebbe52a1db89b500a70221ab49c47d.webp.model3.json',
      command: '68ebbe52a1db89b500a70221ab49c47d',
    },
    {
      name: '完美的流体',
      raw: '662961567ba67e016ed9633ff2991193.webp.model3.json',
      command: '662961567ba67e016ed9633ff2991193',
    },
  ];

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // 模型里的 Command 形如 "mute_sound 0" / "motions enable Tick10"，
  // 允许尾部带参数，但前缀必须是完整 token，避免 unmute_sound 命中 mute_sound。
  function commandIncludes(command, name) {
    return String(command ?? '')
      .split(';')
      .map((part) => part.trim())
      .some((part) => part === name || part.startsWith(`${name} `));
  }

  function isMobile() {
    if (config.mobile.detect === true || config.mobile.detect === false) return config.mobile.detect;
    // 手机 UA 优先，覆盖横屏手机；桌面触屏不会被误判。
    if (/Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '')) return true;
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

  // 开关来源优先级：window.blogLive2DConfig.debug > localStorage > 默认关闭
  function debugEnabled() {
    if (typeof config.debug === 'boolean') return config.debug;
    try {
      return localStorage.getItem('blog-live2d-debug') === '1';
    } catch {
      return false;
    }
  }

  function debugLive2D(label, details) {
    if (!debugEnabled()) return;
    console.log(`[blog-live2d] ${label}`, { time: performance.now().toFixed(0), ...details });
  }

  function pointerDebug(event) {
    const canvas = state.widget?.l2d?.getCanvas?.();
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

  function onEverythingLoaded(fn) {
    // 等到页面所有资源（图片/样式/脚本等）都加载完成后再启动 Live2D，
    // 避免和首屏内容抢带宽；再用 requestIdleCallback 在浏览器空闲时执行。
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const schedule = window.requestIdleCallback
        ? (cb) => requestIdleCallback(cb, { timeout: 3000 })
        : (cb) => setTimeout(cb, 300);
      schedule(fn);
    };
    if (document.readyState === 'complete') {
      start();
      return;
    }
    window.addEventListener('load', start, { once: true });
    // 兜底：若有资源卡住导致 load 迟迟不触发，最多等 8s 仍启动。
    setTimeout(start, 8000);
  }

  mergeConfig(config, window.blogLive2DConfig || window.BLOG_LIVE2D_CONFIG);

  const initialModel = clamp(Math.trunc(config.model.initialIndex ?? 0), 0, models.length - 1);

  const state = {
    widget: undefined,
    currentModel: initialModel,
    currentSource: undefined,
    muted: true,
    audio: undefined,
    lipSyncSource: undefined,
    lipSyncAnimation: undefined,
    lipSyncIds: [],
    lipSyncValues: {},
    hideTimer: undefined,
    typingTimer: undefined,
    expressionClearTimer: undefined,
    expressionClearToken: 0,
    activeExpression: undefined,
    panel: undefined,
    panelAutoHide: undefined,
    speech: undefined,
    mouseTrackingInstalled: false,
    busyUntil: 0,
    idleTimer: undefined,
    tick10Enabled: true,
    switching: false,
    startGreetingPending: true,
    mouseX: 0,
    mouseY: 0,
    lastPointerDown: undefined,
    tapDebugInstalled: false,
    tapBatchTimer: undefined,
    pendingTapAreas: new Set(),
    mouseTrackingValues: {},
    breathValues: {},
    eyeBlinkValues: {},
    eyeBlinkInstalled: false,
    chatHistory: [],
    chatCapsule: undefined,
    chatSending: false,
    refAudioDataUrl: undefined,
    intimacy: undefined,
  };

  window.BlogLive2D = {
    assetBase,
    base,
    viewportHeight,
    defaultWidgetSize,
    config,
    models,
    modelOrder: [initialModel, ...models.map((_, index) => index).filter((index) => index !== initialModel)],
    state,
    sourceCache: new Map(),
    boundInstances: new WeakSet(),
    mergeConfig,
    clamp,
    commandIncludes,
    isMobile,
    applyMobileConfig,
    debugLive2D,
    debugEnabled,
    pointerDebug,
    loadScript,
    onEverythingLoaded,
  };
})();
