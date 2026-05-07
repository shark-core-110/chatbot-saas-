# ChatBot SaaS

AI-powered chat widget for local businesses — dentists, salons, gyms, lawyers, real estate agents.  
Built with Node.js + Express + Anthropic Claude. No database required.

---

## Quick Start (local)

```bash
# 1. Enter the project folder
cd chatbot-saas

# 2. Install dependencies
npm install

# 3. Copy the env template and add your API key
cp .env.example .env
# Open .env and set: ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the server
npm start
```

Open in your browser:
- **Admin Dashboard** → http://localhost:3000
- **Demo / Sales Page** → http://localhost:3000/demo.html

---

## Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-`)
5. Paste it into `.env` as `ANTHROPIC_API_KEY=sk-ant-your-key-here`

> Cost estimate: ~$0.003 per conversation. 300 conversations/month per client ≈ $1/month in API costs.

---

## Deploy Free on Render.com (step by step)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "feat: initial chatbot saas"
   # Create a new repo on github.com, then:
   git remote add origin https://github.com/YOUR_USER/chatbot-saas.git
   git push -u origin main
   ```

2. **Create a Render account** at https://render.com (free tier available)

3. **New Web Service**
   - Click **New +** → **Web Service**
   - Connect GitHub → select your repo

4. **Configure**

   | Field | Value |
   |-------|-------|
   | Name | `chatbot-saas` |
   | Environment | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

5. **Add environment variable**
   - Go to the **Environment** tab
   - Key: `ANTHROPIC_API_KEY` → Value: `sk-ant-your-key-here`

6. Click **Create Web Service** — Render builds and deploys automatically.  
   Your live URL will be something like `https://chatbot-saas-xxxx.onrender.com`

7. **Verify** — visit `https://your-render-url.onrender.com/demo.html`

> **Important:** Free Render instances sleep after 15 minutes of inactivity (cold start ~30 sec).  
> Upgrade to the **$7/month Starter** plan for always-on hosting when you have paying clients.

---

## Adding a New Client (5 steps)

1. Open your Admin Dashboard at `https://your-render-url.onrender.com`
2. Click **Add New Client** in the left sidebar
3. Fill in: Business Name, Industry, Services (comma-separated), Booking Link, Brand Color, Bot Name
4. Click **Save Client**
5. Open the **Embed Code** tab — copy the snippet and paste it on the client's site

The bot is live the moment the snippet is on their page. No restart needed.

---

## Embedding on a Client's Website

Paste the snippet **just before the closing `</body>` tag** on every page.

```html
<script
  src="https://your-render-url.onrender.com/widget.js"
  data-business="Smile Dental"
  data-color="#185FA5"
  data-bot-name="SmileBot"
  data-services="Teeth Cleaning, Whitening, Implants"
  data-booking="https://calendly.com/smiledental"
  data-id="biz-1234567890"
  data-api="https://your-render-url.onrender.com">
</script>
```

**Where to paste by platform:**

| Platform | Location |
|----------|----------|
| WordPress | Appearance → Theme Editor → `footer.php`, before `</body>` |
| Squarespace | Settings → Advanced → Code Injection → Footer |
| Wix | Settings → Custom Code → Add Code → Body (end) |
| Shopify | Online Store → Themes → Edit Code → `theme.liquid`, before `</body>` |
| Webflow | Project Settings → Custom Code → Footer Code |
| Raw HTML | Before `</body>` in every page |

---

## Pricing Suggestions

| Tier | Monthly Price | Includes | Your profit* |
|------|--------------|----------|-------------|
| Starter | $199/mo | 1 bot, unlimited chats, lead capture, monthly report | ~$179 |
| Growth | $399/mo | 3 bots, custom instructions, weekly report, priority support | ~$379 |
| Agency | $799/mo | 10 bots, white-label dashboard, onboarding call | ~$779 |

*After ~$20/mo in API costs at typical usage volumes.

---

## Sales Tips

**Who to target first:**
- Dental clinics — they lose leads every evening from price/availability questions
- Salons — callers hang up if nobody answers, bot books them instead
- Gyms — free trial signups at 11pm when the front desk is closed
- Law firms — 24/7 intake without paying a receptionist
- Real estate agents — property enquiries while they're at viewings

**30-second pitch:**
> "You're losing leads every night when your phone is off. This bot answers every question, captures their name and email, and sends them straight to your booking page — automatically. I set it up in 30 minutes and you pay nothing until you see results."

**Handling common objections:**

- *"We already have a contact form"*  
  → Forms require effort and get abandoned. This starts a conversation and captures leads passively.

- *"Is it accurate?"*  
  → Pull up `demo.html` in their browser, configured for their industry. Show it live.

- *"That's expensive"*  
  → One booked appointment covers the entire monthly fee. Everything after that is profit from a lead that would have been lost.

**Closing the deal:**
1. Show the live demo — open `demo.html` right in front of them
2. Offer a 14-day free trial (set them up, charge after they see their first leads)
3. Charge a one-time setup fee ($200–$500) plus the monthly retainer

---

## File Structure

```
chatbot-saas/
├── server.js            # Express backend — all API routes
├── package.json
├── .env.example         # Copy to .env, add ANTHROPIC_API_KEY
├── public/
│   ├── widget.js        # Embeddable chat widget (vanilla JS, no deps)
│   ├── index.html       # Admin dashboard (single-file, no framework)
│   └── demo.html        # Sales landing page with live demo bot
├── data/
│   ├── leads.json       # Captured leads — auto-created on first run
│   └── businesses.json  # Client configs — auto-created on first run
└── README.md
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get Claude AI response |
| POST | `/api/leads` | Save a captured lead |
| GET | `/api/leads/:businessId` | Leads for one business |
| GET | `/api/leads` | All leads |
| DELETE | `/api/leads/:id` | Delete a lead |
| GET | `/api/businesses` | List all clients |
| POST | `/api/businesses` | Create a client |
| PUT | `/api/businesses/:id` | Update a client |
| DELETE | `/api/businesses/:id` | Delete a client |
| GET | `/api/stats` | Dashboard stats |
| GET | `/preview?id=bizId` | Live bot preview page |
