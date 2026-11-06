/* Turnstile 重复渲染修复
 * Waline 每次提交都会对同一个 .wl-captcha-container 调用 turnstile.render()。
 * Turnstile 拒绝在已渲染过的容器里再次渲染，只打印 "already been rendered"
 * 警告并返回旧 widget，新回调不会触发，于是 Waline 等 10 秒后报
 * "Turnstile render timed out"。失败后旧 widget 仍留在容器里，导致之后每次
 * 提交都必然超时，只能刷新页面。
 * 这里在 render 前先移除容器内的旧 widget，让每次提交都拿到新的 token。
 */
(() => {
  'use strict';

  if (window.__yyTurnstileFix) return;
  window.__yyTurnstileFix = true;

  const TURNSTILE_SCRIPT = /challenges\.cloudflare\.com\/turnstile/;
  const widgetIds = new WeakMap();
  let observer = null;

  // 旧 widget 没有记录时，回退读它留下的隐藏 input 的 id
  const findWidgetId = (el) => {
    const input = el.querySelector('input[name="cf-turnstile-response"]');
    const match = input && /^(cf-chl-widget-[\w-]+)_response$/.exec(input.id || '');
    return match ? match[1] : null;
  };

  const patchIfReady = () => {
    const turnstile = window.turnstile;
    if (!turnstile || typeof turnstile.render !== 'function' || turnstile.__yyPatched) return;

    turnstile.__yyPatched = true;
    const render = turnstile.render.bind(turnstile);

    turnstile.render = (container, options) => {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (el) {
        const previous = widgetIds.get(el) || findWidgetId(el);
        if (previous) {
          try {
            turnstile.remove(previous);
          } catch (err) {}
          widgetIds.delete(el);
        }
      }

      const id = render(container, options);
      if (el && id) widgetIds.set(el, id);
      return id;
    };

    // 打上补丁后不再需要对脚本插入做监听
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  // Turnstile 由 Waline 在首次提交时才插入 <script>，等它加载完再打补丁
  observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== 1 || node.tagName !== 'SCRIPT') return;
        if (!TURNSTILE_SCRIPT.test(node.src || '')) return;
        node.addEventListener('load', patchIfReady);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 点击发生在脚本插入之后、load 之前时，上面的 load 监听仍然有效；
  // 但若监听注册得比脚本加载完成还晚，再轮询几次兜底，避免补丁漏掉。
  let tries = 0;
  const poll = () => {
    if (!document.querySelector('.wl-captcha-container')) return;
    patchIfReady();
    if (window.turnstile && window.turnstile.__yyPatched) return;
    if (++tries >= 40) return;
    setTimeout(poll, 250);
  };

  document.addEventListener('click', () => { tries = 0; poll(); }, true);
  document.addEventListener('keydown', () => { tries = 0; poll(); }, true);
  document.addEventListener('submit', () => { tries = 0; poll(); }, true);
  patchIfReady();
})();
