# GiftMaster — Claude Code Prompts

## PROMPT 1: Stream 2 Scaffold (RUN THIS FIRST — your team is waiting)

```
Read CLAUDE.md and docs/DATA_MODEL.md and docs/ARCHITECTURE.md in this repo.

Execute Phase 1 (Foundation) from CLAUDE.md. Scaffold the project INTO the current repo root directory — do NOT create a subdirectory. The existing CLAUDE.md, TEAM.md, README.md, notes.md, and docs/ folder must remain untouched.

1. Initialize Vite + React project in the repo root:
   - npm init, add vite.config.js, index.html, src/ structure
   - Do NOT overwrite or delete any existing .md files or the docs/ folder

2. Install all dependencies:
   react, react-dom, react-router-dom, tailwindcss, @tailwindcss/vite, postcss, autoprefixer,
   dexie, dexie-react-hooks, zustand, date-fns, framer-motion,
   react-hook-form, zod, @hookform/resolvers, lucide-react,
   vite-plugin-pwa, workbox-window,
   @supabase/supabase-js

3. Configure Tailwind with a custom theme:
   - Primary: deep burgundy/wine (#7C2D3E with lighter/darker variants)
   - Accent: warm gold/amber (#D4A843)
   - Backgrounds: warm cream (#FBF7F4 light), warm charcoal (#1C1917 dark)
   - Neutral scale: warm grays
   - Load Google Fonts: "Fraunces" (display) + "DM Sans" (body)

4. Configure PWA plugin in vite.config.js per docs/ARCHITECTURE.md:
   - App name: GiftMaster
   - Theme color: #7C2D3E
   - Background: #FBF7F4
   - Precache all static assets
   - Runtime cache Google Fonts

5. Add vercel.json for deployment:
   - SPA rewrite rules
   - Service worker cache headers
   - Manifest no-cache header

6. Create .env.example with:
   VITE_SUPABASE_URL=https://zqydrgcqpvslqkregawa.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWRyZ2NxcHZzbHFrcmVnYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODcwOTMsImV4cCI6MjA5MTM2MzA5M30.3yVWC8fwc0u3FEdy4ua85Bezax8ia54QQFraZU29S04
   VITE_AGENT_API_URL=https://87.99.133.69:3001

   Also create .env with the same values (actual values, not placeholders).

7. Set up Dexie.js database (src/db/database.js) with ALL 7 tables from docs/DATA_MODEL.md:
   user, relationships, events, preferences, gifts, suggestions, settings
   Include the full index definitions.

8. Create Zustand stores (src/stores/):
   - useUserStore.js — user profile CRUD, hydrate from Dexie
   - useRelationshipStore.js — relationship CRUD with archive support
   - useEventStore.js — event CRUD with next_occurrence recalculation
   - useGiftStore.js — gift CRUD with status progression
   - useAppStore.js — UI state, onboarding progress, theme

   Each store must have:
   - hydrate() method that reads from Dexie
   - Optimistic updates (update Zustand immediately, persist to Dexie async)
   - All CRUD operations (add, update, delete/archive)

9. Create a Supabase client (src/lib/supabase.js) using the env vars.

10. Build the app shell:
    - src/App.jsx with React Router, all routes from docs/ARCHITECTURE.md
    - src/components/layout/AppShell.jsx — main layout wrapper
    - src/components/layout/BottomNav.jsx — 5 tabs (Home, People, Calendar, Gifts, Settings) using lucide-react icons
    - Route guard: if onboarding not complete, redirect to /onboarding
    - Theme provider with light/dark/system support using CSS variables

11. Create placeholder page components for every route (just the component name as an h1 for now):
    Dashboard, Onboarding, Relationships, RelationshipDetail, Calendar, GiftTracker, Settings, Premium

12. Set up globals.css with:
    - CSS variables for all theme colors (light + dark mode via prefers-color-scheme)
    - Font imports for Fraunces + DM Sans
    - Base styles, smooth scrolling, selection colors

13. Create src/lib/supabase.js for the Supabase client connection.

14. Verify `npm run dev` works, then `npm run build` succeeds.

15. Commit everything and push to main with message:
    "feat: scaffold Vite + React PWA with Dexie, Zustand, Tailwind, and Supabase"

Use the git remote that's already configured. The team is waiting on this scaffold to start their work.
```

---

## PROMPT 2: Hetzner VPS Setup (run after scaffold is pushed)

```
Read docs/INFRASTRUCTURE.md and docs/MESSAGING.md in this repo.

I have a fresh Hetzner VPS running Ubuntu 24.04:
- IP: 87.99.133.69
- Access: root with password (I'll provide when prompted)
- No SSH key configured yet

Connect to the server via SSH and perform the full setup:

PHASE 1 — System Basics:
1. Update and upgrade all packages
2. Set timezone to UTC
3. Set hostname to giftmaster-agent
4. Install essential packages: curl, wget, git, build-essential, pkg-config, libssl-dev

PHASE 2 — Node.js 20:
1. Install Node.js 20 via NodeSource
2. Verify: node --version, npm --version
3. Install PM2 globally for process management

PHASE 3 — Redis:
1. Install Redis server
2. Enable and start the service
3. Verify: redis-cli ping → PONG
4. Configure Redis to only listen on localhost

PHASE 4 — Playwright:
1. Install Playwright system dependencies: npx playwright install-deps
2. Install Chromium only: npx playwright install chromium
3. Verify Chromium binary exists

PHASE 5 — Rust + ZeroClaw:
1. Install Rust via rustup (stable toolchain)
2. Clone ZeroClaw: git clone https://github.com/zeroclaw-labs/zeroclaw.git /opt/zeroclaw
3. Build ZeroClaw: cargo build --release
4. Copy binary to /usr/local/bin/zeroclaw
5. Create config directory: mkdir -p /root/.zeroclaw
6. Create a starter config.toml with Claude as the AI provider (placeholder API key — I'll fill in later):

[config.toml should include:]
- default_provider = "anthropic"
- default_model = "anthropic/claude-sonnet-4-20250514"
- memory backend = "sqlite"
- gateway with require_pairing = true
- autonomy level = "supervised"
- WhatsApp channel config section (commented out, with placeholder values)
- Telegram channel config section (commented out, with placeholder values)

PHASE 6 — Agent API:
1. Create /opt/giftmaster-agent/
2. Initialize Node.js project
3. Install: express, bullmq, ioredis, playwright, dotenv, helmet, cors, @anthropic-ai/sdk, @supabase/supabase-js
4. Create server.js with the Agent API skeleton from docs/INFRASTRUCTURE.md:
   - POST /tasks → queue a new task
   - GET /tasks/:id → check task status
   - POST /tasks/:id/cancel → cancel task
   - GET /health → health check
   - Authentication middleware (validates bearer token)
   - BullMQ worker with concurrency 2
   - Task type router (research_gifts, book_reservation, order_flowers, custom)
5. Create .env with placeholders:
   ANTHROPIC_API_KEY=sk-ant-placeholder
   SUPABASE_URL=https://zqydrgcqpvslqkregawa.supabase.co
   SUPABASE_SERVICE_KEY=placeholder
   ALLOWED_ORIGINS=https://giftmaster.vercel.app
   PORT=3001
6. Create a stub for each task worker:
   - workers/research-gifts.js
   - workers/book-reservation.js
   - workers/order-flowers.js
   - workers/custom-task.js
   Each should export an async function that accepts (instructions, context, job) and returns a result object.

PHASE 7 — Process Management (PM2):
1. Create PM2 ecosystem config for the Agent API
2. Start the Agent API with PM2
3. Configure PM2 to auto-start on boot: pm2 startup, pm2 save

PHASE 8 — Firewall:
1. Configure UFW:
   - Allow SSH (22/tcp)
   - Allow HTTPS (443/tcp)
   - Allow port 3001/tcp (Agent API — we'll put this behind nginx+SSL later)
   - Enable UFW
2. Verify rules

PHASE 9 — Nginx Reverse Proxy (optional but recommended):
1. Install nginx
2. Create a basic reverse proxy config for port 3001
3. For now, use HTTP — we'll add SSL with Let's Encrypt once we have a domain

PHASE 10 — SSH Key Setup:
1. Generate an ed25519 SSH key pair on the server
2. Add the public key to authorized_keys
3. Show me the private key so I can save it locally
4. Disable password authentication in sshd_config
5. Restart sshd

PHASE 11 — Verification:
1. Verify all services are running: Redis, Agent API (PM2), nginx
2. curl localhost:3001/health should return { status: "ok" }
3. Show me a summary of everything installed and all service statuses

Supabase connection details:
- Project ID: zqydrgcqpvslqkregawa
- URL: https://zqydrgcqpvslqkregawa.supabase.co
- Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWRyZ2NxcHZzbHFrcmVnYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODcwOTMsImV4cCI6MjA5MTM2MzA5M30.3yVWC8fwc0u3FEdy4ua85Bezax8ia54QQFraZU29S04
```

---

## Execution Order

1. **Run Prompt 1 first** — your team needs the scaffold to start building
2. Push to main, announce in Discord: "Scaffold is live, pull and start your streams"
3. Connect the repo to Vercel (GitHub integration, takes 2 min in browser)
4. **Run Prompt 2** — VPS setup runs in parallel while team builds the PWA
5. Once both are done, add the Vercel deployment URL to the Hetzner ALLOWED_ORIGINS

## Key Credentials Reference

| Service | Detail |
|---------|--------|
| **GitHub Repo** | arc-web/claudeconference-pod-d |
| **Supabase Project ID** | zqydrgcqpvslqkregawa |
| **Supabase URL** | https://zqydrgcqpvslqkregawa.supabase.co |
| **Supabase Anon Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWRyZ2NxcHZzbHFrcmVnYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODcwOTMsImV4cCI6MjA5MTM2MzA5M30.3yVWC8fwc0u3FEdy4ua85Bezax8ia54QQFraZU29S04 |
| **Hetzner VPS IP** | 87.99.133.69 |
| **Hetzner VPS OS** | Ubuntu 24.04, CPX11, Ashburn VA |
| **Agent API Port** | 3001 |
