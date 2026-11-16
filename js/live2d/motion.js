/* blog-live2d / motion — model3.json 加载、剧情脚本解释器、点击分发 */
(() => {
  const B = window.BlogLive2D;
  if (!B) return;

  const { state, config, models, base } = B;

  async function loadSource(index) {
    if (B.sourceCache.has(index)) return B.sourceCache.get(index);
    const response = await fetch(`${base}${models[index].raw}`);
    const source = await response.json();
    B.sourceCache.set(index, source);
    return source;
  }

  function motions() {
    return state.currentSource?.FileReferences?.Motions ?? {};
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

  function passesTimeLimit(entry) {
    const tl = entry.TimeLimit;
    if (!tl) return true;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = tl.Hour * 60;
    return minutes >= start && minutes < start + (tl.Sustain || 0);
  }

  function randomEntry(groups) {
    const candidates = groups.flatMap((group) => {
      const colon = group.indexOf(':');
      if (colon >= 0) {
        const entry = findEntry(group.slice(0, colon), group.slice(colon + 1));
        return entry && passesTimeLimit(entry) && B.passesIntimacy(entry)
          ? [{ group: group.slice(0, colon), entry }]
          : [];
      }
      return entries(group)
        .filter((entry) => (resourceFile(entry.File) || resourceFile(entry.Sound) || entry.Text || entry.Choices)
          && passesTimeLimit(entry)
          && B.passesIntimacy(entry))
        .map((entry) => ({ group, entry }));
    });
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

  function setExpression(expr) {
    if (!expr || state.activeExpression === expr) return;
    state.activeExpression = expr;
    state.widget.l2d.setExpression(expr);
  }

  function clearExpression() {
    if (!state.widget?.l2d?.getExpressions?.().includes('e_idle.exp3')) return;
    setExpression('e_idle.exp3');
  }

  function scheduleClearExpression(duration) {
    clearTimeout(state.expressionClearTimer);
    const token = ++state.expressionClearToken;
    state.expressionClearTimer = setTimeout(() => {
      if (token !== state.expressionClearToken) return;
      clearExpression();
    }, duration);
  }

  function scheduleIdle(delay = config.model.idleDelay) {
    clearTimeout(state.idleTimer);
    if (!state.tick10Enabled) return;
    state.idleTimer = setTimeout(() => {
      playRandom(['Tick10']);
    }, delay);
  }

  function cancelIdle() {
    clearTimeout(state.idleTimer);
  }

  function applyCommand(command) {
    if (!command) return false;
    if (B.commandIncludes(command, 'mute_sound')) {
      state.muted = true;
      state.widget.l2d.setVolume(0);
      B.stopAudio();
      return true;
    }
    if (B.commandIncludes(command, 'unmute_sound')) {
      state.muted = false;
      state.widget.l2d.setVolume(config.model.volume);
      return true;
    }
    if (B.commandIncludes(command, 'motions enable Tick10')) {
      state.tick10Enabled = true;
      scheduleIdle();
      return true;
    }
    if (B.commandIncludes(command, 'motions disable Tick10')) {
      state.tick10Enabled = false;
      cancelIdle();
      return true;
    }
    if (B.commandIncludes(command, 'start_mtn Tick10')) {
      playRandom(['Tick10']);
      return true;
    }
    const match = command.match(/change_(?:cos|model)\s+([a-f0-9]+)\.bin3/i);
    if (match) {
      const index = models.findIndex((model) => model.command === match[1]);
      if (index >= 0) void state.widget.switchModel(B.modelOrder.indexOf(index));
      return true;
    }
    return false;
  }

  function openChoices(title, choices) {
    B.openPanel(B.formatText(title), choices.map((choice) => ({
      text: B.formatText(choice.Text),
      onClick() {
        const next = choice.NextMtn;
        if (next) {
          const [group, name] = next.split(':');
          const target = findEntry(group, name);
          if (target?.Choices) {
            openChoices(target.Text || target.Name || choice.Text, target.Choices);
          } else {
            B.closePanel();
            playEntry(group, target);
          }
        }
      },
    })));
  }

  function playEntry(group, entry) {
    if (!entry || state.switching) return false;
    cancelIdle();
    if (entry.Choices?.length) {
      B.debugLive2D('choices', {
        model: models[state.currentModel]?.name,
        group,
        name: entry.Name,
        text: entry.Text,
        choices: entry.Choices.map((choice) => choice.Text),
      });
      openChoices(entry.Text || entry.Name || group, entry.Choices);
      return true;
    }
    applyCommand(entry.Command);
    // 条目带 Intimacy.Bonus 时，播放即累加好感度（模型里用于「好感度up」）
    if (typeof entry.Intimacy?.Bonus === 'number') B.addIntimacy(entry.Intimacy.Bonus);
    const duration = entry.TextDuration || entry.MotionDuration || 5200;
    if (entry.Interruptable !== true) state.busyUntil = performance.now() + duration;
    const sound = B.playSound(entry.Sound);
    if (entry.Text) B.showSpeech(entry.Text, duration, sound);
    const expr = expressionId(entry.Expression);
    B.debugLive2D('play entry', {
      model: models[state.currentModel]?.name,
      group,
      name: entry.Name,
      file: entry.File,
      expression: expr,
      sound: entry.Sound,
      text: entry.Text,
      priority: entry.Priority ?? 4,
      pointer: state.lastPointerDown,
    });
    if (expr) {
      state.expressionClearToken++;
      clearTimeout(state.expressionClearTimer);
      setExpression(expr);
    }
    const motionFile = resourceFile(entry.File);
    const motionIndex = entryIndex(group, entry);
    if (motionFile && motionIndex >= 0) {
      state.widget.l2d.playMotion(group, motionIndex, entry.Priority ?? 4);
    }
    if (B.commandIncludes(entry.Command, 'clear_exp') || B.commandIncludes(entry.PostCommand, 'clear_exp')) {
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

  function pickTapHit(areaNames) {
    const hits = areaNames
      .map((areaName) => state.currentSource?.HitAreas?.find((area) => area.Name === areaName) ?? { Name: areaName })
      .filter(Boolean);
    return hits.sort((a, b) => (a.Order ?? 999) - (b.Order ?? 999))[0] ?? null;
  }

  function playTap(areaName) {
    if (performance.now() < state.busyUntil) return;
    if (state.chatSending) return;
    const container = state.widget?.l2d?.getCanvas?.()?.parentElement;
    if (container && parseFloat(container.style.opacity) === 0) return;
    const hit = state.currentSource?.HitAreas?.find((area) => area.Name === areaName);
    B.debugLive2D('tap', {
      model: models[state.currentModel]?.name,
      areaName,
      motionGroup: hit?.Motion,
      hit,
      pointer: state.lastPointerDown,
    });
    if (hit?.Motion) {
      playRandom([hit.Motion]);
      return;
    }
    playRandom([areaName, 'Tap', '1-3', '2-3', '3-3', '1']);
  }

  function enqueueTap(areaName) {
    state.pendingTapAreas.add(areaName);
    clearTimeout(state.tapBatchTimer);
    state.tapBatchTimer = setTimeout(() => {
      const hit = pickTapHit([...state.pendingTapAreas]);
      state.pendingTapAreas.clear();
      if (hit?.Name) playTap(hit.Name);
    }, 0);
  }

  Object.assign(B, {
    loadSource,
    motions,
    entries,
    findEntry,
    findEntryByFile,
    entryIndex,
    passesTimeLimit,
    randomEntry,
    expressionId,
    resourceFile,
    setExpression,
    clearExpression,
    scheduleClearExpression,
    scheduleIdle,
    cancelIdle,
    applyCommand,
    openChoices,
    playEntry,
    playRandom,
    openVoiceList,
    playStartGreeting,
    openCostumes,
    pickTapHit,
    playTap,
    enqueueTap,
  });
})();
