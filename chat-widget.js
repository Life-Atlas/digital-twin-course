/**
 * Digital Twin Course — Chat Widget
 * Self-contained, zero-dependency chat widget for embedding via <script> tag.
 * Connects to the DT Knowledge API for SMILE-powered Q&A.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  const DTCHAT_CONFIG = {
    apiUrl: window.DTCHAT_API_URL || 'https://api-theta-seven-95.vercel.app',
    bookingUrl: 'https://cal.com/nicolaswaern',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'dtchat_history';
  let isOpen = false;
  let isSending = false;
  let messageCount = 0;

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        messageCount = parsed.length;
        return parsed;
      }
    } catch (_) { /* ignore */ }
    return [];
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // CSS
  // ---------------------------------------------------------------------------
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Reset within widget */
      #dt-chat-bubble,
      #dt-chat-panel,
      #dt-chat-panel * {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: Inter, system-ui, -apple-system, sans-serif !important;
        line-height: 1.5 !important;
      }

      /* ---- Bubble ---- */
      #dt-chat-bubble {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background: #c9a84c !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 20px rgba(201, 168, 76, 0.35) !important;
        z-index: 999998 !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        animation: dtchat-pulse 2s ease-in-out 3 !important;
      }
      #dt-chat-bubble:hover {
        transform: scale(1.08) !important;
        box-shadow: 0 6px 28px rgba(201, 168, 76, 0.5) !important;
      }
      #dt-chat-bubble svg {
        width: 28px !important;
        height: 28px !important;
        fill: #141414 !important;
      }

      @keyframes dtchat-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(201, 168, 76, 0.35); }
        50% { box-shadow: 0 4px 30px rgba(201, 168, 76, 0.65); }
      }

      /* ---- Panel ---- */
      #dt-chat-panel {
        position: fixed !important;
        bottom: 96px !important;
        right: 24px !important;
        width: 380px !important;
        height: 520px !important;
        background: #141414 !important;
        border-radius: 16px !important;
        border: 1px solid #2a2a2a !important;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5) !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        opacity: 0 !important;
        transform: translateY(16px) scale(0.96) !important;
        pointer-events: none !important;
        transition: opacity 0.25s ease, transform 0.25s ease !important;
      }
      #dt-chat-panel.dtchat-open {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
        pointer-events: auto !important;
      }

      /* ---- Header ---- */
      #dt-chat-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 18px !important;
        background: #1a1a1a !important;
        border-bottom: 1px solid #2a2a2a !important;
        flex-shrink: 0 !important;
      }
      #dt-chat-header-title {
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #e0e0e0 !important;
        letter-spacing: 0.01em !important;
      }
      #dt-chat-header-close {
        background: none !important;
        border: none !important;
        color: #999 !important;
        cursor: pointer !important;
        font-size: 20px !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 6px !important;
        transition: background 0.15s ease, color 0.15s ease !important;
      }
      #dt-chat-header-close:hover {
        background: #2a2a2a !important;
        color: #e0e0e0 !important;
      }

      /* ---- Messages ---- */
      #dt-chat-messages {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 16px !important;
        background: #1e1e1e !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      #dt-chat-messages::-webkit-scrollbar {
        width: 6px !important;
      }
      #dt-chat-messages::-webkit-scrollbar-track {
        background: transparent !important;
      }
      #dt-chat-messages::-webkit-scrollbar-thumb {
        background: #333 !important;
        border-radius: 3px !important;
      }

      .dtchat-msg {
        max-width: 88% !important;
        padding: 10px 14px !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        color: #e0e0e0 !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      .dtchat-msg-user {
        align-self: flex-end !important;
        background: #1a1a1a !important;
        border: 1px solid #c9a84c !important;
      }
      .dtchat-msg-bot {
        align-self: flex-start !important;
        background: #252525 !important;
        border: 1px solid #2a2a2a !important;
      }
      .dtchat-msg-bot p {
        margin-bottom: 8px !important;
      }
      .dtchat-msg-bot p:last-child {
        margin-bottom: 0 !important;
      }
      .dtchat-msg-bot strong {
        color: #c9a84c !important;
        font-weight: 600 !important;
      }

      /* ---- Sources ---- */
      .dtchat-sources {
        margin-top: 8px !important;
        border-top: 1px solid #333 !important;
        padding-top: 6px !important;
      }
      .dtchat-sources-toggle {
        background: none !important;
        border: none !important;
        color: #999 !important;
        cursor: pointer !important;
        font-size: 12px !important;
        padding: 2px 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        transition: color 0.15s ease !important;
      }
      .dtchat-sources-toggle:hover {
        color: #c9a84c !important;
      }
      .dtchat-sources-list {
        display: none !important;
        margin-top: 6px !important;
        font-size: 12px !important;
        color: #888 !important;
      }
      .dtchat-sources-list.dtchat-expanded {
        display: block !important;
      }
      .dtchat-sources-list div {
        padding: 3px 0 !important;
        border-bottom: 1px solid #2a2a2a !important;
      }
      .dtchat-sources-list div:last-child {
        border-bottom: none !important;
      }

      /* ---- CTA Card ---- */
      .dtchat-cta {
        margin-top: 10px !important;
        padding: 12px !important;
        background: #1a1a1a !important;
        border: 1px solid #c9a84c !important;
        border-radius: 10px !important;
      }
      .dtchat-cta-text {
        font-size: 13px !important;
        color: #e0e0e0 !important;
        margin-bottom: 8px !important;
      }
      .dtchat-cta-btn {
        display: inline-block !important;
        padding: 8px 16px !important;
        background: #c9a84c !important;
        color: #141414 !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        text-decoration: none !important;
        transition: background 0.15s ease !important;
      }
      .dtchat-cta-btn:hover {
        background: #d4b65e !important;
      }

      /* ---- Typing indicator ---- */
      .dtchat-typing {
        align-self: flex-start !important;
        display: flex !important;
        gap: 5px !important;
        padding: 12px 16px !important;
        background: #252525 !important;
        border: 1px solid #2a2a2a !important;
        border-radius: 12px !important;
      }
      .dtchat-typing-dot {
        width: 7px !important;
        height: 7px !important;
        background: #999 !important;
        border-radius: 50% !important;
        animation: dtchat-bounce 1.2s ease-in-out infinite !important;
      }
      .dtchat-typing-dot:nth-child(2) {
        animation-delay: 0.15s !important;
      }
      .dtchat-typing-dot:nth-child(3) {
        animation-delay: 0.3s !important;
      }
      @keyframes dtchat-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }

      /* ---- Input area ---- */
      #dt-chat-input-area {
        display: flex !important;
        align-items: center !important;
        padding: 12px 14px !important;
        background: #141414 !important;
        border-top: 1px solid #2a2a2a !important;
        gap: 8px !important;
        flex-shrink: 0 !important;
      }
      #dt-chat-input {
        flex: 1 !important;
        background: #1e1e1e !important;
        border: 1px solid #333 !important;
        border-radius: 10px !important;
        padding: 10px 14px !important;
        color: #e0e0e0 !important;
        font-size: 14px !important;
        outline: none !important;
        transition: border-color 0.15s ease !important;
        resize: none !important;
      }
      #dt-chat-input::placeholder {
        color: #666 !important;
      }
      #dt-chat-input:focus {
        border-color: #c9a84c !important;
      }
      #dt-chat-send {
        width: 40px !important;
        height: 40px !important;
        border-radius: 10px !important;
        background: #c9a84c !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        transition: background 0.15s ease, opacity 0.15s ease !important;
      }
      #dt-chat-send:hover:not(:disabled) {
        background: #d4b65e !important;
      }
      #dt-chat-send:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      #dt-chat-send svg {
        width: 18px !important;
        height: 18px !important;
        fill: #141414 !important;
      }

      /* ---- Error ---- */
      .dtchat-error {
        font-size: 13px !important;
        color: #e05555 !important;
        text-align: center !important;
        padding: 8px 14px !important;
      }

      /* ---- Mobile ---- */
      @media (max-width: 480px) {
        #dt-chat-panel {
          width: calc(100vw - 16px) !important;
          height: 70vh !important;
          bottom: 80px !important;
          right: 8px !important;
          border-radius: 14px !important;
        }
        #dt-chat-bubble {
          bottom: 16px !important;
          right: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // DOM Construction
  // ---------------------------------------------------------------------------
  function buildWidget() {
    // Bubble
    const bubble = document.createElement('button');
    bubble.id = 'dt-chat-bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>`;
    document.body.appendChild(bubble);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'dt-chat-panel';
    panel.innerHTML = `
      <div id="dt-chat-header">
        <span id="dt-chat-header-title">Digital Twin Assistant</span>
        <button id="dt-chat-header-close" aria-label="Close chat">&times;</button>
      </div>
      <div id="dt-chat-messages"></div>
      <div id="dt-chat-input-area">
        <input id="dt-chat-input" type="text" placeholder="Ask about digital twins..." autocomplete="off" />
        <button id="dt-chat-send" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    return { bubble, panel };
  }

  // ---------------------------------------------------------------------------
  // Markdown-lite renderer
  // ---------------------------------------------------------------------------
  function renderMarkdown(text) {
    if (!text) return '';
    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Paragraphs: split on double newlines
    html = html
      .split(/\n{2,}/)
      .map(function (p) { return '<p>' + p.trim().replace(/\n/g, '<br>') + '</p>'; })
      .join('');
    return html;
  }

  // ---------------------------------------------------------------------------
  // Message rendering
  // ---------------------------------------------------------------------------
  function createMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'dtchat-msg dtchat-msg-' + role;
    if (role === 'bot') {
      div.innerHTML = renderMarkdown(content);
    } else {
      div.textContent = content;
    }
    return div;
  }

  /**
   * Typewriter effect — types out bot response character by character.
   * Returns a promise that resolves when typing is complete.
   */
  function typewriterMessage(container, text, scrollEl) {
    return new Promise(function (resolve) {
      var div = document.createElement('div');
      div.className = 'dtchat-msg dtchat-msg-bot';
      container.appendChild(div);

      // Split into segments: markdown tokens (**bold**) stay intact, rest char-by-char
      var chars = [];
      var i = 0;
      while (i < text.length) {
        // Keep markdown bold markers together
        if (text[i] === '*' && text[i + 1] === '*') {
          var end = text.indexOf('**', i + 2);
          if (end !== -1) {
            chars.push(text.substring(i, end + 2));
            i = end + 2;
            continue;
          }
        }
        // Keep links together [text](url)
        if (text[i] === '[') {
          var closeBracket = text.indexOf('](', i);
          var closeParen = closeBracket !== -1 ? text.indexOf(')', closeBracket + 2) : -1;
          if (closeParen !== -1) {
            chars.push(text.substring(i, closeParen + 1));
            i = closeParen + 1;
            continue;
          }
        }
        chars.push(text[i]);
        i++;
      }

      var typed = '';
      var idx = 0;
      var speed = 12; // ms per character

      function tick() {
        if (idx >= chars.length) {
          div.innerHTML = renderMarkdown(text);
          resolve(div);
          return;
        }
        typed += chars[idx];
        idx++;
        div.innerHTML = renderMarkdown(typed);
        if (scrollEl) scrollToBottom(scrollEl);
        setTimeout(tick, speed);
      }

      // Small initial delay to feel like "thinking"
      setTimeout(tick, 400);
    });
  }

  function createSources(sources) {
    if (!sources || !sources.length) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'dtchat-sources';

    const toggle = document.createElement('button');
    toggle.className = 'dtchat-sources-toggle';
    toggle.innerHTML = '&#9654; ' + sources.length + ' source' + (sources.length > 1 ? 's' : '');

    const list = document.createElement('div');
    list.className = 'dtchat-sources-list';
    sources.forEach(function (src) {
      const item = document.createElement('div');
      item.textContent = src.title || src.source || src;
      list.appendChild(item);
    });

    toggle.addEventListener('click', function () {
      var expanded = list.classList.toggle('dtchat-expanded');
      toggle.innerHTML = (expanded ? '&#9660; ' : '&#9654; ') + sources.length + ' source' + (sources.length > 1 ? 's' : '');
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(list);
    return wrapper;
  }

  function createCTA(cta) {
    if (!cta) return null;
    const card = document.createElement('div');
    card.className = 'dtchat-cta';
    const text = document.createElement('div');
    text.className = 'dtchat-cta-text';
    text.textContent = cta.text || cta.message || 'Want to learn more?';
    card.appendChild(text);

    const btn = document.createElement('a');
    btn.className = 'dtchat-cta-btn';
    btn.href = cta.url || cta.link || DTCHAT_CONFIG.bookingUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = cta.label || cta.button_text || 'Book a Session';
    card.appendChild(btn);
    return card;
  }

  function createTyping() {
    const div = document.createElement('div');
    div.className = 'dtchat-typing';
    div.id = 'dt-chat-typing';
    div.innerHTML = '<div class="dtchat-typing-dot"></div><div class="dtchat-typing-dot"></div><div class="dtchat-typing-dot"></div>';
    return div;
  }

  // ---------------------------------------------------------------------------
  // Scrolling
  // ---------------------------------------------------------------------------
  function scrollToBottom(el) {
    requestAnimationFrame(function () {
      el.scrollTop = el.scrollHeight;
    });
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  async function sendToApi(question) {
    const res = await fetch(DTCHAT_CONFIG.apiUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, message_count: messageCount }),
    });
    if (!res.ok) throw new Error('API responded with status ' + res.status);
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    injectStyles();
    const { bubble, panel } = buildWidget();
    const messagesEl = panel.querySelector('#dt-chat-messages');
    const inputEl = panel.querySelector('#dt-chat-input');
    const sendBtn = panel.querySelector('#dt-chat-send');
    const closeBtn = panel.querySelector('#dt-chat-header-close');
    let hasShownWelcome = false;

    // Restore history
    const history = loadHistory();
    if (history.length > 0) {
      hasShownWelcome = true;
      history.forEach(function (msg) {
        const msgEl = createMessage(msg.role, msg.content);
        messagesEl.appendChild(msgEl);
        if (msg.sources) {
          const srcEl = createSources(msg.sources);
          if (srcEl) messagesEl.appendChild(srcEl);
        }
        if (msg.cta) {
          const ctaEl = createCTA(msg.cta);
          if (ctaEl) messagesEl.appendChild(ctaEl);
        }
      });
    }

    function togglePanel() {
      isOpen = !isOpen;
      panel.classList.toggle('dtchat-open', isOpen);
      bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
      if (isOpen) {
        if (!hasShownWelcome) {
          hasShownWelcome = true;
          const welcome = "Hi! I'm a digital twin knowledge assistant powered by the SMILE methodology. Ask me anything about digital twins, interoperability, edge computing, or implementation strategy.";
          const welcomeEl = createMessage('bot', welcome);
          messagesEl.appendChild(welcomeEl);
          const welcomeMsg = { role: 'bot', content: welcome };
          const h = loadHistory();
          h.push(welcomeMsg);
          saveHistory(h);
        }
        scrollToBottom(messagesEl);
        setTimeout(function () { inputEl.focus(); }, 300);
      }
    }

    bubble.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);

    function setSending(val) {
      isSending = val;
      sendBtn.disabled = val;
      inputEl.disabled = val;
    }

    async function handleSend() {
      const question = inputEl.value.trim();
      if (!question || isSending) return;

      setSending(true);
      inputEl.value = '';

      // User message
      const userEl = createMessage('user', question);
      messagesEl.appendChild(userEl);
      const h = loadHistory();
      h.push({ role: 'user', content: question });
      messageCount = h.length;
      saveHistory(h);
      scrollToBottom(messagesEl);

      // Typing indicator
      const typingEl = createTyping();
      messagesEl.appendChild(typingEl);
      scrollToBottom(messagesEl);

      try {
        const data = await sendToApi(question);
        // Remove typing indicator
        typingEl.remove();

        const answer = data.answer || data.response || data.message || '';
        // Typewriter effect for bot responses
        const botEl = await typewriterMessage(messagesEl, answer, messagesEl);

        const botMsg = { role: 'bot', content: answer };

        // Sources
        const sources = data.sources || data.citations || null;
        if (sources && sources.length) {
          const srcEl = createSources(sources);
          if (srcEl) messagesEl.appendChild(srcEl);
          botMsg.sources = sources;
        }

        // CTA
        const cta = data.cta || null;
        if (cta) {
          const ctaEl = createCTA(cta);
          if (ctaEl) messagesEl.appendChild(ctaEl);
          botMsg.cta = cta;
        }

        const h2 = loadHistory();
        h2.push(botMsg);
        messageCount = h2.length;
        saveHistory(h2);
      } catch (_err) {
        typingEl.remove();
        const errDiv = document.createElement('div');
        errDiv.className = 'dtchat-error';
        errDiv.textContent = 'Having trouble connecting. Try again in a moment.';
        messagesEl.appendChild(errDiv);
      }

      scrollToBottom(messagesEl);

      // Rate limit: 1 second cooldown
      setTimeout(function () {
        setSending(false);
        inputEl.focus();
      }, 1000);
    }

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
