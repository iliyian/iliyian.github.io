/* blog-live2d / intimacy — Controllers.IntimacySystem 与 KeyTrigger
 *
 * 模型侧的规格（webp.model3.json）：
 *   Controllers.IntimacySystem = { MaxValue, BonusActive, Enabled }
 *   Motions[*].Intimacy = { Min, Max } | { Equal } | { Bonus }
 *     Min/Max/Equal 是条目的「选中条件」，只在满足时才会被随机播到；
 *     Bonus 是播放该条目时累加的好感度。
 *   Controllers.KeyTrigger.Items = [{ Input, DownMtn }]
 *     Input 是键码，按下时播放 DownMtn 指定的条目。
 */
(() => {
  const B = window.BlogLive2D;
  if (!B) return;

  const { state } = B;

  const STORAGE_KEY = 'blog-live2d-intimacy';
  let keyTriggerInstalled = false;

  function intimacyController() {
    return state.currentSource?.Controllers?.IntimacySystem ?? null;
  }

  function enabled() {
    return intimacyController()?.Enabled !== false;
  }

  function maxValue() {
    const value = intimacyController()?.MaxValue;
    return typeof value === 'number' ? value : 1000;
  }

  function bonusActive() {
    return intimacyController()?.BonusActive !== 0;
  }

  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return 0;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function getIntimacy() {
    if (typeof state.intimacy !== 'number') state.intimacy = readStored();
    return state.intimacy;
  }

  function setIntimacy(value, { persist = true } = {}) {
    const clamped = B.clamp(Math.round(value), 0, maxValue());
    const changed = clamped !== getIntimacy();
    state.intimacy = clamped;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(clamped));
      } catch { /* ignore */ }
    }
    return changed;
  }

  function addIntimacy(amount) {
    if (!enabled() || !bonusActive() || !Number.isFinite(amount)) return false;
    const before = getIntimacy();
    setIntimacy(before + amount);
    return getIntimacy() !== before;
  }

  // 条目带 Intimacy 条件时，只有当前好感度满足范围才可被选中。
  function passesIntimacy(entry) {
    const rule = entry?.Intimacy;
    if (!rule || !enabled()) return true;
    const value = getIntimacy();
    if (typeof rule.Equal === 'number') return value === rule.Equal;
    const min = typeof rule.Min === 'number' ? rule.Min : -Infinity;
    const max = typeof rule.Max === 'number' ? rule.Max : Infinity;
    return value >= min && value <= max;
  }

  function formatIntimacy(value = getIntimacy()) {
    return value >= maxValue() ? '∞' : String(value);
  }

  function formatText(text) {
    return String(text ?? '').replaceAll('{$intimacy}', formatIntimacy());
  }

  function normalizeKey(item) {
    const input = item?.Input;
    if (typeof input === 'string' && input.length > 0) return input.toUpperCase();
    if (typeof input === 'number') {
      // 上游用的是 keyCode（88 = X）
      return String.fromCharCode(input).toUpperCase();
    }
    return null;
  }

  function eventKey(event) {
    if (event.key && event.key.length === 1) return event.key.toUpperCase();
    return null;
  }

  function installKeyTrigger() {
    if (keyTriggerInstalled) return;
    keyTriggerInstalled = true;

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      // 输入框里打字不应触发模型动作
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }

      const controller = state.currentSource?.Controllers?.KeyTrigger;
      if (controller?.Enabled === false) return;
      const pressed = eventKey(event);
      if (!pressed) return;

      for (const item of controller?.Items ?? []) {
        if (normalizeKey(item) !== pressed) continue;
        const target_ = item.DownMtn;
        if (!target_) continue;
        const [group, name] = target_.split(':');
        const entry = B.findEntry(group, name);
        if (entry) {
          event.preventDefault();
          B.playEntry(group, entry);
        }
        return;
      }
    }, { passive: false });
  }

  Object.assign(B, {
    intimacyController,
    maxValue,
    getIntimacy,
    setIntimacy,
    addIntimacy,
    passesIntimacy,
    formatIntimacy,
    formatText,
    installKeyTrigger,
  });
})();
