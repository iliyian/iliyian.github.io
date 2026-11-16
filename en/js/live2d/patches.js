/* blog-live2d / patches — 鼠标追踪、ArtmeshOpacity 白点、内部音频屏蔽、拖拽、滚动淡出
 *
 * 这些模块补的是 l2d-widget 没有实现的 model3.json 自定义控制器字段
 * （Controllers.*、HitAreas[].Motion、Motions[].Text/Choices/Command），
 * 以及少量对 widget 私有字段的修补。私有字段访问集中在本文件，
 * widget 升级后只需在这里适配。
 */
(() => {
  const B = window.BlogLive2D;
  if (!B) return;

  const { state, config } = B;

  function installTapDebug() {
    if (state.tapDebugInstalled) return;
    state.tapDebugInstalled = true;
    document.addEventListener('pointerdown', (event) => {
      state.lastPointerDown = B.pointerDebug(event);
      // 只在打开调试时才算 hitArea 边界，否则每次点击都要遍历 drawable
      if (!B.debugEnabled()) return;
      B.debugLive2D('pointerdown', {
        model: B.models[state.currentModel]?.name,
        pointer: state.lastPointerDown,
        hitAreas: state.widget?.l2d?.getHitAreaBounds?.() ?? [],
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

  function setCanvasPlacement(next = {}) {
    B.mergeConfig(config.canvas, next);
    const canvas = state.widget?.l2d?.getCanvas?.();
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
    state.widget.l2d.resize();
  }

  function setModelPlacement(next = {}) {
    B.mergeConfig(config.model, next);
    state.widget?.l2d?.setScale?.(config.model.scale);
    state.widget?.l2d?.setPosition?.(config.model.offset[0], config.model.offset[1]);
    state.widget?.l2d?.setVolume?.(state.muted ? 0 : config.model.volume);
  }

  function setTracking(next = {}) {
    B.mergeConfig(config.tracking, next);
    Object.keys(state.mouseTrackingValues).forEach((key) => {
      delete state.mouseTrackingValues[key];
    });
  }

  function mouseTrackingItems() {
    const controller = state.currentSource?.Controllers?.MouseTracking;
    if (controller?.Enabled === false) return [];
    return controller?.Items ?? [];
  }

  // l2d-widget 内置呼吸会给这些参数叠加正弦波（cubism-web 默认值）：
  // 贡献 = weight * (offset + peak * sin(2πt / cycle))
  // 而鼠标追踪用 setParams 写入 _forcedParams，在 update 末尾以 weight=1 全覆盖，
  // 会把呼吸分量抹掉。这里按同样的公式自己算一遍加回去，让两者叠加生效。
  const BREATH_CHANNELS = {
    ParamAngleX: { offset: 0, peak: 15, cycle: 6.5345, weight: 0.5 },
    ParamAngleY: { offset: 0, peak: 8, cycle: 3.5345, weight: 0.5 },
    ParamAngleZ: { offset: 0, peak: 10, cycle: 5.5345, weight: 0.5 },
    ParamBodyAngleX: { offset: 0, peak: 4, cycle: 15.5345, weight: 0.5 },
  };

  // 优先用内核自己的时钟，保证与 ParamBreath 的相位一致；拿不到时退回本地时钟。
  let breathEpoch;
  function breathTime() {
    const time = activeAppModel()?._userTimeSeconds;
    if (typeof time === 'number') return time;
    if (breathEpoch === undefined) breathEpoch = performance.now();
    return (performance.now() - breathEpoch) / 1000;
  }

  function breathValue(id, time) {
    const channel = BREATH_CHANNELS[id];
    if (!channel) return 0;
    const u = time * 2 * Math.PI;
    return channel.weight * (channel.offset + channel.peak * Math.sin(u / channel.cycle));
  }

  // ---- EyeBlink ----
  // l2d-widget 只用标准字段 FileReferences.Groups 取眨眼参数，本模型的眨眼
  // 写在 Controllers.EyeBlink 里，widget 读不到，所以眨眼一直靠 Idle 动作
  // 自带的固定关键帧。这里按控制器的 MinInterval/MaxInterval 自己做随机眨眼，
  // 通过 setParams 写入（在动作更新之后执行，因此会盖掉 Idle 里的旧曲线）。
  const BLINK_CLOSE_MS = 110;
  const BLINK_HOLD_MS = 40;
  const BLINK_OPEN_MS = 170;

  let blinkPhase = 'idle';       // idle | closing | closed | opening
  let blinkNextAt = 0;
  let blinkPhaseStart = 0;

  function eyeBlinkItems() {
    const controller = state.currentSource?.Controllers?.EyeBlink;
    if (controller?.Enabled === false) return [];
    return controller?.Items ?? [];
  }

  function blinkInterval(controller) {
    const min = typeof controller?.MinInterval === 'number' ? controller.MinInterval : 500;
    const max = typeof controller?.MaxInterval === 'number' ? controller.MaxInterval : 6000;
    return min + Math.random() * Math.max(0, max - min);
  }

  function scheduleNextBlink() {
    blinkPhase = 'idle';
    blinkNextAt = performance.now() + blinkInterval(state.currentSource?.Controllers?.EyeBlink);
  }

  // 返回 0（闭眼）~1（睁眼）
  function blinkOpenness(now) {
    switch (blinkPhase) {
      case 'idle':
        if (now >= blinkNextAt) {
          blinkPhase = 'closing';
          blinkPhaseStart = now;
        }
        return 1;
      case 'closing': {
        const t = (now - blinkPhaseStart) / BLINK_CLOSE_MS;
        if (t >= 1) {
          blinkPhase = 'closed';
          blinkPhaseStart = now;
          return 0;
        }
        return 1 - t;
      }
      case 'closed':
        if (now - blinkPhaseStart >= BLINK_HOLD_MS) {
          blinkPhase = 'opening';
          blinkPhaseStart = now;
        }
        return 0;
      case 'opening': {
        const t = (now - blinkPhaseStart) / BLINK_OPEN_MS;
        if (t >= 1) {
          scheduleNextBlink();
          return 1;
        }
        return t;
      }
      default:
        return 1;
    }
  }

  function installEyeBlink() {
    if (state.eyeBlinkInstalled) {
      // 换模型后重新排期，并让缓存失效
      state.eyeBlinkValues = {};
      scheduleNextBlink();
      return;
    }
    state.eyeBlinkInstalled = true;
    scheduleNextBlink();

    const tick = () => {
      const items = eyeBlinkItems();
      if (items.length) {
        const now = performance.now();
        const openness = blinkOpenness(now);
        const values = {};
        for (const item of items) {
          if (!item.Id) continue;
          const min = typeof item.Min === 'number' ? item.Min : 0;
          const max = typeof item.Max === 'number' ? item.Max : 1;
          values[item.Id] = min + (max - min) * openness;
        }
        state.eyeBlinkValues = values;
        B.applyForcedParams();
      } else if (Object.keys(state.eyeBlinkValues ?? {}).length) {
        state.eyeBlinkValues = {};
        B.applyForcedParams();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function installMouseTracking() {
    if (state.mouseTrackingInstalled) return;
    state.mouseTrackingInstalled = true;

    document.addEventListener('mousemove', (event) => {
      const canvas = state.widget?.l2d?.getCanvas?.();
      const canvasRect = canvas?.getBoundingClientRect?.();
      const faceBounds = state.widget?.l2d?.getHitAreaBounds?.()
        ?.find((area) => area.name === '脸');

      if (canvasRect && faceBounds) {
        const originX = canvasRect.left + (faceBounds.x + faceBounds.w / 2) * canvasRect.width;
        const originY = canvasRect.top + (faceBounds.y + faceBounds.h / 2) * canvasRect.height;
        const radiusX = Math.max(faceBounds.w * canvasRect.width * config.tracking.radiusX, canvasRect.width * config.tracking.minRadiusX);
        const radiusY = Math.max(faceBounds.h * canvasRect.height * config.tracking.radiusY, canvasRect.height * config.tracking.minRadiusY);
        state.mouseX = B.clamp((event.clientX - originX) / radiusX, -1, 1);
        state.mouseY = B.clamp((event.clientY - originY) / radiusY, -1, 1);
        return;
      }

      if (canvasRect) {
        const originX = canvasRect.left + canvasRect.width * 0.58;
        const originY = canvasRect.top + canvasRect.height * 0.28;
        state.mouseX = B.clamp((event.clientX - originX) / (canvasRect.width * 0.45), -1, 1);
        state.mouseY = B.clamp((event.clientY - originY) / (canvasRect.height * 0.45), -1, 1);
        return;
      }

      state.mouseX = B.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
      state.mouseY = B.clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    }, { passive: true });

    const tick = () => {
      const params = {};
      const breath = {};
      const t = breathTime();
      for (const item of mouseTrackingItems()) {
        if (!item.Id) continue;
        const min = typeof item.Min === 'number' ? item.Min : -1;
        const max = typeof item.Max === 'number' ? item.Max : 1;
        const axis = item.Axis ?? 0;
        let input = axis === 1 ? -state.mouseY : state.mouseX;
        if (axis === 2) input = state.mouseX;
        const center = typeof item.DefaultValue === 'number' ? item.DefaultValue : (min + max) / 2;
        const halfRange = (max - min) / 2;
        const sensitivity = item.Id.includes('EyeBall')
          ? config.tracking.eyeSensitivity
          : item.Id.includes('Body')
            ? config.tracking.bodySensitivity
            : axis === 2
              ? config.tracking.tiltSensitivity
              : config.tracking.headSensitivity;
        const target = B.clamp(center + input * halfRange * sensitivity, min, max);
        const current = state.mouseTrackingValues[item.Id] ?? center;
        const smooth = typeof config.tracking.smooth === 'number'
          ? B.clamp(config.tracking.smooth, 0.01, 1)
          : typeof state.currentSource?.Controllers?.MouseTracking?.SmoothTime === 'number'
            ? B.clamp(
              config.tracking.autoSmoothBase / Math.max(state.currentSource.Controllers.MouseTracking.SmoothTime, config.tracking.autoSmoothBase),
              config.tracking.autoSmoothMin,
              config.tracking.autoSmoothMax,
            )
            : config.tracking.autoSmoothMin;
        const next = current + (target - current) * smooth;
        // 追踪分量单独保存用于平滑；呼吸分量每帧重算，避免累积漂移
        state.mouseTrackingValues[item.Id] = next;
        params[item.Id] = next;
        breath[item.Id] = breathValue(item.Id, t);
      }
      if (Object.keys(params).length) {
        state.breathValues = breath;
        B.applyForcedParams();
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function whitePointIds() {
    const items = state.currentSource?.Controllers?.ArtmeshOpacity?.Items ?? [];
    return [...new Set(items
      .filter((item) => item.Name === '白点')
      .flatMap((item) => item.Ids ?? []))];
  }

  function activeAppModel() {
    const delegate = state.widget?.l2d?._state?.l2d6Model?._subdelegates?.[0];
    return delegate?.getLive2DManager?.()?._models?.[0] ?? null;
  }

  function hideWhitePoints(appModel = activeAppModel()) {
    const ids = whitePointIds();
    const model = appModel?._model;
    const coreModel = model?._model;
    const opacities = coreModel?.drawables?.opacities;
    const drawableIds = coreModel?.drawables?.ids;
    if (!ids.length || !model || !opacities || !drawableIds) return false;

    const wanted = new Set(ids);
    let hidden = false;
    const list = Array.from(drawableIds);
    for (let index = 0; index < list.length; index++) {
      if (wanted.has(list[index])) {
        opacities[index] = 0;
        hidden = true;
      }
    }
    return hidden;
  }

  function installInternalAudioKiller() {
    const appModel = activeAppModel();
    if (!appModel || appModel.__internalAudioKilled) return;
    appModel.__internalAudioKilled = true;

    if (appModel._audioElement) {
      appModel._audioElement.pause();
      appModel._audioElement = null;
    }

    Object.defineProperty(appModel, '_audioElement', {
      get() { return null; },
      set(v) {
        if (v) {
          try { v.pause(); } catch { /* ignore */ }
          v.src = '';
          v.load();
        }
      },
      configurable: true,
    });
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

  function installLongPressDrag() {
    // TODO: 移动端 applyMobileConfig 将 canvas 缩小 + model offset 下移导致模型下半身被 canvas 裁掉。
    // 拖拽只能移动 canvas 在屏幕上的位置，无法露出 canvas 内部已裁切的部分。
    // 后续考虑两种方案：① mobile 用负 bottom 代替 canvas 裁剪 ② 拖拽时临时展开 canvas/调整 offset。
    const canvas = state.widget?.l2d?.getCanvas?.();
    const container = canvas?.parentElement;
    if (!container) return;
    if (container.__blogLive2DDragInstalled) return;
    container.__blogLive2DDragInstalled = true;

    let longPressTimer;
    let dragging = false;
    let startX, startY;
    let startRight, startBottom;
    const LONG_PRESS_DURATION = 500;
    const MOVE_THRESHOLD = 5;
    const STORAGE_KEY = 'blog-live2d-position';

    // 只恢复上次保存的横向位置，纵向始终从页面底部开始
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { right } = JSON.parse(saved);
        if (typeof right === 'number') {
          setCanvasPlacement({ right, bottom: 0 });
        }
      }
    } catch { /* ignore */ }

    const onPointerDown = (e) => {
      if (e.target !== canvas) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (state.switching) return;

      startX = e.clientX;
      startY = e.clientY;
      startRight = config.canvas.right;
      startBottom = config.canvas.bottom;

      longPressTimer = setTimeout(() => {
        dragging = true;
        container.style.cursor = 'grabbing';
        container.style.transition = 'none';
        container.style.opacity = '0.85';
        state.busyUntil = performance.now() + 60000;
      }, LONG_PRESS_DURATION);
    };

    const onPointerMove = (e) => {
      if (!dragging) {
        if (longPressTimer && (Math.abs(e.clientX - startX) > MOVE_THRESHOLD || Math.abs(e.clientY - startY) > MOVE_THRESHOLD)) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }

      e.preventDefault();

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newRight = startRight - deltaX;
      let newBottom = startBottom - deltaY;

      newRight = Math.max(-config.canvas.width * 0.7, Math.min(window.innerWidth - config.canvas.width * 0.3, newRight));
      newBottom = Math.max(-config.canvas.height * 0.7, Math.min(window.innerHeight - config.canvas.height * 0.3, newBottom));

      config.canvas.right = newRight;
      config.canvas.bottom = newBottom;

      container.style.right = newRight + 'px';
      container.style.bottom = newBottom + 'px';

      if (state.speech) {
        state.speech.style.right = Math.max(18, newRight + Math.round(config.canvas.width * 0.7)) + 'px';
        state.speech.style.bottom = (newBottom + Math.round(config.canvas.height * 0.68)) + 'px';
      }
    };

    const onPointerUp = () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (dragging) {
        dragging = false;
        container.style.cursor = '';
        container.style.transition = '';
        container.style.opacity = '';
        state.busyUntil = 0;

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            right: config.canvas.right,
            bottom: config.canvas.bottom,
          }));
        } catch { /* ignore */ }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    canvas.style.touchAction = 'none';
  }

  function installMobileScrollFade() {
    if (window.__blogLive2DScrollFadeInstalled) return;
    window.__blogLive2DScrollFadeInstalled = true;

    let lastScrollY = window.scrollY;
    let hidden = false;

    window.addEventListener('scroll', () => {
      if (!B.isMobile() || config.mobile.scrollFade === false) return;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      if (Math.abs(delta) < 4) return;
      lastScrollY = currentY;

      const container = state.widget?.l2d?.getCanvas?.()?.parentElement;
      if (!container) return;

      const canvas = state.widget?.l2d?.getCanvas?.();
      const els = [container, state.speech, state.chatCapsule].filter(Boolean);

      if (delta > 0 && !hidden) {
        hidden = true;
        for (const el of els) {
          el.style.transition = 'opacity 0.28s ease';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
        if (canvas) canvas.style.pointerEvents = 'none';
      } else if (delta < 0 && hidden) {
        hidden = false;
        for (const el of els) {
          el.style.transition = 'opacity 0.28s ease';
          el.style.pointerEvents = '';
          if (el === container || el.classList.contains('blog-live2d-visible')) {
            el.style.opacity = '1';
          }
        }
        if (canvas) canvas.style.pointerEvents = 'auto';
      }
    }, { passive: true });
  }

  function patchMenuForTouch() {
    if (!B.isMobile()) return;
    const canvas = state.widget?.l2d?.getCanvas?.();
    const container = canvas?.parentElement;
    if (!container) return;
    const menuEl = [...container.children].find((el) =>
      el instanceof HTMLElement &&
      el.style.position === 'absolute' &&
      el.style.display === 'flex' &&
      el.style.flexDirection === 'column');
    if (!menuEl) return;

    let hideTimer;
    const show = () => { clearTimeout(hideTimer); menuEl.style.opacity = '1'; menuEl.style.pointerEvents = 'auto'; };
    const hide = () => { hideTimer = setTimeout(() => { menuEl.style.opacity = '0'; menuEl.style.pointerEvents = 'none'; }, 3000); };

    canvas.addEventListener('pointerenter', show);
    canvas.addEventListener('pointerleave', hide);
    menuEl.addEventListener('pointerenter', show);
    menuEl.addEventListener('pointerleave', hide);
  }

  Object.assign(B, {
    installTapDebug,
    installFetchGuard,
    setCanvasPlacement,
    setModelPlacement,
    setTracking,
    mouseTrackingItems,
    installMouseTracking,
    whitePointIds,
    activeAppModel,
    hideWhitePoints,
    installInternalAudioKiller,
    installWhitePointHider,
    installEyeBlink,
    installLongPressDrag,
    installMobileScrollFade,
    patchMenuForTouch,
  });
})();
