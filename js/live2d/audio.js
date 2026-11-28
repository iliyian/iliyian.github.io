/* blog-live2d / audio — 对话气泡、打字机、口型同步、语音播放 */
(() => {
  const B = window.BlogLive2D;
  if (!B) return;

  const { state, config, base } = B;

  // 复用一个 AudioContext。每次 new AudioContext() 都有数量上限（约 6 个），
  // 而 createMediaElementSource 会把音频从默认输出改道到这张图里，
  // ctx 处于 suspended 时声音会直接消失，所以只在播放时惰性创建并 resume。
  let audioCtx;
  let lipSyncNode;

  function ensureAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function ensureSpeech() {
    if (state.speech) return state.speech;
    state.speech = document.createElement('div');
    state.speech.id = 'blog-live2d-speech';
    document.body.appendChild(state.speech);
    return state.speech;
  }

  function hideSpeech() {
    clearTimeout(state.typingTimer);
    state.typingTimer = undefined;
    state.speech?.classList.remove('blog-live2d-visible');
  }

  function updateLipSyncIds() {
    const params = state.widget?.l2d?.getParams?.() ?? [];
    const ids = new Set(params.map((param) => param.id));
    state.lipSyncIds = config.model.lipSyncIds.filter((id) => ids.has(id));
    B.debugLive2D('lipsync params', { model: B.models[state.currentModel]?.name, lipSyncIds: state.lipSyncIds });
  }

  // 鼠标追踪、呼吸、口型三者的合成结果。setParams 会以 weight=1 全量覆盖参数，
  // 所以必须在写入前把要叠加的分量算好，而不是各写各的。
  function applyForcedParams() {
    const merged = { ...state.mouseTrackingValues };
    for (const [id, value] of Object.entries(state.breathValues ?? {})) {
      merged[id] = (merged[id] ?? 0) + value;
    }
    Object.assign(merged, state.lipSyncValues);
    // 眨眼是绝对值，最后覆盖（表情不驱动眼睛参数，不会冲突）
    Object.assign(merged, state.eyeBlinkValues ?? {});
    state.widget?.l2d?.setParams?.(merged);
  }

  function pulseMouth() {
    if (!state.lipSyncIds.length) return;
    for (const id of state.lipSyncIds) {
      state.lipSyncValues[id] = config.model.lipSyncMin + Math.random() * (config.model.lipSyncMax - config.model.lipSyncMin);
    }
    applyForcedParams();
    setTimeout(() => {
      for (const id of state.lipSyncIds) delete state.lipSyncValues[id];
      applyForcedParams();
    }, config.model.typingSpeed / 2);
  }

  function showSpeech(text, duration = 5000, sound, typingSpeed) {
    if (!text) return;
    const el = ensureSpeech();
    clearTimeout(state.hideTimer);
    clearTimeout(state.typingTimer);
    el.innerHTML = '';
    el.classList.add('blog-live2d-visible');

    const raw = B.formatText(text).replaceAll('{$br}', '\n');
    const charCount = [...raw].filter((c) => c !== '\n').length || 1;
    const effectiveDuration = (sound?.duration && Number.isFinite(sound.duration) && sound.duration > 0)
      ? sound.duration * 1000
      : (duration || 5000);
    const autoSpeed = Math.max(30, Math.min(config.model.typingSpeed, effectiveDuration / charCount));
    const speed = typingSpeed ?? autoSpeed;
    let i = 0;
    const tick = () => {
      if (i >= raw.length) {
        state.typingTimer = 0;
        if (!sound && duration > 0) state.hideTimer = setTimeout(hideSpeech, duration);
        return;
      }
      const ch = raw[i];
      if (ch === '\n') {
        el.appendChild(document.createElement('br'));
      } else {
        // 用文本节点追加，天然免疫 HTML 注入，不需要逐字符转义
        el.appendChild(document.createTextNode(ch));
      }
      if (ch !== '\n' && !sound) pulseMouth();
      i++;
      state.typingTimer = setTimeout(tick, speed);
    };
    tick();

    if (!sound) return;

    const syncDuration = () => {
      if (!Number.isFinite(sound.duration)) return;
      clearTimeout(state.hideTimer);
      state.hideTimer = setTimeout(hideSpeech, sound.duration * 1000 + 300);
    };

    sound.addEventListener('loadedmetadata', syncDuration, { once: true });
    sound.addEventListener('ended', () => {
      if (state.audio !== sound) return;
      clearTimeout(state.hideTimer);
      if (state.typingTimer) {
        clearTimeout(state.typingTimer);
        state.typingTimer = 0;
        const fragment = document.createDocumentFragment();
        for (let j = i; j < raw.length; j++) {
          const ch = raw[j];
          if (ch === '\n') fragment.appendChild(document.createElement('br'));
          else fragment.appendChild(document.createTextNode(ch));
        }
        el.appendChild(fragment);
      }
      state.hideTimer = setTimeout(hideSpeech, 600);
    }, { once: true });
    if (sound.readyState >= 1) syncDuration();
  }

  function stopLipSync() {
    if (state.lipSyncAnimation) cancelAnimationFrame(state.lipSyncAnimation);
    state.lipSyncAnimation = undefined;
    state.lipSyncSource = undefined;
    if (lipSyncNode) {
      try { lipSyncNode.disconnect(); } catch { /* ignore */ }
      lipSyncNode = null;
    }
    for (const id of state.lipSyncIds) delete state.lipSyncValues[id];
    applyForcedParams();
  }

  function installLipSync(sound) {
    if (!sound || !state.lipSyncIds.length) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    let source;
    try {
      source = ctx.createMediaElementSource(sound);
    } catch {
      // 同一 media element 只能创建一次 source；失败时退回正常音频输出
      return;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    lipSyncNode = source;
    state.lipSyncSource = source;
    const data = new Uint8Array(analyser.fftSize);
    let current = 0;
    const tick = () => {
      if (state.lipSyncSource !== source || sound.ended) {
        stopLipSync();
        return;
      }
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) { const c = (v - 128) / 128; sum += c * c; }
      const rms = Math.sqrt(sum / data.length);
      const target = rms > config.model.lipSyncThreshold ? config.model.lipSyncMax : config.model.lipSyncMin;
      current += (target - current) * config.model.lipSyncSmooth;
      for (const id of state.lipSyncIds) state.lipSyncValues[id] = current;
      applyForcedParams();
      state.lipSyncAnimation = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopAudio() {
    stopLipSync();
    if (!state.audio) return;
    state.audio.pause();
    state.audio = undefined;
  }

  function playSound(file) {
    const soundFile = B.resourceFile(file);
    if (!soundFile || state.muted) return null;
    stopAudio();
    updateLipSyncIds();
    const audio = new Audio(soundFile.startsWith('http') ? soundFile : `${base}${soundFile}`);
    audio.crossOrigin = 'anonymous';
    audio.volume = config.model.volume;
    state.audio = audio;
    audio.play().catch(() => {});
    installLipSync(audio);
    return audio;
  }

  Object.assign(B, {
    ensureAudioContext,
    ensureSpeech,
    hideSpeech,
    updateLipSyncIds,
    applyForcedParams,
    pulseMouth,
    showSpeech,
    stopLipSync,
    installLipSync,
    stopAudio,
    playSound,
  });
})();
