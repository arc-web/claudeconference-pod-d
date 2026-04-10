# GiftMaster — Infrastructure & Deployment

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        User's Phone                              │
│                    (PWA installed from)                           │
│                            │                                     │
│                            ▼                                     │
│                 ┌─────────────────────┐                          │
│                 │   Vercel (CDN)      │                          │
│                 │   Static PWA host   │                          │
│                 │   + Edge Functions  │                          │
│                 └──────────┬──────────┘                          │
│                            │                                     │
│               ┌────────────┼────────────┐                        │
│               ▼            ▼            ▼                        │
│   ┌───────────────┐ ┌───────────┐ ┌──────────────────┐          │
│   │   Supabase    │ │ Claude AI │ │  Hetzner VPS     │          │
│   │  - Auth       │ │   API     │ │  Browser Agent   │          │
│   │  - Postgres   │ │ (Sonnet)  │ │  (Playwright)    │          │
│   │  - Edge Funcs │ │           │ │                  │          │
│   │  - Realtime   │ │           │ │  Researches,     │          │
│   │  - Storage    │ │           │ │  books, orders   │          │
│   └───────────────┘ └───────────┘ └──────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Vercel — Frontend Hosting

### Why Vercel
- Zero-config deploys from GitHub
- Global CDN for fast PWA delivery
- Edge Functions for lightweight API routes (auth callbacks, webhook handlers)
- Preview deploys on every push (team can see changes before merging)
- Free tier is more than sufficient for launch

### Setup
1. Connect the `arc-web/claudeconference-pod-d` repo to Vercel
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Root directory: `/` (project is at repo root)
6. Environment variables (add in Vercel dashboard):
   ```
   VITE_SUPABASE_URL=https://[project-id].supabase.co
   VITE_SUPABASE_ANON_KEY=[anon-key]
   VITE_AGENT_API_URL=https://[hetzner-ip]:3001
   ```

### Vercel Config
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

---

## Layer 2: Supabase — Backend

### What Supabase Handles
- **Auth**: Email/password + social login (Google, Apple)
- **Postgres**: Cloud sync of local IndexedDB data
- **Edge Functions**: Suggestion generation via Claude API, notification cron, agent task dispatch
- **Realtime**: Multi-device sync (premium feature)
- **Storage**: Avatar images, gift photos

### Schema Setup

Tables mirror the Dexie.js local schema (see docs/DATA_MODEL.md) with these additions:

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users table (extends local User entity)
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  avatar_url text,
  birthday date,
  personality jsonb default '{}',
  onboarding_completed boolean default false,
  premium_status text default 'free' check (premium_status in ('free', 'premium', 'trial')),
  premium_expires_at timestamptz,
  notification_preferences jsonb default '{}',
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relationships
create table public.relationships (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  nickname text,
  avatar_url text,
  relationship_type text not null check (relationship_type in ('romantic', 'family', 'friend', 'colleague', 'other')),
  relationship_label text,
  relationship_start_date date,
  birthday date,
  phone text,
  email text,
  address text,
  employer text,
  personality jsonb default '{}',
  parents jsonb default '{}',
  children jsonb default '[]',
  pets jsonb default '[]',
  notes text,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events / Milestones
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  relationship_id uuid references public.relationships(id) on delete cascade not null,
  event_type text not null,
  custom_label text,
  date date not null,
  recurrence text default 'none' check (recurrence in ('none', 'yearly', 'monthly', 'weekly')),
  next_occurrence date not null,
  reminder_days integer[] default '{14, 7, 3, 1}',
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Preferences
create table public.preferences (
  id uuid default uuid_generate_v4() primary key,
  relationship_id uuid references public.relationships(id) on delete cascade not null,
  category text not null,
  type text not null check (type in ('like', 'dislike', 'neutral')),
  value text not null,
  specificity text,
  confidence text default 'stated' check (confidence in ('stated', 'observed', 'guessed')),
  source text,
  created_at timestamptz default now()
);

-- Gifts
create table public.gifts (
  id uuid default uuid_generate_v4() primary key,
  relationship_id uuid references public.relationships(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'idea' check (status in ('idea', 'planned', 'purchased', 'given', 'returned')),
  title text not null,
  description text,
  url text,
  image_url text,
  price numeric(10,2),
  currency text default 'USD',
  given_date date,
  reaction_rating integer check (reaction_rating between 1 and 5),
  reaction_notes text,
  is_surprise boolean default false,
  tags text[] default '{}',
  ai_suggested boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Suggestions
create table public.suggestions (
  id uuid default uuid_generate_v4() primary key,
  relationship_id uuid references public.relationships(id) on delete cascade not null,
  trigger_type text not null,
  trigger_context text,
  suggestion_type text not null,
  title text not null,
  body text not null,
  suggested_date date,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'snoozed', 'completed')),
  snoozed_until date,
  created_at timestamptz default now()
);

-- Agent Tasks (new table for browser agent)
create table public.agent_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  relationship_id uuid references public.relationships(id) on delete set null,
  task_type text not null check (task_type in ('research_gifts', 'book_reservation', 'order_flowers', 'order_gift', 'custom')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  instructions jsonb not null,
  context jsonb default '{}',
  result jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.relationships enable row level security;
alter table public.events enable row level security;
alter table public.preferences enable row level security;
alter table public.gifts enable row level security;
alter table public.suggestions enable row level security;
alter table public.agent_tasks enable row level security;

-- RLS Policies (user can only access their own data)
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

create policy "Users can view own relationships" on public.relationships for all using (user_id = auth.uid());
create policy "Users can manage own events" on public.events for all using (
  relationship_id in (select id from public.relationships where user_id = auth.uid())
);
create policy "Users can manage own preferences" on public.preferences for all using (
  relationship_id in (select id from public.relationships where user_id = auth.uid())
);
create policy "Users can manage own gifts" on public.gifts for all using (
  relationship_id in (select id from public.relationships where user_id = auth.uid())
);
create policy "Users can manage own suggestions" on public.suggestions for all using (
  relationship_id in (select id from public.relationships where user_id = auth.uid())
);
create policy "Users can manage own agent tasks" on public.agent_tasks for all using (user_id = auth.uid());

-- Indexes for common queries
create index idx_relationships_user on public.relationships(user_id) where not is_archived;
create index idx_events_next on public.events(next_occurrence) where is_active;
create index idx_events_relationship on public.events(relationship_id);
create index idx_gifts_relationship on public.gifts(relationship_id);
create index idx_gifts_status on public.gifts(status);
create index idx_suggestions_status on public.suggestions(status, priority);
create index idx_agent_tasks_status on public.agent_tasks(user_id, status);

-- Updated_at trigger
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_modtime before update on public.users for each row execute function update_modified_column();
create trigger update_relationships_modtime before update on public.relationships for each row execute function update_modified_column();
create trigger update_events_modtime before update on public.events for each row execute function update_modified_column();
create trigger update_gifts_modtime before update on public.gifts for each row execute function update_modified_column();
```

---

## Layer 3: Hetzner VPS — Browser Agent

### Concept

The Browser Agent is a headless browser automation service that acts on behalf of the user. When GiftMaster determines it's time to research gifts, make a reservation, or order flowers, it dispatches a task to the agent, which uses a real browser to interact with websites just like a human would.

### Why a VPS (not serverless)
- Browser automation needs persistent sessions and long-running processes
- Playwright/Puppeteer need a full browser binary installed
- Some tasks take 2-5 minutes (browsing multiple sites, comparing prices)
- Need to maintain authenticated sessions with third-party services
- VPS gives us full control over the environment and costs are predictable

### Recommended Hetzner Setup
- **Server**: CPX21 (3 vCPU, 4GB RAM, 80GB SSD) — ~€8/mo
- **OS**: Ubuntu 24.04 LTS
- **Location**: Closest to target user base (or Ashburn for US-centric services)

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Hetzner VPS                              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Agent API (Node.js/Express)            │  │
│  │                    Port 3001                         │  │
│  │                                                      │  │
│  │  POST /tasks         → Queue a new task              │  │
│  │  GET  /tasks/:id     → Check task status + result    │  │
│  │  POST /tasks/:id/cancel → Cancel running task        │  │
│  │  GET  /health        → Health check                  │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                          │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Task Queue (BullMQ + Redis)             │  │
│  │                                                      │  │
│  │  - Concurrency: 2 (max 2 browsers at once)          │  │
│  │  - Retry: 2 attempts with backoff                   │  │
│  │  - Timeout: 5 minutes per task                      │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                          │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Task Workers (Playwright)                │  │
│  │                                                      │  │
│  │  ┌────────────────┐  ┌─────────────────────────┐     │  │
│  │  │ Gift Researcher│  │ Reservation Booker      │     │  │
│  │  │                │  │                         │     │  │
│  │  │ - Amazon       │  │ - OpenTable             │     │  │
│  │  │ - Etsy         │  │ - Resy                  │     │  │
│  │  │ - Nordstrom    │  │ - Yelp Reservations     │     │  │
│  │  │ - Uncommon     │  │                         │     │  │
│  │  │   Goods        │  │                         │     │  │
│  │  └────────────────┘  └─────────────────────────┘     │  │
│  │                                                      │  │
│  │  ┌────────────────┐  ┌─────────────────────────┐     │  │
│  │  │ Flower Orderer │  │ Custom Task Runner      │     │  │
│  │  │                │  │                         │     │  │
│  │  │ - 1-800-Flowers│  │ - Claude-guided browser │     │  │
│  │  │ - FTD          │  │   for arbitrary tasks   │     │  │
│  │  │ - Local florist│  │                         │     │  │
│  │  │   sites        │  │                         │     │  │
│  │  └────────────────┘  └─────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Claude API (Brain)                      │  │
│  │                                                      │  │
│  │  - Interprets task instructions                     │  │
│  │  - Decides which sites to visit                     │  │
│  │  - Evaluates search results against preferences     │  │
│  │  - Makes gift recommendations with reasoning        │  │
│  │  - Guides the browser through complex flows         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Credential Vault (encrypted)            │  │
│  │                                                      │  │
│  │  User-provided account credentials for:              │  │
│  │  - Restaurant reservation platforms                  │  │
│  │  - Flower delivery services                         │  │
│  │  - Shopping accounts                                │  │
│  │  Encrypted at rest, decrypted only during task      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Agent Task Flow

```
1. User (or suggestion engine) triggers a task in the PWA
   e.g., "Research birthday gift ideas for Sarah, budget $50-$100"

2. PWA creates agent_task record in Supabase with:
   {
     task_type: "research_gifts",
     instructions: {
       person_name: "Sarah",
       occasion: "birthday",
       budget_min: 50,
       budget_max: 100
     },
     context: {
       personality: { mbti: "INFP", love_language: "receiving_gifts" },
       preferences: [
         { category: "hobbies", type: "like", value: "watercolor painting" },
         { category: "books", type: "like", value: "fantasy novels" },
         { category: "food", type: "dislike", value: "dark chocolate" }
       ],
       past_gifts: [
         { title: "Watercolor brush set", reaction_rating: 5 },
         { title: "Generic gift card", reaction_rating: 2 }
       ]
     }
   }

3. Supabase Edge Function triggers webhook to Hetzner Agent API

4. Agent API queues the task:
   a. Claude API analyzes the context and generates search strategy:
      "Sarah is an INFP who loves watercolor painting and fantasy novels.
       She rated a brush set 5/5 but a generic card 2/5.
       Search for: artisanal watercolor supplies, fantasy art prints,
       book-themed gifts. Avoid generic items."

   b. Playwright opens browser sessions:
      - Search Amazon for "watercolor supplies gift set" ($50-$100)
      - Search Etsy for "fantasy art watercolor" ($50-$100)
      - Search Uncommon Goods for "artist gifts" ($50-$100)

   c. Claude evaluates results against preferences:
      "This custom fantasy watercolor palette ($78) scores high:
       matches her painting hobby AND fantasy interest.
       Personalized, not generic. Recommend with high confidence."

   d. Returns structured results:
      [
        { title, url, price, image, confidence_score, reasoning },
        { title, url, price, image, confidence_score, reasoning },
        { title, url, price, image, confidence_score, reasoning }
      ]

5. Results written back to agent_task.result in Supabase

6. PWA shows results as suggestion cards:
   "🎁 We found 3 gift ideas for Sarah's birthday"
   Each card shows: product image, title, price, and WHY it's a good match
```

### VPS Setup Script

```bash
#!/bin/bash
# Run on fresh Ubuntu 24.04 Hetzner VPS

# System updates
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Playwright system dependencies
npx playwright install-deps
npx playwright install chromium

# Install Redis (for BullMQ task queue)
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Create app directory
mkdir -p /opt/giftmaster-agent
cd /opt/giftmaster-agent

# Initialize project
npm init -y
npm install express bullmq ioredis playwright dotenv helmet cors
npm install @anthropic-ai/sdk  # Claude API client

# Create systemd service
cat > /etc/systemd/system/giftmaster-agent.service << 'EOF'
[Unit]
Description=GiftMaster Browser Agent
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/giftmaster-agent
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl enable giftmaster-agent

# Firewall — only allow HTTPS (agent API) and SSH
ufw allow 22/tcp
ufw allow 443/tcp
ufw enable

# SSL via Let's Encrypt (requires a domain pointed to VPS IP)
# apt install -y certbot
# certbot certonly --standalone -d agent.giftmaster.app
```

### Agent API Skeleton

```javascript
// server.js — Agent API entry point
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

// Task queue
const taskQueue = new Queue('agent-tasks', { connection: redis });

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json());

// Auth middleware — validates Supabase service role JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Verify against Supabase JWT secret
  // ... implementation
  next();
};

// Queue a new task
app.post('/tasks', authenticate, async (req, res) => {
  const { task_type, instructions, context, supabase_task_id } = req.body;
  const job = await taskQueue.add(task_type, {
    task_type,
    instructions,
    context,
    supabase_task_id
  }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 5 * 60 * 1000 // 5 minute timeout
  });
  res.json({ job_id: job.id, status: 'queued' });
});

// Check task status
app.get('/tasks/:id', authenticate, async (req, res) => {
  const job = await taskQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Task not found' });
  const state = await job.getState();
  res.json({
    id: job.id,
    status: state,
    result: job.returnvalue,
    error: job.failedReason,
    progress: job.progress
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', queue_size: taskQueue.count() });
});

app.listen(3001, () => console.log('Agent API running on :3001'));

// Task worker
const worker = new Worker('agent-tasks', async (job) => {
  const { task_type, instructions, context, supabase_task_id } = job.data;

  // Update Supabase task status to 'in_progress'
  await updateSupabaseTask(supabase_task_id, { status: 'in_progress', started_at: new Date() });

  let result;
  switch (task_type) {
    case 'research_gifts':
      result = await researchGifts(instructions, context, job);
      break;
    case 'book_reservation':
      result = await bookReservation(instructions, context, job);
      break;
    case 'order_flowers':
      result = await orderFlowers(instructions, context, job);
      break;
    case 'custom':
      result = await customTask(instructions, context, job);
      break;
    default:
      throw new Error(`Unknown task type: ${task_type}`);
  }

  // Update Supabase with results
  await updateSupabaseTask(supabase_task_id, {
    status: 'completed',
    result,
    completed_at: new Date()
  });

  return result;
}, {
  connection: redis,
  concurrency: 2
});
```

### Security Considerations

- **Agent API is NOT public** — only accessible from Supabase Edge Functions via service role key
- **User credentials**: encrypted at rest with per-user encryption keys derived from their Supabase auth token
- **Browser sessions**: isolated per task, destroyed after completion
- **No credential storage in the PWA** — credentials for third-party services are entered once and stored encrypted on the VPS only
- **Rate limiting**: Max 10 tasks per user per day (premium), 2 concurrent per user
- **Audit log**: Every browser action is logged with screenshots at key steps
- **Task approval**: High-value actions (purchases over $X) require user confirmation via push notification before the agent completes the transaction

---

## Deployment Checklist

### Today (Workshop)
- [ ] Deploy PWA to Vercel (connect GitHub repo)
- [ ] Create Supabase project
- [ ] Run schema migration (tables + RLS + indexes)
- [ ] Add Supabase env vars to Vercel
- [ ] Verify PWA installs from Vercel URL

### This Week (Post-Workshop)
- [ ] Provision Hetzner VPS
- [ ] Install Playwright + Redis + Node.js
- [ ] Deploy Agent API skeleton
- [ ] Set up SSL with Let's Encrypt
- [ ] Connect Supabase Edge Function → Agent API webhook
- [ ] Test first agent task (gift research)

### Before Public Launch
- [ ] Custom domain on Vercel (giftmaster.app or similar)
- [ ] Stripe integration for premium subscriptions
- [ ] Agent credential vault with encryption
- [ ] Monitoring + alerting (Uptime Robot, Sentry)
- [ ] Privacy policy + Terms of Service
- [ ] GDPR data deletion pipeline
