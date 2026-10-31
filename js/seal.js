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
