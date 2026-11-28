/* 无障碍补强：导航键盘可达、可访问名称、标题语义、跳转链接、装饰图标 */
(() => {
  if (window.__yyA11yLoaded) return;
  window.__yyA11yLoaded = true;

  const isEnglish = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const text = (zh, en) => (isEnglish() ? en : zh);

  function addSkipLink() {
    if (document.querySelector('.yy-skip-link')) return;
    const link = document.createElement('a');
    link.className = 'yy-skip-link';
    link.href = '#content-inner';
    link.textContent = text('跳到主要内容', 'Skip to content');
    document.body.insertBefore(link, document.body.firstChild);
  }

  function makeKeyboardButton(el, labelZh, labelEn) {
    if (!el) return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', text(labelZh, labelEn));
    if (el.dataset.yyKey) return;
    el.dataset.yyKey = '1';
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        // 搜索的点击监听在内部 .search 上，键盘激活时点它
        const inner = el.id === 'search-button' ? el.querySelector('.search') : null;
        if (inner) inner.click();
        else el.click();
      }
    });
  }

  function syncAriaExpanded() {
    const toggle = document.getElementById('toggle-menu');
    const menus = document.getElementById('sidebar-menus');
    if (!toggle || !menus) return;
    const sync = () => toggle.setAttribute('aria-expanded', menus.classList.contains('open') ? 'true' : 'false');
    sync();
    if (!menus.dataset.yyA11y) {
      menus.dataset.yyA11y = '1';
      new MutationObserver(sync).observe(menus, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function enhanceSearch() {
    const search = document.getElementById('search-button');
    makeKeyboardButton(search, '搜索', 'Search');
    if (search) {
      if (!search.hasAttribute('aria-haspopup')) search.setAttribute('aria-haspopup', 'dialog');
      if (!search.hasAttribute('aria-controls')) search.setAttribute('aria-controls', 'local-search');
    }

    document.querySelectorAll('.search-dialog').forEach((dialog) => {
      if (!dialog.getAttribute('role')) dialog.setAttribute('role', 'dialog');
      if (!dialog.getAttribute('aria-label')) dialog.setAttribute('aria-label', text('搜索', 'Search'));
      if (!dialog.getAttribute('aria-modal')) dialog.setAttribute('aria-modal', 'true');
    });

    const close = document.querySelector('.search-close-button');
    if (close) {
      if (!close.getAttribute('aria-label')) close.setAttribute('aria-label', text('关闭搜索', 'Close search'));
      if (!close.dataset.yyFocusReturn) {
        close.dataset.yyFocusReturn = '1';
        close.addEventListener('click', () => setTimeout(focusSearchButton, 600));
      }
    }

    document.querySelectorAll('#local-search input, #algolia-search-input input').forEach((input) => {
      if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', text('搜索文章', 'Search posts'));
    });
  }

  function enhanceToggle() {
    const toggle = document.getElementById('toggle-menu');
    makeKeyboardButton(toggle, '打开菜单', 'Open menu');
    if (toggle && !toggle.hasAttribute('aria-controls')) toggle.setAttribute('aria-controls', 'sidebar-menus');
    syncAriaExpanded();
  }

  function enhanceNames() {
    document.querySelectorAll('a[title], button[title]').forEach((el) => {
      if (el.hasAttribute('aria-label')) return;
      const title = el.getAttribute('title');
      if (!title) return;
      const iconContext = el.matches('.social-icon, #rightside a, #rightside button, .post-edit-link') || !el.textContent.trim();
      if (iconContext) el.setAttribute('aria-label', title);
    });

    const translate = document.getElementById('translateLink');
    if (translate && translate.getAttribute('title') && !translate.getAttribute('aria-label')) {
      translate.setAttribute('aria-label', translate.getAttribute('title'));
    }

    document.querySelectorAll('#pagination a.extend').forEach((a) => {
      if (a.getAttribute('aria-label')) return;
      const rel = a.getAttribute('rel');
      a.setAttribute('aria-label', rel === 'next'
        ? text('下一页', 'Next page')
        : rel === 'prev'
          ? text('上一页', 'Previous page')
          : text('翻页', 'Go to page'));
    });
  }

  function enhanceShareLabels() {
    const namesZh = { facebook: 'Facebook', twitter: 'X', wechat: '微信', weibo: '微博', qq: 'QQ' };
    const namesEn = { facebook: 'Facebook', twitter: 'X', wechat: 'WeChat', weibo: 'Weibo', qq: 'QQ' };
    document.querySelectorAll('.social-share a[class*="icon-"]').forEach((a) => {
      if (a.getAttribute('aria-label')) return;
      const match = a.className.match(/\bicon-([a-z0-9_-]+)\b/i);
      const key = match ? match[1].toLowerCase() : '';
      const label = key === 'copy'
        ? text('复制链接', 'Copy link')
        : text(`分享到 ${namesZh[key] || key || '社交平台'}`, `Share on ${namesEn[key] || key || 'social media'}`);
      a.setAttribute('aria-label', label);
    });
  }

  function observeShare() {
    document.querySelectorAll('.social-share').forEach((wrap) => {
      if (wrap.dataset.yyA11yObserved) return;
      wrap.dataset.yyA11yObserved = '1';
      const run = () => enhanceShareLabels();
      run();
      new MutationObserver(run).observe(wrap, { childList: true, subtree: true });
    });
  }

  function enhanceCardTitles() {
    document.querySelectorAll('.recent-post-item .article-title').forEach((el) => {
      if (!el.getAttribute('role')) el.setAttribute('role', 'heading');
      if (!el.getAttribute('aria-level')) el.setAttribute('aria-level', '2');
    });
  }

  function hideDecorativeIcons() {
    document.querySelectorAll('i.fas, i.far, i.fab, i.fa, i.iconfont').forEach((icon) => {
      if (!icon.hasAttribute('aria-hidden')) icon.setAttribute('aria-hidden', 'true');
    });
  }

  function focusSearchButton() {
    document.getElementById('search-button')?.focus();
  }

  function visibleSearchDialog() {
    const dialog = document.querySelector('.search-dialog');
    return dialog && getComputedStyle(dialog).display !== 'none' ? dialog : null;
  }

  document.addEventListener('keydown', (e) => {
    const dialog = visibleSearchDialog();
    if (!dialog) return;

    if (e.key === 'Escape') {
      setTimeout(focusSearchButton, 600);
      return;
    }

    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
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

  function enhanceReactions() {
    document.querySelectorAll('.wl-reaction-item').forEach((item) => {
      if (item.dataset.yyReaction) return;
      item.dataset.yyReaction = '1';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');

      const label = item.querySelector('.wl-reaction-text')?.textContent?.trim() || '';
      const votes = item.querySelector('.wl-reaction-votes');
      if (votes) votes.setAttribute('aria-hidden', 'true');

      const sync = () => {
        item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
        if (!label) {
          item.removeAttribute('aria-label');
          return;
        }
        const count = parseInt(votes?.textContent || '0', 10) || 0;
        item.setAttribute('aria-label', count > 0
          ? text(`${label}，${count} 人`, `${label}, ${count} reaction${count === 1 ? '' : 's'}`)
          : label);
      };
      sync();
      new MutationObserver(sync).observe(item, { attributes: true, attributeFilter: ['class'] });
      if (votes) {
        new MutationObserver(sync).observe(votes, { childList: true, characterData: true, subtree: true });
      }

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          item.click();
        }
      });
    });
  }

  function observeReactions() {
    const wrap = document.getElementById('waline-wrap');
    if (!wrap) return;
    enhanceReactions();
    if (wrap.dataset.yyReactionObserved) return;
    wrap.dataset.yyReactionObserved = '1';
    new MutationObserver(enhanceReactions).observe(wrap, { childList: true, subtree: true });
  }

  function apply() {
    addSkipLink();
    enhanceSearch();
    enhanceToggle();
    enhanceNames();
    enhanceShareLabels();
    observeShare();
    enhanceCardTitles();
    hideDecorativeIcons();
    observeReactions();
  }

  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('pjax:complete', apply);
  if (document.readyState !== 'loading') apply();
})();
