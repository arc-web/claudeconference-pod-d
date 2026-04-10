# GiftMaster — Messaging Layer (ZeroClaw)

## The Big Picture

GiftMaster has two interfaces:

1. **PWA (Web App)** — The configuration dashboard. Where users set up profiles, manage relationships, track gifts, and view history. Think of it as the "control panel."

2. **Messaging (ZeroClaw)** — The daily touchpoint. Where users receive reminders, suggestions, and can conversationally interact with GiftMaster through WhatsApp, Telegram, Signal, or any supported channel. Think of it as the "personal assistant."

The PWA is where you *build* your relationship knowledge base.
Messaging is where GiftMaster *uses* that knowledge to help you in the moment.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User's Day                                 │
│                                                                     │
│   Morning: Gets WhatsApp message                                    │
│   "Sarah's birthday is in 14 days! She's an INFP who loves         │
│    watercolor painting. Want me to find some gift ideas?"           │
│                                                                     │
│   User replies: "Yes, budget around $75"                            │
│                                                                     │
│   30 min later: "Found 3 options for Sarah:                         │
│    1. Custom fantasy watercolor palette ($78) ★★★★★                 │
│    2. Artisanal brush set with carrying case ($72) ★★★★             │
│    3. Online masterclass gift card — watercolor ($65) ★★★           │
│    Reply 1, 2, or 3 to save it, or 'more' for other ideas"         │
│                                                                     │
│   User replies: "1"                                                 │
│                                                                     │
│   "Saved! I'll remind you to order it 7 days before.               │
│    Want me to order it for you when the time comes?"                │
│                                                                     │
│   Evening: Opens PWA to add a few more preferences for Sarah        │
│   that came up in conversation at dinner                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      Hetzner VPS                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   ZeroClaw Runtime                           │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐     │  │
│  │  │  WhatsApp   │  │  Telegram   │  │  Signal / Other  │     │  │
│  │  │  Channel    │  │  Channel    │  │  Channels        │     │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘     │  │
│  │         │                │                  │               │  │
│  │         └────────────────┼──────────────────┘               │  │
│  │                          ▼                                  │  │
│  │              ┌───────────────────────┐                      │  │
│  │              │   GiftMaster Agent    │                      │  │
│  │              │   (Claude Sonnet)     │                      │  │
│  │              │                       │                      │  │
│  │              │   System prompt has:  │                      │  │
│  │              │   - User profile      │                      │  │
│  │              │   - Relationships     │                      │  │
│  │              │   - Preferences       │                      │  │
│  │              │   - Upcoming events   │                      │  │
│  │              │   - Gift history      │                      │  │
│  │              └───────────┬───────────┘                      │  │
│  │                          │                                  │  │
│  │              ┌───────────▼───────────┐                      │  │
│  │              │   Tool Calls          │                      │  │
│  │              │                       │                      │  │
│  │              │   - query_supabase    │                      │  │
│  │              │   - save_gift_idea    │                      │  │
│  │              │   - dispatch_agent    │                      │  │
│  │              │   - set_reminder      │                      │  │
│  │              │   - update_preference │                      │  │
│  │              └───────────────────────┘                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Browser Agent (Playwright + BullMQ)             │  │
│  │              (unchanged from INFRASTRUCTURE.md)              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Cron Scheduler                                  │  │
│  │                                                              │  │
│  │  Daily @ user's preferred time:                              │  │
│  │  1. Query Supabase for events approaching                   │  │
│  │  2. Run suggestion engine                                   │  │
│  │  3. Generate personalized messages via Claude                │  │
│  │  4. Send through user's preferred channel                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌────────────────────┐
│    Supabase      │          │  Meta Cloud API /  │
│  (data store)    │          │  Telegram Bot API  │
└──────────────────┘          └────────────────────┘
```

---

## ZeroClaw Configuration for GiftMaster

ZeroClaw runs on the same Hetzner VPS as the browser agent. It uses Claude as its AI brain, with a custom system prompt that has access to the user's relationship data.

### config.toml

```toml
api_key = "sk-ant-..."           # Claude API key
default_provider = "anthropic"
default_model = "anthropic/claude-sonnet-4-20250514"
default_temperature = 0.7

[memory]
backend = "sqlite"
auto_save = true

[gateway]
require_pairing = true
allow_public_bind = false

[autonomy]
level = "supervised"             # requires confirmation for purchases
workspace_only = true

[channels_config.whatsapp]
access_token = "EAABx..."       # Meta Business API token
phone_number_id = "123456789"
verify_token = "giftmaster-verify-secret"
allowed_numbers = ["*"]          # managed per-user via Supabase

[channels_config.telegram]
token = "bot123456:ABC..."
allowed_users = ["*"]            # managed per-user via Supabase
```

### Multi-User Architecture

ZeroClaw is designed as a single-user agent. For GiftMaster (multi-user SaaS), we need a thin orchestration layer:

```
Incoming WhatsApp message from +1234567890
    │
    ▼
Gateway receives webhook
    │
    ▼
Orchestrator looks up user by phone number in Supabase
    │
    ▼
Loads user's context (relationships, events, preferences, history)
    │
    ▼
Constructs Claude system prompt with user's data
    │
    ▼
Routes to Claude with full context
    │
    ▼
Claude responds (may call tools: save_gift, dispatch_agent, etc.)
    │
    ▼
Response sent back through same channel
```

**Option A: Single ZeroClaw instance with custom routing**
- Modify the gateway to intercept messages and inject per-user context
- Simpler to deploy, but requires forking ZeroClaw or using its plugin system

**Option B: ZeroClaw as message transport only + custom agent logic**
- Use ZeroClaw channels for send/receive only
- Route all messages through our own Node.js agent service that handles multi-user context
- More flexible, easier to maintain, recommended for SaaS

We recommend **Option B** for production. ZeroClaw handles the messaging plumbing, and our agent service handles the intelligence.

---

## User Onboarding for Messaging

After the user completes PWA onboarding, they see a new step:

### "Stay connected" setup screen

```
┌─────────────────────────────────────────┐
│                                         │
│  📱 Get reminders where you already are │
│                                         │
│  Choose how GiftMaster reaches you:     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 💬  WhatsApp        [Connect]  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ✈️  Telegram         [Connect]  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🔒  Signal           [Connect]  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📨  SMS (coming soon) [Wait]   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Or skip — you'll get reminders in      │
│  the app instead.                       │
│                                         │
└─────────────────────────────────────────┘
```

**WhatsApp connection flow:**
1. User taps "Connect"
2. App shows: "Send 'CONNECT' to +1-XXX-XXX-XXXX on WhatsApp"
3. User sends the message from their phone
4. ZeroClaw receives it, extracts phone number
5. Supabase links this phone number to the user's account
6. Confirmation sent back: "Connected! I'll send you reminders here. Reply HELP anytime."

**Telegram connection flow:**
1. User taps "Connect"
2. App opens Telegram deep link: `t.me/GiftMasterBot?start=<user_token>`
3. User taps "Start" in Telegram
4. Bot receives the start command with user token
5. Supabase links Telegram user ID to account
6. Confirmation sent

---

## Message Types

### 1. Proactive Reminders (cron-triggered)

Sent at user's preferred time (default: 9 AM in their timezone).

**Event approaching (14 days):**
```
🎁 Sarah's birthday is in 14 days (April 24)!

She's turning 30 — that's a milestone! Based on what I know:
• She loves watercolor painting and fantasy novels
• Her love language is Receiving Gifts
• Last year she rated the brush set you got her 5/5 ⭐

Want me to research some gift ideas? Just reply "yes" with an
optional budget (e.g., "yes $75") or "skip" to handle it yourself.
```

**Event approaching (3 days — urgent):**
```
⚠️ Sarah's birthday is in 3 DAYS (Thursday)!

Have you sorted a gift? Here's where things stand:
✅ Gift idea saved: Custom fantasy watercolor palette ($78)
❌ Not yet purchased

Reply "order" and I'll handle it, or "done" if you've got it covered.
```

**Frequency nudge:**
```
💭 It's been 45 days since you surprised Sarah with something.

Her love language is Receiving Gifts — even something small means a lot.
A few quick ideas:
• Pick up her favorite flowers on the way home
• Leave a handwritten note somewhere she'll find it
• Order that book she mentioned wanting

Reply "done" after you do something and I'll log it for you!
```

**Love language nudge:**
```
💬 Quick thought: Alex's love language is Words of Affirmation.

Consider sending them a message today about something specific
you appreciate about them. Not "you're great" — something real,
like "I noticed how you handled that situation with patience."

Reply "done" when you've sent it and I'll note it. 👍
```

### 2. Conversational Queries (user-initiated)

Users can message GiftMaster anytime:

```
User: "What does Sarah like?"

GiftMaster: "Here's what I have for Sarah:

Loves: Watercolor painting, fantasy novels (especially Sanderson),
dark roast coffee, hiking, indie folk music

Doesn't like: Dark chocolate, loud restaurants, synthetic fabrics

Her sizes: S tops, 7 shoes, ring size 6

Anything you want to add or update?"
```

```
User: "Sarah just mentioned she wants to try pottery"

GiftMaster: "Added! I've saved 'pottery' as a new interest for Sarah.
This opens up some great gift possibilities — pottery class vouchers,
a beginner's kit, or studio time. I'll factor this into future
suggestions. 🏺"
```

```
User: "What should I get my mom for mother's day?"

GiftMaster: "Mother's Day is May 11 (32 days away). Here's what I
know about your mom:

She's an ISFJ who values Acts of Service. Last year you got her a
spa gift card (rated 4/5) and the year before, flowers (3/5).

Based on her personality, she'd probably appreciate something that
shows you put thought into it rather than just money. A few angles:
1. Something handmade or personalized
2. An experience you do together (her love language!)
3. Something for her garden (she mentioned wanting new planters)

Want me to research any of these directions? Reply with a number
or tell me your budget."
```

### 3. Agent Task Updates (browser agent results)

```
GiftMaster: "🔍 Gift research complete for Sarah's birthday!

I searched Amazon, Etsy, and Uncommon Goods. Here are my top picks:

1. ⭐ Custom Fantasy Watercolor Palette — Etsy ($78)
   28 colors inspired by fantasy landscapes. Handmade by an
   independent artist. Perfect match for her painting + fantasy combo.

2. 'Watercolor Dreams' Workshop — Skillshare ($65/year)
   Online classes with fantasy illustration focus.
   She can learn at her own pace.

3. Leather-Bound Fantasy Art Journal — Uncommon Goods ($72)
   Handbound with watercolor-friendly paper.
   250 pages, travel-sized.

My recommendation: #1 — it combines her two biggest interests
and she rated similar gifts 5/5 in the past.

Reply 1, 2, or 3 to save it. Reply "order 1" and I'll purchase it.
Reply "more" to keep searching."
```

### 4. Status / Administrative

```
GiftMaster: "📋 Your week ahead:

Mon: Nothing scheduled
Tue: Nothing scheduled
Wed: Mom's birthday (2 days!) — Gift: Personalized garden planter (purchased ✅)
Thu: Nothing scheduled
Fri: Date night reminder (you set this monthly)
Sat: Friend Jake's housewarming party
Sun: Father's Day is next week — want to start planning?

Reply a day for details, or 'plan sunday' to start on Father's Day."
```

---

## Messaging-Specific Supabase Tables

Add these to the existing schema from INFRASTRUCTURE.md:

```sql
-- User messaging channel connections
create table public.user_channels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  channel_type text not null check (channel_type in ('whatsapp', 'telegram', 'signal', 'discord', 'slack', 'sms')),
  channel_identifier text not null,    -- phone number, telegram user ID, etc.
  is_verified boolean default false,
  is_primary boolean default false,    -- primary channel for proactive messages
  connection_token text,               -- one-time token for linking
  connected_at timestamptz,
  last_message_at timestamptz,
  preferences jsonb default '{}'::jsonb,  -- per-channel prefs (quiet hours, frequency)
  created_at timestamptz default now()
);

-- Ensure one primary channel per user
create unique index idx_user_primary_channel on public.user_channels(user_id) where is_primary = true;
create unique index idx_channel_identifier on public.user_channels(channel_type, channel_identifier);

-- Message log (for conversation continuity)
create table public.message_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  channel_type text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null check (message_type in ('reminder', 'suggestion', 'query', 'response', 'agent_update', 'admin')),
  content text not null,
  metadata jsonb default '{}',         -- parsed intent, referenced relationship, etc.
  created_at timestamptz default now()
);

-- Scheduled messages (cron queue)
create table public.scheduled_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  channel_type text,                   -- null = use primary channel
  scheduled_for timestamptz not null,
  message_type text not null,
  content_template text not null,      -- template with {placeholders}
  context jsonb default '{}',          -- data to fill template
  status text default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  error text,
  created_at timestamptz default now()
);

create index idx_scheduled_pending on public.scheduled_messages(scheduled_for) where status = 'pending';

-- RLS
alter table public.user_channels enable row level security;
alter table public.message_log enable row level security;
alter table public.scheduled_messages enable row level security;

create policy "Users manage own channels" on public.user_channels for all using (user_id = auth.uid());
create policy "Users view own messages" on public.message_log for select using (user_id = auth.uid());
create policy "Users manage own scheduled" on public.scheduled_messages for all using (user_id = auth.uid());
```

---

## What Changes in the PWA

### Settings Page — New "Messaging" Section

```
Messaging & Notifications
├── Connected Channels
│   ├── WhatsApp: +1-555-123-4567 ✅ (primary)
│   ├── Telegram: @username ✅
│   └── [+ Connect another channel]
├── Message Preferences
│   ├── Daily reminder time: [9:00 AM ▼]
│   ├── Weekly summary: [Sunday ▼]
│   ├── Suggestion frequency: [Daily ▼]
│   └── Quiet hours: [10 PM — 8 AM]
├── Message Types (toggle each)
│   ├── Event reminders: ✅
│   ├── Gift suggestions: ✅
│   ├── Love language nudges: ✅
│   ├── Frequency nudges: ✅
│   └── Weekly summary: ✅
└── [Disconnect all channels]
```

### Onboarding — New Optional Step (after Step 9)

Step 10: "Connect messaging" — channel selector + connection flow.
This is optional and skippable. The app works fine without it.

### Dashboard — Connection Prompt

If no messaging channel is connected, show a non-intrusive card:
"📱 Get reminders on WhatsApp — never miss a moment"
[Connect now] [Maybe later]

---

## VPS Resource Planning

Running on the same Hetzner CPX21 (3 vCPU, 4GB RAM):

| Service | Memory | CPU | Notes |
|---------|--------|-----|-------|
| ZeroClaw | ~50MB | Minimal | Rust binary, extremely lightweight |
| Agent API (Node.js) | ~200MB | Burst | Idle most of the time |
| Playwright browsers | ~500MB each | High during tasks | Max 2 concurrent |
| Redis | ~50MB | Minimal | Task queue + session cache |
| Cron scheduler | ~30MB | Minimal | Runs daily checks |
| **Total peak** | **~1.3GB** | **Moderate** | Well within 4GB limit |

ZeroClaw's Rust runtime is the reason this all fits on a single $8/mo VPS. A Node.js equivalent would need 2-3x the memory.

---

## Implementation Priority

### Today (Workshop) — No ZeroClaw work needed
The PWA is the priority. ZeroClaw integration is a post-workshop task.
However, the onboarding should be DESIGNED with a messaging step in mind.

### This Week
1. Provision Hetzner VPS
2. Install ZeroClaw (`cargo build --release`)
3. Configure WhatsApp Business API (Meta developer account)
4. Connect ZeroClaw to Supabase via custom tool calls
5. Build the cron scheduler for proactive messages
6. Test: single user, single reminder, WhatsApp delivery

### Next Month
1. Multi-user routing (Option B architecture)
2. Telegram channel addition
3. Conversational query handling (user asks questions via chat)
4. Agent task dispatch from messaging
5. Message template library
6. Analytics: delivery rates, response rates, task completion

---

## Key Insight

ZeroClaw solves the single biggest weakness in the original architecture: **reliable notifications**. Web Push is unreliable, requires the browser to be running, and has low engagement rates. WhatsApp messages have ~98% open rates and feel personal, not robotic.

The messaging layer transforms GiftMaster from "an app you have to remember to open" into "a personal assistant that reaches out to you at the right moment." That's the difference between a tool and a service.
