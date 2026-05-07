'use strict';

require('dotenv').config(); // must be first — loads .env before any module reads process.env

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

if (!process.env.GROQ_API_KEY) {
  console.error('\n❌  GROQ_API_KEY is not set. Copy .env.example to .env and add your key.\n');
  process.exit(1);
}

console.log('✅  Groq client ready');

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({ origin: '*', methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.get('/widget.js', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Data helpers ────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const BUSINESSES_FILE = path.join(DATA_DIR, 'businesses.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');
  if (!fs.existsSync(BUSINESSES_FILE)) fs.writeFileSync(BUSINESSES_FILE, '[]');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

ensureDataFiles();

// ─── Chat ────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  console.log('[chat] incoming request from', req.ip);
  const { message, businessConfig = {}, conversationHistory = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
  }

  const {
    name = 'this business',
    botName = 'AI Assistant',
    industry = '',
    services = '',
    bookingLink = '',
    systemPrompt = '',
  } = businessConfig;

  const systemContent = [
    `You are ${botName}, a friendly and professional virtual assistant for ${name}.`,
    industry ? `Industry: ${industry}` : '',
    services ? `Services offered: ${services}` : '',
    bookingLink ? `Booking / appointment link: ${bookingLink}` : '',
    systemPrompt ? `Additional instructions: ${systemPrompt}` : '',
    '',
    'Guidelines:',
    '- Be warm, helpful, and conversational. Keep replies to 2-3 sentences when possible.',
    '- Answer questions about the business services clearly and confidently.',
    '- When relevant, encourage scheduling an appointment or consultation.',
    bookingLink
      ? `- Guide users to book at: ${bookingLink}`
      : '- Help customers understand their options and next steps.',
    "- If asked something you don't know specifically, suggest contacting the business directly.",
    '- Never make up specific pricing, staff names, or availability.',
  ]
    .filter(Boolean)
    .join('\n');

  const messages = [
    { role: 'system', content: systemContent },
    ...conversationHistory.slice(-10).filter((m) => m.role && m.content),
    { role: 'user', content: message.trim() },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: 'llama3-8b-8192', messages, max_tokens: 512 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!groqRes.ok) {
      const body = await groqRes.text();
      console.error('Groq API error:');
      console.error('  status :', groqRes.status);
      console.error('  body   :', body);
      return res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
    }

    const data = await groqRes.json();
    res.json({ response: data.choices[0].message.content });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Groq fetch error:');
    console.error('  name   :', err.name);
    console.error('  message:', err.message);
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// ─── Leads ───────────────────────────────────────────────────────────────────

app.post('/api/leads', (req, res) => {
  const { name, email, phone, businessId, source } = req.body;

  if (!businessId) return res.status(400).json({ error: 'businessId is required' });

  const leads = readJson(LEADS_FILE);
  const lead = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    businessId: String(businessId),
    name: String(name || '').slice(0, 100),
    email: String(email || '').slice(0, 200),
    phone: String(phone || '').slice(0, 30),
    source: source || 'chat',
    timestamp: new Date().toISOString(),
  };

  leads.push(lead);
  writeJson(LEADS_FILE, leads);

  res.json({ success: true, lead });
});

app.get('/api/leads/:businessId', (req, res) => {
  const leads = readJson(LEADS_FILE);
  const result = leads.filter((l) => l.businessId === req.params.businessId);
  res.json({ leads: result.slice().reverse(), total: result.length });
});

app.get('/api/leads', (req, res) => {
  const leads = readJson(LEADS_FILE);
  res.json({ leads: leads.slice().reverse(), total: leads.length });
});

app.delete('/api/leads/:id', (req, res) => {
  let leads = readJson(LEADS_FILE);
  leads = leads.filter((l) => l.id !== req.params.id);
  writeJson(LEADS_FILE, leads);
  res.json({ success: true });
});

// ─── Businesses ──────────────────────────────────────────────────────────────

app.get('/api/businesses', (req, res) => {
  const businesses = readJson(BUSINESSES_FILE);
  const leads = readJson(LEADS_FILE);

  const enriched = businesses.map((b) => ({
    ...b,
    leadCount: leads.filter((l) => l.businessId === b.id).length,
  }));

  res.json({ businesses: enriched });
});

app.post('/api/businesses', (req, res) => {
  const { name, industry, services, bookingLink, primaryColor, botName, systemPrompt } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Business name is required' });
  }

  const businesses = readJson(BUSINESSES_FILE);
  const business = {
    id: `biz-${Date.now()}`,
    name: name.trim().slice(0, 100),
    industry: String(industry || '').slice(0, 100),
    services: String(services || '').slice(0, 500),
    bookingLink: String(bookingLink || '').slice(0, 500),
    primaryColor: /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#185FA5',
    botName: String(botName || `${name.trim()} Assistant`).slice(0, 100),
    systemPrompt: String(systemPrompt || '').slice(0, 1000),
    createdAt: new Date().toISOString(),
  };

  businesses.push(business);
  writeJson(BUSINESSES_FILE, businesses);

  res.json({ success: true, business });
});

app.put('/api/businesses/:id', (req, res) => {
  const businesses = readJson(BUSINESSES_FILE);
  const idx = businesses.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Business not found' });

  const { name, industry, services, bookingLink, primaryColor, botName, systemPrompt } = req.body;

  businesses[idx] = {
    ...businesses[idx],
    name: String(name || businesses[idx].name).slice(0, 100),
    industry: String(industry != null ? industry : businesses[idx].industry).slice(0, 100),
    services: String(services != null ? services : businesses[idx].services).slice(0, 500),
    bookingLink: String(bookingLink != null ? bookingLink : businesses[idx].bookingLink).slice(0, 500),
    primaryColor: /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : businesses[idx].primaryColor,
    botName: String(botName != null ? botName : businesses[idx].botName).slice(0, 100),
    systemPrompt: String(systemPrompt != null ? systemPrompt : businesses[idx].systemPrompt).slice(0, 1000),
  };

  writeJson(BUSINESSES_FILE, businesses);
  res.json({ success: true, business: businesses[idx] });
});

app.delete('/api/businesses/:id', (req, res) => {
  let businesses = readJson(BUSINESSES_FILE);
  businesses = businesses.filter((b) => b.id !== req.params.id);
  writeJson(BUSINESSES_FILE, businesses);
  res.json({ success: true });
});

// ─── Stats ───────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const businesses = readJson(BUSINESSES_FILE);
  const leads = readJson(LEADS_FILE);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const leadsThisWeek = leads.filter((l) => l.timestamp >= sevenDaysAgo);

  res.json({
    totalBusinesses: businesses.length,
    totalLeads: leads.length,
    activeBots: businesses.length,
    leadsThisWeek: leadsThisWeek.length,
    recentLeads: leads.slice(-5).reverse(),
  });
});

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ─── Bot Preview ─────────────────────────────────────────────────────────────

app.get('/preview', (req, res) => {
  const { id } = req.query;
  const businesses = readJson(BUSINESSES_FILE);
  const business = businesses.find((b) => b.id === id);

  if (!business) {
    return res
      .status(404)
      .send('<p style="font-family:sans-serif;padding:40px;color:#666;">Business not found.</p>');
  }

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bot Preview — ${esc(business.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#f0f4f8,#e8edf5);
      min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}
    .msg{text-align:center;color:#64748b;padding:20px}
    .msg h2{font-size:18px;margin-bottom:8px;color:#1e293b}
    .msg p{font-size:14px}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(business.primaryColor)};margin-right:6px;vertical-align:middle}
  </style>
</head>
<body>
  <div class="msg">
    <h2><span class="dot"></span>${esc(business.name)}</h2>
    <p>Click the chat button in the bottom-right to test the bot live.</p>
  </div>
  <script
    src="${serverUrl}/widget.js"
    data-business="${esc(business.name)}"
    data-color="${esc(business.primaryColor)}"
    data-bot-name="${esc(business.botName)}"
    data-services="${esc(business.services)}"
    data-booking="${esc(business.bookingLink)}"
    data-id="${esc(business.id)}"
    data-api="${serverUrl}">
  </script>
</body>
</html>`);
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀  ChatBot SaaS  →  http://localhost:${PORT}`);
  console.log(`📊  Admin         →  http://localhost:${PORT}/`);
  console.log(`🎯  Demo          →  http://localhost:${PORT}/demo.html\n`);

  if (process.env.RENDER_URL) {
    const PING_INTERVAL_MS = 14 * 60 * 1000;
    setInterval(() => {
      fetch(process.env.RENDER_URL + '/api/health')
        .then((r) => console.log(`[keep-alive] ping → ${r.status}`))
        .catch((err) => console.error('[keep-alive] ping failed:', err.message));
    }, PING_INTERVAL_MS);
    console.log(`🔁  Keep-alive   →  pinging ${process.env.RENDER_URL}/api/health every 14 min`);
  }
});
