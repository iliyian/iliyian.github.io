/* pjax 同文档切换过渡
 * - 用 View Transition 只包裹 pjax 替换 DOM 的那一刻，不包裹网络请求
 * - 前进/后退时在生成新快照前恢复滚动位置，避免换页后才滚动导致一段快速滑动
 */
(() => {
  'use strict';

  // pjax 在 popstate 时会用“离开页面”的滚动位置覆盖目标历史条目的 scrollPos，
  // 因此不能只依赖 history.state.scrollPos，这里按 history entry 的 uid 单独记录。
  const scrollMemory = Object.create(null);
  let activeUid = (window.history.state && window.history.state.uid) || null;
  let navigating = false;
  let saveTimer = null;

  const currentUid = () => (window.history.state && window.history.state.uid) || null;

  const saveCurrentScroll = () => {
    if (activeUid) scrollMemory[activeUid] = [window.scrollX, window.scrollY];
  };

  window.addEventListener('scroll', () => {
    if (navigating || saveTimer) return;
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      if (!navigating) saveCurrentScroll();
    }, 120);
  }, { passive: true });

  document.addEventListener('pjax:send', () => {
    // 此时显示的仍是离开页面，先把它当前的位置记到自己条目上
    if (!navigating) saveCurrentScroll();
    navigating = true;
  });

  // 主题的锚点自动更新会整体覆盖 history.state，把 pjax 存的 uid/scrollPos 丢掉。
  // 这里改成合并状态，并顺带更新 scrollPos。
  const patchAnchor = () => {
    const btf = window.btf;
    if (!btf || typeof btf.updateAnchor !== 'function' || btf.__anchorStatePatched) return;
    btf.__anchorStatePatched = true;

    btf.updateAnchor = function (anchor) {
      if (anchor === window.location.hash) return;
      const hash = anchor || window.location.pathname;
      const title = (window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.title) || document.title;
      const state = window.history.state || {};

      window.history.replaceState({
        ...state,
        url: new URL(hash, window.location.href).href,
        title,
        scrollPos: [window.scrollX, window.scrollY]
      }, title, hash);
    };
  };

  const patch = () => {
    const pjax = window.pjax;
    if (!pjax || pjax.__viewTransitionPatched) return;
    pjax.__viewTransitionPatched = true;

    // 滚动恢复由我们在切换瞬间完成，避免浏览器原生恢复晚于快照
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const originalLoadContent = pjax.loadContent;

    pjax.loadContent = function (html, options) {
      // 主题自带的进场动画会和新过渡叠加，pjax 切页时由过渡接管
      document.documentElement.classList.add('vt-swapping');

      const apply = () => {
        originalLoadContent.call(this, html, options);

        // DOM 交换完成后，当前历史条目已经变为目标条目
        activeUid = currentUid() || activeUid;

        if (options && options.history === false) {
          // 前进/后退：优先用按 uid 记录的位置，回退到 pjax 捕获的 scrollPos
          const remembered = activeUid && scrollMemory[activeUid];
          const pos = remembered || options.scrollPos || [0, 0];
          window.scrollTo(pos[0] || 0, pos[1] || 0);
        }

        // 快照生成、滚动恢复都完成后再恢复滚动记录
        window.setTimeout(() => {
          navigating = false;
          saveCurrentScroll();
        }, 0);
      };

      if (typeof document.startViewTransition !== 'function') {
        apply();
        return;
      }

      try {
        const transition = document.startViewTransition(apply);
        transition.finished.catch(() => {});
        return;
      } catch (err) {
        // 上一次过渡尚未结束等异常情况：退回普通切换
      }
      apply();
    };
  };

  patchAnchor();
  patch();
  document.addEventListener('DOMContentLoaded', () => {
    patchAnchor();
    patch();
  });
  window.addEventListener('load', () => {
    patchAnchor();
    patch();
  }, { once: true });
})();
