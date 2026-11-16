/* 加密文章：封缄卡增强
 * 插件（hexo-blog-encrypt）的 DOM 结构固定为
 *   .hbe-container > form#hbeForm > (.hbe-input > input#hbePass + label) + button + .hbe-error
 * 这里只做渐进增强，不碰解密逻辑：
 *   - 在卡片顶部插入「此页已封缄」小标题
 *   - 给密码框补 autocomplete / enterkeyhint，方便密码管理器与移动端回车
 *   - 增加密码显隐按钮（aria-pressed 同步）
 *   - 把错误区与输入框用 aria-describedby 关联，出错时标 aria-invalid
 * 幂等，支持 pjax 切页重复执行。
 */
(() => {
  'use strict';

  const isEnglish = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const text = (zh, en) => (isEnglish() ? en : zh);

  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.4 12S5.9 5.8 12 5.8 21.6 12 21.6 12 18.1 18.2 12 18.2 2.4 12 2.4 12Z"/><circle cx="12" cy="12" r="3.1"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.4 12S5.9 5.8 12 5.8c1.6 0 3 .4 4.3 1.1"/><path d="M21.6 12s-3.5 6.2-9.6 6.2c-1.5 0-2.9-.4-4.1-1"/><path d="M9.9 9.9a3.1 3.1 0 0 0 4.2 4.2"/><path d="M3.5 3.5l17 17"/></svg>';

  function addEyebrow(content) {
    if (content.querySelector('.hbe-eyebrow')) return;
    const eyebrow = document.createElement('p');
    eyebrow.className = 'hbe-eyebrow';
    eyebrow.textContent = text('此页已封缄', 'SEALED PAGE');
    content.insertBefore(eyebrow, content.firstChild);
  }

  /* 插件把 posts 的 message（一句提问）塞进 <label>，读屏会把提示语念成字段名。
     这里拆成「提示语 + 视觉隐藏的真标签」，提示语同时作为字段说明。 */
  function splitLabel(input) {
    const oldLabel = input.parentNode.querySelector('.hbe-input-label');
    if (!oldLabel || oldLabel.dataset.yySplit) return;
    oldLabel.dataset.yySplit = '1';

    const prompt = oldLabel.textContent.trim();
    oldLabel.remove();

    if (prompt) {
      const hint = document.createElement('p');
      hint.className = 'hbe-hint';
      hint.id = 'hbe-hint';
      hint.textContent = prompt;
      input.parentNode.insertBefore(hint, input);
      const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (describedBy.indexOf(hint.id) === -1) {
        describedBy.push(hint.id);
        input.setAttribute('aria-describedby', describedBy.join(' '));
      }
    }

    const label = document.createElement('label');
    label.className = 'hbe-sr-label';
    label.htmlFor = 'hbePass';
    label.textContent = text('封缄密码', 'Password');
    input.parentNode.insertBefore(label, input);
  }

  function addEyeToggle(input) {
    if (input.dataset.yyEye || !input.parentNode) return;
    input.dataset.yyEye = '1';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hbe-eye';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', text('显示密码', 'Show password'));
    btn.innerHTML = EYE;

    btn.addEventListener('click', () => {
      const revealed = input.getAttribute('type') === 'text';
      input.setAttribute('type', revealed ? 'password' : 'text');
      btn.setAttribute('aria-pressed', String(!revealed));
      btn.setAttribute('aria-label', revealed ? text('显示密码', 'Show password') : text('隐藏密码', 'Hide password'));
      btn.innerHTML = revealed ? EYE : EYE_OFF;
      // 切换 type 会让光标丢失，重新聚焦并落到末尾
      const end = input.value.length;
      input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(end, end);
      } catch (_e) { /* 部分浏览器对 password 类型不支持，忽略 */ }
    });

    input.parentNode.insertBefore(btn, input.nextSibling);
  }

  function linkError(form, input) {
    const error = form.querySelector('.hbe-error');
    if (!error) return;
    if (!error.id) error.id = 'hbe-error';

    const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (describedBy.indexOf(error.id) === -1) {
      describedBy.push(error.id);
      input.setAttribute('aria-describedby', describedBy.join(' '));
    }

    if (error.dataset.yyLinked) return;
    error.dataset.yyLinked = '1';

    let hadError = !!error.textContent.trim();
    const sync = () => {
      const hasError = !!error.textContent.trim();
      input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
      // 单字段表单：报错后把焦点送回输入框，键盘用户可直接改密码重试
      if (hasError && !hadError && document.activeElement !== input) {
        input.focus({ preventScroll: true });
      }
      hadError = hasError;
    };
    sync();
    new MutationObserver(sync).observe(error, { childList: true, characterData: true, subtree: true });
  }

  /* WebCrypto 只在安全上下文（HTTPS 或 localhost）可用。用局域网 IP / http 域名
     打开时 crypto.subtle 不存在，插件解密会抛错并统一显示「密码不对」，很容易
     被误判成密码错了。这里提前识别并给出可操作的提示。 */
  function warnInsecureContext(container, input, form) {
    const available = !!(window.crypto && window.crypto.subtle);
    if (available || container.dataset.yyInsecure) return;
    container.dataset.yyInsecure = '1';

    input.disabled = true;
    input.setAttribute('aria-describedby', 'hbe-insecure');
    form.querySelectorAll('button').forEach((b) => { b.disabled = true; });

    const note = document.createElement('p');
    note.className = 'hbe-insecure';
    note.id = 'hbe-insecure';
    note.setAttribute('role', 'status');
    note.textContent = text(
      '当前页面不是安全上下文（需 HTTPS 或 localhost），浏览器禁用了 WebCrypto，无法解密。请改用 https 或本机地址访问。',
      'This page is not a secure context (HTTPS or localhost required), so the browser has disabled WebCrypto and decryption cannot work. Open it over https or from localhost.'
    );
    form.appendChild(note);
  }

  function enhance() {
    document.querySelectorAll('.hbe-container').forEach((container) => {
      const content = container.querySelector('.hbe-content');
      const form = container.querySelector('#hbeForm');
      const input = container.querySelector('#hbePass');
      if (!content || !form || !input) return;

      addEyebrow(content);
      splitLabel(input);

      if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'current-password');
      if (!input.hasAttribute('enterkeyhint')) input.setAttribute('enterkeyhint', 'go');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');

      addEyeToggle(input);
      linkError(form, input);
      warnInsecureContext(container, input, form);
    });
  }

  enhance();
  document.addEventListener('pjax:complete', enhance);
  // 解密成功后正文被替换，重新绑定无副作用；这里只在容器仍存在时补一次
  window.addEventListener('hexo-blog-decrypt', enhance);
})();
