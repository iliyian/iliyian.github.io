/* blog-live2d / main — 启动、widget 创建、事件绑定、公开 API */
(() => {
  // pjax 换页可能重复执行本文件；原实现用同一个标记做过防重入。
  if (window.__blogLive2DLoaded) return;
  window.__blogLive2DLoaded = true;

  const B = window.BlogLive2D;
  if (!B) return;

  const { state, config, models, base, assetBase, modelOrder } = B;

  function bindEvents() {
    const instance = state.widget.l2d;
    if (B.boundInstances.has(instance)) return;
    B.boundInstances.add(instance);
    instance.on('loaded', () => {
      if (instance !== state.widget.l2d) return;
      B.installTapDebug();
      B.installKeyTrigger();
      B.installWhitePointHider();
      B.installInternalAudioKiller();
      B.installMouseTracking();
      B.installEyeBlink();
      B.updateLipSyncIds();
      if (state.startGreetingPending) {
        state.startGreetingPending = false;
        B.playStartGreeting();
      } else {
        B.scheduleIdle(3000);
      }
    });
    instance.on('motionstart', (group, index, duration, file) => {
      if (instance !== state.widget.l2d) return;
      const entry = B.findEntryByFile(group, file);
      const expr = B.expressionId(entry?.Expression);
      B.debugLive2D('motionstart', {
        model: models[state.currentModel]?.name,
        group,
        index,
        duration,
        file,
        expression: expr,
        entry: entry?.Name,
      });
      if (expr) B.setExpression(expr);
    });
    instance.on('expressionchange', (expression) => {
      if (instance !== state.widget.l2d) return;
      B.debugLive2D('expressionchange', {
        model: models[state.currentModel]?.name,
        expression,
      });
    });
    instance.on('tap', (areaName) => {
      if (instance !== state.widget.l2d) return;
      B.enqueueTap(areaName);
    });
  }

  async function init() {
    const api = window.L2D_WIDGET;
    if (!api?.createWidget) {
      console.warn('[blog-live2d] l2d-widget was not loaded.');
      return;
    }

    B.installFetchGuard();
    B.addStyle();
    state.currentSource = await B.loadSource(state.currentModel);

    const widget = api.createWidget({
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
        // 用 items 完全替代内核默认项：去掉「Switch model」（与切换时装重复）
        // 和「About」（指向上游仓库，与本站无关），只保留「休眠」。
        items: [
          {
            icon: 'mdi:bed',
            label: '休眠',
            onClick() {
              widget.sleep();
            },
          },
          {
            icon: 'mdi:gesture-tap',
            label: '随机语音',
            onClick() {
              B.playRandom(['Tap', '1-3', '2-3', '3-3', '4-6', '5-5', '6-5']);
            },
          },
          {
            icon: 'mdi:playlist-music',
            label: '语音列表',
            onClick() {
              B.openVoiceList();
            },
          },
          {
            icon: 'mdi:tshirt-crew',
            label: '切换时装',
            onClick() {
              B.openCostumes();
            },
          },
          {
            icon: 'mdi:volume-high',
            label: '语音开关',
            onClick() {
              state.muted = !state.muted;
              widget.l2d.setVolume(state.muted ? 0 : config.model.volume);
              if (state.muted) B.stopAudio();
              B.showSpeech(state.muted ? '禁言' : '解除禁言', 1800);
            },
          },
          {
            icon: 'mdi:chat-outline',
            label: '聊天',
            onClick() {
              B.cancelIdle();
              B.showChatCapsule();
            },
          },
        ],
      },
    });
    state.widget = widget;

    const widgetSwitchModel = widget.switchModel.bind(widget);
    widget.switchModel = async (widgetIndex) => {
      const modelIndex = modelOrder[widgetIndex] ?? widgetIndex;
      if (state.switching) return;
      state.switching = true;
      B.cancelIdle();
      B.stopAudio();
      const oldAudio = B.activeAppModel()?._audioElement;
      if (oldAudio) { oldAudio.pause(); oldAudio.src = ''; }
      state.currentModel = modelIndex;
      state.currentSource = await B.loadSource(state.currentModel);
      await widgetSwitchModel(modelOrder.indexOf(state.currentModel));
      bindEvents();
      B.installWhitePointHider();
      B.installInternalAudioKiller();
      B.installMouseTracking();
      B.installEyeBlink();
      // 拖拽事件与 canvas 无关，只需装一次；重复安装会叠加监听器
      B.installLongPressDrag();
      Object.keys(state.mouseTrackingValues).forEach((key) => { delete state.mouseTrackingValues[key]; });
      B.updateLipSyncIds();
      state.activeExpression = undefined;
      state.switching = false;
      B.scheduleIdle(2500);
    };

    bindEvents();
    B.setCanvasPlacement();
    B.installLongPressDrag();
    B.installMobileScrollFade();
    B.patchMenuForTouch();

    window.blogLive2D = {
      widget,
      models,
      source: () => state.currentSource,
      switchModel(index) { return widget.switchModel(modelOrder.indexOf(index)); },
      play(group, name) {
        return B.playEntry(group, B.findEntry(group, name));
      },
      random() {
        return B.playRandom(['Tap', '1-3', '2-3', '3-3', '4-6', '5-5', '6-5']);
      },
      voiceList: B.openVoiceList,
      costumes: B.openCostumes,
      setPlacement(scale = config.model.scale, x = config.model.offset[0], y = config.model.offset[1]) {
        B.setModelPlacement({ scale, offset: [x, y] });
      },
      setModelPlacement: B.setModelPlacement,
      setCanvasPlacement: B.setCanvasPlacement,
      setTracking: B.setTracking,
      intimacy: {
        get: B.getIntimacy,
        set: B.setIntimacy,
        add: B.addIntimacy,
        max: B.maxValue,
      },
      config,
      mute() {
        state.muted = true;
        widget.l2d.setVolume(0);
        B.stopAudio();
      },
      unmute() {
        state.muted = false;
        widget.l2d.setVolume(config.model.volume);
      },
    };
  }

  B.init = init;

  // 手机端直接跳过，避免下载 l2d-widget 和模型资源。
  if (B.isMobile() && config.mobile.enable !== true) return;

  B.applyMobileConfig();

  B.onEverythingLoaded(() => {
    if (window.L2D_WIDGET) {
      void init();
      return;
    }
    B.loadScript(`${assetBase}l2d-widget/index.min.js`).then(init).catch(() => {
      console.warn(`[blog-live2d] failed to load ${assetBase}l2d-widget/index.min.js`);
    });
  });
})();
