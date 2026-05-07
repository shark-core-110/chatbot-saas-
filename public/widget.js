(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────

  var scriptEl =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  function getApiUrl() {
    var manual = scriptEl.getAttribute('data-api');
    if (manual) return manual.replace(/\/$/, '');
    try {
      if (scriptEl.src) return new URL(scriptEl.src).origin;
    } catch (e) {}
    return window.location.origin;
  }

  var cfg = {
    businessName: scriptEl.getAttribute('data-business') || 'Assistant',
    color: scriptEl.getAttribute('data-color') || '#185FA5',
    botName: scriptEl.getAttribute('data-bot-name') || 'AI Assistant',
    services: scriptEl.getAttribute('data-services') || '',
    bookingLink: scriptEl.getAttribute('data-booking') || '',
    businessId: scriptEl.getAttribute('data-id') || 'default',
    industry: scriptEl.getAttribute('data-industry') || '',
    apiUrl: getApiUrl(),
  };

  console.log('[ChatBot] widget loaded — api:', cfg.apiUrl);

  // ─── State ────────────────────────────────────────────────────────────────

  var isOpen = false;
  var msgCount = 0;
  var leadDone = false;
  var awaitingLead = false;
  var leadStep = null;
  var leadData = {};
  var history = [];

  // ─── Styles ───────────────────────────────────────────────────────────────

  var css = [
    '#cbs-btn{position:fixed;bottom:24px;right:24px;z-index:2147483646;width:60px;height:60px;border-radius:50%;background:' + cfg.color + ';border:none;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;outline:none}',
    '#cbs-btn:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(0,0,0,.36)}',
    '#cbs-btn svg{width:26px;height:26px;fill:#fff;pointer-events:none}',
    '#cbs-win{position:fixed;bottom:96px;right:24px;z-index:2147483645;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:20px;box-shadow:0 12px 48px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;font-family:"Segoe UI",system-ui,-apple-system,sans-serif}',
    '#cbs-win.open{display:flex;animation:cbs-up .25s ease}',
    '@keyframes cbs-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}',
    '#cbs-hdr{background:' + cfg.color + ';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '#cbs-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;font-style:normal}',
    '#cbs-hdr-info{flex:1;min-width:0}',
    '#cbs-hdr-info h3{margin:0;font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#cbs-hdr-info p{margin:0;font-size:11px;color:rgba(255,255,255,.75)}',
    '#cbs-x{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;padding:4px;display:flex;line-height:1;border-radius:50%;transition:background .15s}',
    '#cbs-x:hover{background:rgba(255,255,255,.15);color:#fff}',
    '#cbs-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;background:#f6f8fb;scroll-behavior:smooth}',
    '#cbs-msgs::-webkit-scrollbar{width:3px}',
    '#cbs-msgs::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:4px}',
    '.cbs-row{display:flex;align-items:flex-end;gap:7px;max-width:88%}',
    '.cbs-row.bot{align-self:flex-start}',
    '.cbs-row.user{align-self:flex-end;flex-direction:row-reverse}',
    '.cbs-av-sm{width:26px;height:26px;border-radius:50%;background:' + cfg.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}',
    '.cbs-bub{padding:9px 13px;border-radius:18px;font-size:13.5px;line-height:1.5;word-break:break-word}',
    '.cbs-row.bot .cbs-bub{background:#fff;color:#1a1a2e;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.08)}',
    '.cbs-row.user .cbs-bub{background:' + cfg.color + ';color:#fff;border-bottom-right-radius:4px}',
    '.cbs-typing{display:flex;gap:4px;padding:10px 14px;align-items:center}',
    '.cbs-typing span{width:7px;height:7px;border-radius:50%;background:#c5cad3;display:inline-block;animation:cbs-bounce 1.1s ease infinite}',
    '.cbs-typing span:nth-child(2){animation-delay:.18s}',
    '.cbs-typing span:nth-child(3){animation-delay:.36s}',
    '@keyframes cbs-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}',
    '.cbs-qbtns{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}',
    '.cbs-qbtn{padding:5px 12px;border:1.5px solid ' + cfg.color + ';border-radius:20px;background:#fff;color:' + cfg.color + ';font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit;white-space:nowrap}',
    '.cbs-qbtn:hover:not(:disabled){background:' + cfg.color + ';color:#fff}',
    '.cbs-qbtn:disabled{opacity:.5;cursor:default}',
    '#cbs-inp-wrap{padding:10px 12px;background:#fff;border-top:1px solid #eaecf0;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}',
    '#cbs-inp{flex:1;border:1.5px solid #e0e4ea;border-radius:20px;padding:9px 14px;font-size:13.5px;outline:none;resize:none;max-height:90px;overflow-y:auto;transition:border-color .2s;font-family:inherit;line-height:1.4;background:#fafbfc}',
    '#cbs-inp:focus{border-color:' + cfg.color + ';background:#fff}',
    '#cbs-send{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:' + cfg.color + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s}',
    '#cbs-send:hover{opacity:.85}',
    '#cbs-send svg{width:17px;height:17px;fill:#fff}',
    '#cbs-brand{text-align:center;padding:5px 8px;font-size:10.5px;color:#b0b8c6;background:#fff;flex-shrink:0}',
    '#cbs-brand a{color:#b0b8c6;text-decoration:none}',
    '#cbs-brand a:hover{color:#888}',
    '@media(max-width:480px){#cbs-win{width:calc(100vw - 20px);right:10px;bottom:80px}#cbs-btn{right:10px;bottom:10px}}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ─── Icons ────────────────────────────────────────────────────────────────

  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  // ─── DOM ──────────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var btn = document.createElement('button');
  btn.id = 'cbs-btn';
  btn.setAttribute('aria-label', 'Open chat with ' + cfg.businessName);
  btn.innerHTML = ICON_CHAT;

  var win = document.createElement('div');
  win.id = 'cbs-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', cfg.botName + ' chat');
  win.innerHTML =
    '<div id="cbs-hdr">' +
      '<i id="cbs-av" aria-hidden="true">🤖</i>' +
      '<div id="cbs-hdr-info">' +
        '<h3>' + esc(cfg.botName) + '</h3>' +
        '<p>' + esc(cfg.businessName) + ' &middot; Online now</p>' +
      '</div>' +
      '<button id="cbs-x" aria-label="Close chat">' + ICON_CLOSE + '</button>' +
    '</div>' +
    '<div id="cbs-msgs" role="log" aria-live="polite"></div>' +
    '<div id="cbs-inp-wrap">' +
      '<textarea id="cbs-inp" placeholder="Type a message..." rows="1" aria-label="Message input"></textarea>' +
      '<button id="cbs-send" aria-label="Send message">' + ICON_SEND + '</button>' +
    '</div>' +
    '<div id="cbs-brand">Powered by <a href="#" target="_blank" rel="noopener">ChatBot SaaS</a></div>';

  document.body.appendChild(btn);
  document.body.appendChild(win);

  var msgsEl = document.getElementById('cbs-msgs');
  var inpEl = document.getElementById('cbs-inp');
  var sendBtnEl = document.getElementById('cbs-send');
  var closeEl = document.getElementById('cbs-x');

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function nl2br(s) {
    return esc(s).replace(/\n/g, '<br>');
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  function addMsg(text, from, quickReplies) {
    var row = document.createElement('div');
    row.className = 'cbs-row ' + from;

    if (from === 'bot') {
      var initial = cfg.botName ? cfg.botName.charAt(0).toUpperCase() : 'B';
      var qHtml = '';
      if (quickReplies && quickReplies.length) {
        var btns = quickReplies
          .map(function (q) { return '<button class="cbs-qbtn">' + esc(q) + '</button>'; })
          .join('');
        qHtml = '<div class="cbs-qbtns">' + btns + '</div>';
      }
      row.innerHTML =
        '<div class="cbs-av-sm" aria-hidden="true">' + esc(initial) + '</div>' +
        '<div><div class="cbs-bub">' + nl2br(text) + '</div>' + qHtml + '</div>';

      row.querySelectorAll('.cbs-qbtn').forEach(function (b) {
        b.addEventListener('click', function () {
          row.querySelectorAll('.cbs-qbtn').forEach(function (x) { x.disabled = true; });
          doSend(b.textContent);
        });
      });
    } else {
      row.innerHTML = '<div class="cbs-bub">' + nl2br(text) + '</div>';
    }

    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row;
  }

  function showTyping() {
    var row = document.createElement('div');
    row.className = 'cbs-row bot';
    row.id = 'cbs-typing';
    var initial = cfg.botName ? cfg.botName.charAt(0).toUpperCase() : 'B';
    row.innerHTML =
      '<div class="cbs-av-sm" aria-hidden="true">' + esc(initial) + '</div>' +
      '<div class="cbs-bub cbs-typing"><span></span><span></span><span></span></div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById('cbs-typing');
    if (t) t.remove();
  }

  // ─── Toggle ───────────────────────────────────────────────────────────────

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      btn.innerHTML = ICON_CLOSE;
      btn.setAttribute('aria-label', 'Close chat');
      inpEl.focus();
      if (msgCount === 0) sendGreeting();
    } else {
      win.classList.remove('open');
      btn.innerHTML = ICON_CHAT;
      btn.setAttribute('aria-label', 'Open chat with ' + cfg.businessName);
    }
  }

  // ─── Greeting ─────────────────────────────────────────────────────────────

  function sendGreeting() {
    var serviceList = cfg.services
      ? cfg.services.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      : [];

    var text = serviceList.length
      ? 'Hi there! 👋 I\'m ' + cfg.botName + ' from ' + cfg.businessName + '.\n\nI can help you with:\n• ' + serviceList.join('\n• ') + '\n\nWhat can I help you with today?'
      : 'Hi there! 👋 I\'m ' + cfg.botName + ' from ' + cfg.businessName + '. How can I help you today?';

    var qr = serviceList.slice(0, 3);
    if (!qr.length) qr = ['Tell me more', 'Book appointment', 'Contact info'];

    addMsg(text, 'bot', qr);
  }

  // ─── Lead capture ─────────────────────────────────────────────────────────

  function startLeadCapture() {
    awaitingLead = true;
    leadStep = 'name';
    setTimeout(function () {
      addMsg("By the way, I'd love to make sure someone follows up with you! What's your name?", 'bot');
    }, 700);
  }

  function handleLeadStep(msg) {
    if (leadStep === 'name') {
      if (msg.trim().length < 2) {
        addMsg('Could you share your name so we can follow up with you?', 'bot');
        return;
      }
      leadData.name = msg.trim();
      leadStep = 'email';
      addMsg('Nice to meet you, ' + leadData.name + "! What's the best email address to reach you?", 'bot');
    } else if (leadStep === 'email') {
      if (!msg.includes('@') || !msg.includes('.')) {
        addMsg("That doesn't look quite right — could you double-check your email address?", 'bot');
        return;
      }
      leadData.email = msg.trim();
      leadStep = 'done';
      awaitingLead = false;
      leadDone = true;
      saveLead();

      var followUp = cfg.bookingLink
        ? 'Thanks ' + leadData.name + "! We'll be in touch at " + leadData.email + '. You can also book directly:\n' + cfg.bookingLink + '\n\nAnything else I can help with?'
        : 'Thanks ' + leadData.name + "! We'll reach out to you at " + leadData.email + ' soon. Is there anything else I can help you with?';

      addMsg(followUp, 'bot');
    }
  }

  function saveLead() {
    fetch(cfg.apiUrl + '/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: leadData.name || '',
        email: leadData.email || '',
        businessId: cfg.businessId,
        source: 'chat-widget',
      }),
    }).catch(function () {});
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  function doSend(textOverride) {
    var msg = (textOverride !== undefined ? textOverride : inpEl.value).trim();
    if (!msg) return;

    if (!textOverride) {
      inpEl.value = '';
      inpEl.style.height = 'auto';
    }

    addMsg(msg, 'user');
    msgCount++;

    if (awaitingLead) {
      handleLeadStep(msg);
      return;
    }

    showTyping();
    sendBtnEl.disabled = true;

    history.push({ role: 'user', content: msg });

    fetch(cfg.apiUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        businessConfig: {
          name: cfg.businessName,
          botName: cfg.botName,
          industry: cfg.industry,
          services: cfg.services,
          bookingLink: cfg.bookingLink,
          businessId: cfg.businessId,
        },
        conversationHistory: history.slice(-10),
      }),
    })
      .then(function (r) {
        // Parse the body regardless of status — the server always returns JSON
        return r.json().catch(function () { return { error: 'HTTP ' + r.status }; });
      })
      .then(function (data) {
        hideTyping();
        sendBtnEl.disabled = false;

        if (data.error) {
          console.error('[ChatBot] API error:', data.error);
          addMsg("Sorry, I'm having trouble connecting right now. Please try again in a moment.", 'bot');
          history.pop();
          return;
        }

        history.push({ role: 'assistant', content: data.response });
        addMsg(data.response, 'bot');

        if (msgCount >= 2 && !leadDone && !awaitingLead) {
          startLeadCapture();
        }
      })
      .catch(function (err) {
        console.error('[ChatBot] fetch error — target:', cfg.apiUrl + '/api/chat', '— reason:', err.message || err);
        hideTyping();
        sendBtnEl.disabled = false;
        addMsg('Connection error. Please check your network and try again.', 'bot');
        history.pop();
      });
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  btn.addEventListener('click', toggle);
  closeEl.addEventListener('click', toggle);
  sendBtnEl.addEventListener('click', function () { doSend(); });

  inpEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  inpEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 90) + 'px';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) toggle();
  });

})();
