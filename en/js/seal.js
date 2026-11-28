/* 朱砂印章系统：导航、置顶标题、文章落款 */
(() => {
  if (window.__yySealLoaded) return;
  window.__yySealLoaded = true;

  const makeSeal = (text, modifier) => {
    const seal = document.createElement('span');
    seal.className = `yy-seal ${modifier}`;
    seal.setAttribute('aria-hidden', 'true');
    seal.innerHTML = [...text].map((char) => `<span>${char}</span>`).join('');
    return seal;
  };

  const apply = () => {
    const isEnglish = (document.documentElement.lang || '').toLowerCase().startsWith('en');

    // 导航栏：单字「易」印
    const siteName = document.querySelector('#blog-info .site-name');
    if (siteName && !siteName.parentElement.querySelector('.yy-seal--nav')) {
      siteName.insertAdjacentElement('afterend', makeSeal('易', 'yy-seal--nav'));
    }

    // 置顶文章：把标题前的橙色图钉原位换成小印
    const pinText = isEnglish ? 'TOP' : '置顶';
    const pinClass = isEnglish ? 'yy-seal--inline yy-seal--inline-en' : 'yy-seal--inline';
    document.querySelectorAll('.recent-post-item .article-title .sticky').forEach((pin) => {
      pin.replaceWith(makeSeal(pinText, pinClass));
    });

    // 文章结尾：手记落款
    const article = document.querySelector('#body-wrap.post #article-container');
    if (article && !article.querySelector('.post-signature')) {
      const signature = document.createElement('div');
      signature.className = 'post-signature';

      const caption = document.createElement('span');
      caption.className = 'yy-signature-caption';
      caption.textContent = isEnglish ? 'Yian · Notes' : '易安 · 手记';

      signature.append(caption, makeSeal('易安', 'yy-seal--signature'));

      const copyright = article.querySelector('.post-copyright');
      if (copyright) copyright.insertAdjacentElement('beforebegin', signature);
      else article.appendChild(signature);
    }
  };

  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('pjax:complete', apply);
  if (document.readyState !== 'loading') apply();
})();

/* 墨隐标记：点击锁定显示 / 再点收回（hover 与键盘聚焦已由 CSS 处理） */
(() => {
  if (window.__yySpoilerLoaded) return;
  window.__yySpoilerLoaded = true;

  const bind = () => {
    document.querySelectorAll('.yy-spoiler').forEach((el) => {
      if (el.dataset.yyBound) return;
      el.dataset.yyBound = '1';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-expanded', 'false');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');

      const toggle = () => {
        const revealed = el.classList.toggle('is-revealed');
        el.setAttribute('aria-expanded', String(revealed));
      };
      // 里面如果有链接，点链接就让它照常跳转，不顺手揭开
      el.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        toggle();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          toggle();
        }
      });
    });
  };

  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('pjax:complete', bind);
  if (document.readyState !== 'loading') bind();
})();
