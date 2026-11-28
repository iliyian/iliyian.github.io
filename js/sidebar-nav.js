/* 移动端册页导航：关闭按钮、站名、章节标题、当前页标记
 * 只增补结构，开关抽屉仍走主题既有的 #menu-mask 路径
 */
(() => {
  if (window.__yySidebarNavLoaded) return;
  window.__yySidebarNavLoaded = true;

  const isEnglish = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const text = (zh, en) => (isEnglish() ? en : zh);
  const drawer = () => document.getElementById('sidebar-menus');
  let lastFocused = null;

  const closeDrawer = () => {
    const mask = document.getElementById('menu-mask');
    const menus = drawer();
    if (!menus || !menus.classList.contains('open')) return;
    if (mask && getComputedStyle(mask).display !== 'none') {
      // 主题的关闭逻辑（隐藏遮罩、移除 .open、恢复页面滚动）绑定在遮罩点击上
      mask.click();
    } else {
      menus.classList.remove('open');
    }
  };

  const buildHeader = () => {
    const menus = drawer();
    if (!menus || menus.dataset.yySidebarReady) return;
    menus.dataset.yySidebarReady = '1';

    menus.setAttribute('role', 'navigation');
    if (!menus.getAttribute('aria-label')) {
      menus.setAttribute('aria-label', text('站点导航', 'Site navigation'));
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'yy-sidebar-close';
    close.setAttribute('aria-label', text('关闭菜单', 'Close menu'));
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-xmark';
    closeIcon.setAttribute('aria-hidden', 'true');
    close.appendChild(closeIcon);
    close.addEventListener('click', closeDrawer);
    menus.insertBefore(close, menus.firstChild);

    const avatar = menus.querySelector(':scope > .avatar-img');
    const siteNameEl = document.querySelector('#blog-info .site-name');
    const siteName = siteNameEl ? siteNameEl.textContent.trim() : document.title;
    if (avatar && siteName) {
      const name = document.createElement('div');
      name.className = 'yy-sidebar-site-name';
      name.textContent = siteName;
      avatar.insertAdjacentElement('afterend', name);

      const rule = document.createElement('div');
      rule.className = 'yy-sidebar-rule';
      rule.setAttribute('aria-hidden', 'true');
      name.insertAdjacentElement('afterend', rule);
    }

    const list = menus.querySelector('.menus_items');
    if (list) {
      const label = document.createElement('div');
      label.className = 'yy-sidebar-label';
      label.textContent = text('目 录', 'CONTENTS');
      list.insertAdjacentElement('beforebegin', label);
    }
  };

  // 去掉末尾 index.html 与多余斜杠，统一成以 / 结尾
  const normalize = (path) => {
    const trimmed = path.replace(/\/index\.html$/, '/');
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  };

  const markCurrent = () => {
    const menus = drawer();
    if (!menus) return;
    let here;
    try {
      here = normalize(decodeURIComponent(location.pathname));
    } catch (e) {
      return;
    }
    menus.querySelectorAll('.menus_items a.site-page').forEach((link) => {
      let path;
      try {
        path = normalize(decodeURIComponent(new URL(link.href, location.origin).pathname));
      } catch (e) {
        return;
      }
      const current = path === here;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const bindNavigation = () => {
    const menus = drawer();
    if (!menus || menus.dataset.yySidebarNavBound) return;
    menus.dataset.yySidebarNavBound = '1';

    // 点击任一菜单进入页面后收起抽屉（pjax 只替换 #body-wrap，抽屉不会自己关）
    menus.addEventListener('click', (e) => {
      if (e.target.closest('.menus_items a.site-page')) closeDrawer();
    });
  };

  const focusableInDrawer = (menus) => [...menus.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');

  // 收起后把焦点交还触发者；触屏上点汉堡不会留下焦点，退回汉堡按钮本身
  const restoreFocus = () => {
    const target = lastFocused && lastFocused !== document.body
      ? lastFocused
      : document.getElementById('toggle-menu');
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  };

  const watchOpenState = () => {
    const menus = drawer();
    if (!menus || menus.dataset.yySidebarWatch) return;
    menus.dataset.yySidebarWatch = '1';

    let wasOpen = menus.classList.contains('open');
    new MutationObserver(() => {
      const open = menus.classList.contains('open');
      if (open === wasOpen) return;
      wasOpen = open;
      if (open) {
        lastFocused = document.activeElement;
        menus.querySelector('.yy-sidebar-close')?.focus({ preventScroll: true });
      } else {
        restoreFocus();
      }
    }).observe(menus, { attributes: true, attributeFilter: ['class'] });
  };

  // 抽屉是覆盖层：Tab 不应走到被遮住的主内容上
  document.addEventListener('keydown', (e) => {
    const menus = drawer();
    if (e.key !== 'Tab' || !menus?.classList.contains('open')) return;
    const items = focusableInDrawer(menus);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (drawer()?.classList.contains('open')) closeDrawer();
  });

  const apply = () => {
    buildHeader();
    bindNavigation();
    markCurrent();
    watchOpenState();
  };

  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('pjax:complete', apply);
  if (document.readyState !== 'loading') apply();
})();
