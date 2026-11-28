/* blog-live2d / ui — 样式、菜单面板、聊天胶囊、聊天与 TTS */
(() => {
  const B = window.BlogLive2D;
  if (!B) return;

  const { state, config, base } = B;

  const CHAT_STORAGE_KEY = 'blog-live2d-chat-history';
  const MAX_CHAT_MESSAGES = 5;

  function addStyle() {
    if (document.getElementById('blog-live2d-style')) return;
    const widgetWidth = config.canvas.width;
    const widgetHeight = config.canvas.height;
    const style = document.createElement('style');
    style.id = 'blog-live2d-style';
    style.textContent = `
      #blog-live2d-speech {
        position: fixed;
        right: ${Math.max(18, config.canvas.right + Math.round(widgetWidth * 0.7))}px;
        bottom: ${config.canvas.bottom + Math.round(widgetHeight * 0.68)}px;
        z-index: 10001;
        max-width: min(320px, calc(100vw - ${widgetWidth + 36}px));
        padding: 10px 14px;
        border-radius: 12px;
        color: rgba(255,255,255,.96);
        background: rgba(107,91,122,.9);
        box-shadow: 0 8px 28px rgba(0,0,0,.22);
        backdrop-filter: blur(10px);
        font-size: 14px;
        line-height: 1.65;
        opacity: 0;
        transform: translateY(8px) scale(.96);
        transform-origin: right bottom;
        pointer-events: none;
        transition: opacity .22s ease, transform .22s ease;
      }
      #blog-live2d-speech.blog-live2d-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      #blog-live2d-panel {
        position: fixed;
        right: 14px;
        bottom: 16px;
        z-index: 10002;
        width: min(280px, calc(100vw - 28px));
        max-height: min(480px, calc(100vh - 32px));
        overflow: auto;
        padding: 12px;
        border-radius: 14px;
        background: rgba(25,23,32,.88);
        color: rgba(255,255,255,.94);
        box-shadow: 0 12px 36px rgba(0,0,0,.28);
        backdrop-filter: blur(14px);
        font-size: 14px;
      }
      #blog-live2d-panel .blog-live2d-panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        font-weight: 600;
      }
      #blog-live2d-panel button {
        width: 100%;
        margin: 4px 0;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px;
        color: rgba(255,255,255,.94);
        background: rgba(255,255,255,.08);
        cursor: pointer;
        text-align: left;
      }
      #blog-live2d-panel button:hover {
        background: rgba(255,255,255,.16);
      }
      #blog-live2d-panel .blog-live2d-close {
        width: auto;
        margin: 0;
        padding: 2px 8px;
        text-align: center;
      }
      #blog-live2d-chat-capsule {
        position: fixed;
        left: 50%;
        bottom: 40px;
        transform: translateX(-50%) translateY(8px) scale(.96);
        z-index: 10003;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 18px;
        background: rgba(147,112,219,.92);
        border-radius: 24px;
        box-shadow: 0 8px 28px rgba(0,0,0,.22);
        backdrop-filter: blur(10px);
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease, transform .22s ease;
      }
      #blog-live2d-chat-capsule.blog-live2d-visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
        pointer-events: auto;
      }
      #blog-live2d-chat-capsule input {
        background: transparent;
        border: none;
        outline: none;
        color: rgba(255,255,255,.96);
        font-size: 14px;
        width: 200px;
        padding: 2px 4px;
      }
      #blog-live2d-chat-capsule input::placeholder {
        color: rgba(255,255,255,.5);
      }
      #blog-live2d-chat-capsule .blog-live2d-chat-send {
        background: rgba(255,255,255,.15);
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        color: rgba(255,255,255,.85);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      #blog-live2d-chat-capsule .blog-live2d-chat-send:hover {
        background: rgba(255,255,255,.25);
      }
    `;
    document.head.appendChild(style);
  }

  function closePanel() {
    clearTimeout(state.panelAutoHide);
    state.panel?.remove();
    state.panel = undefined;
  }

  function openPanel(title, items) {
    closePanel();
    const panel = document.createElement('div');
    panel.id = 'blog-live2d-panel';
    panel.addEventListener('mouseenter', () => clearTimeout(state.panelAutoHide));
    panel.addEventListener('mouseleave', () => { state.panelAutoHide = setTimeout(closePanel, 3000); });
    const header = document.createElement('div');
    header.className = 'blog-live2d-panel-title';
    const label = document.createElement('span');
    label.textContent = title;
    const close = document.createElement('button');
    close.className = 'blog-live2d-close';
    close.textContent = '×';
    close.addEventListener('click', closePanel);
    header.append(label, close);
    panel.appendChild(header);
    items.forEach((item) => {
      const button = document.createElement('button');
      button.textContent = item.text;
      button.addEventListener('click', item.onClick);
      panel.appendChild(button);
    });
    document.body.appendChild(panel);
    state.panel = panel;
    state.panelAutoHide = setTimeout(closePanel, 8000);
  }

  function loadChatHistory() {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function saveChatHistory(history) {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
    } catch { /* ignore */ }
  }

  function ensureChatCapsule() {
    if (state.chatCapsule) return state.chatCapsule;
    const capsule = document.createElement('div');
    capsule.id = 'blog-live2d-chat-capsule';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '和看板娘说点什么...';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'blog-live2d-chat-send';
    sendBtn.innerHTML = '&#10148;';
    sendBtn.title = 'Send';

    capsule.appendChild(input);
    capsule.appendChild(sendBtn);
    document.body.appendChild(capsule);
    state.chatCapsule = capsule;

    const submit = () => {
      const text = input.value.trim();
      if (!text || state.chatSending) return;
      input.value = '';
      hideChatCapsule();
      void sendChatMessage(text);
    };

    sendBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') hideChatCapsule();
    });

    return capsule;
  }

  function showChatCapsule() {
    if (state.chatSending) return;
    const el = ensureChatCapsule();
    el.classList.add('blog-live2d-visible');
    el.querySelector('input').focus();
  }

  function hideChatCapsule() {
    state.chatCapsule?.classList.remove('blog-live2d-visible');
  }

  async function loadRefAudio() {
    if (state.refAudioDataUrl) return state.refAudioDataUrl;
    const resp = await fetch(`${base}b5dc8ab726516a4d512149b47be1d1be.mp3`);
    if (!resp.ok) throw new Error(`Ref audio HTTP ${resp.status}`);
    const blob = await resp.blob();
    state.refAudioDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return state.refAudioDataUrl;
  }

  async function sendChatMessage(text) {
    state.chatSending = true;
    B.stopAudio();
    B.hideSpeech();
    B.showSpeech('思考中...', 0);
    const history = loadChatHistory();
    history.push({ role: 'user', content: text });

    const systemPrompt = config.chat?.systemPrompt || '你是《重返未来：1999》里的 37。回复不超过50字。';
    const recentMessages = history.slice(-MAX_CHAT_MESSAGES);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
    ];

    try {
      // Step 1: text
      const textResponse = await fetch('https://waifu-chat.iliyian.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-flash', messages }),
      });

      if (textResponse.status === 429) {
        B.showSpeech('太多人在聊天啦，稍微等一下再试试吧～', 5000);
        return;
      }
      if (textResponse.status === 413) {
        B.showSpeech('消息太长啦，简短一点吧～', 5000);
        return;
      }
      if (!textResponse.ok) throw new Error(`Text API HTTP ${textResponse.status}`);

      const textData = await textResponse.json();
      const rawContent = textData.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Empty text response');

      let enText, zhText;
      try {
        const parsed = JSON.parse(rawContent.trim());
        enText = parsed.en || '';
        zhText = parsed.zh || '';
      } catch {
        enText = rawContent;
        zhText = rawContent;
      }

      history.push({ role: 'assistant', content: rawContent });
      saveChatHistory(history.slice(-MAX_CHAT_MESSAGES));

      const displayText = enText && zhText ? `${zhText}\n${enText}` : (zhText || enText);

      // Step 2: TTS
      try {
        const refAudio = await loadRefAudio();
        const ttsResponse = await fetch('https://waifu-chat.iliyian.com/v1/audio/mimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mimo-v2.5-tts-voiceclone',
            messages: [
              { role: 'user', content: '声音务必空灵，灵动，最关键的是流畅性，同时永远保持年轻少女的富有活力的音色，但是不能过于可爱，依然以**空灵轻盈**为绝对的主色调。几乎每句话的结尾都是上扬的语调。' },
              { role: 'assistant', content: enText },
            ],
            audio: {
              format: 'wav',
              voice: refAudio,
            },
          }),
        });

        if (ttsResponse.ok) {
          const ttsData = await ttsResponse.json();
          const audioBase64 = ttsData.choices?.[0]?.message?.audio?.data
            || ttsData.audio?.data
            || ttsData.data;

          if (audioBase64) {
            const binary = atob(audioBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            B.stopAudio();
            const ttsAudio = new Audio(url);
            ttsAudio.volume = config.model.volume;
            ttsAudio.onended = () => URL.revokeObjectURL(url);
            state.audio = ttsAudio;
            ttsAudio.play().catch(() => {});
            B.updateLipSyncIds();
            B.installLipSync(ttsAudio);
            B.showSpeech(displayText, 0, ttsAudio);
            return;
          }
        }
        console.warn('[blog-live2d] TTS failed, HTTP', ttsResponse.status);
      } catch (ttsErr) {
        console.warn('[blog-live2d] TTS error:', ttsErr);
      }

      // Fallback: text only
      B.stopAudio();
      B.showSpeech(displayText, 12000);
    } catch (err) {
      console.warn('[blog-live2d] chat error:', err);
      B.showSpeech('唔...好像出了点问题，等会再试试吧～', 5000);
    } finally {
      state.chatSending = false;
    }
  }

  Object.assign(B, {
    addStyle,
    closePanel,
    openPanel,
    loadChatHistory,
    saveChatHistory,
    ensureChatCapsule,
    showChatCapsule,
    hideChatCapsule,
    loadRefAudio,
    sendChatMessage,
  });
})();
