# GiftMaster Server — VPS Setup & Agent API

## Overview

This directory contains everything needed to set up the GiftMaster backend on a Hetzner VPS:

- **Agent API** — Node.js/Express service with BullMQ task queue and Playwright browser automation
- **ZeroClaw** — Rust messaging runtime for WhatsApp/Telegram reminders
- **Nginx** — Reverse proxy config
- **setup.sh** — Automated provisioning script

## Server Details

| | |
|---|---|
| **IP** | 87.99.133.69 |
| **OS** | Ubuntu 24.04 |
| **Spec** | CPX11 — 2 vCPU, 2GB RAM, 40GB SSD |
| **Location** | Ashburn, VA |

## Quick Start

### 1. Copy files to server

From your local machine (in the repo root):

```bash
scp -r server/agent-api/* root@87.99.133.69:/opt/giftmaster-agent/
scp server/nginx/giftmaster-agent root@87.99.133.69:/etc/nginx/sites-available/
scp server/zeroclaw/config.toml root@87.99.133.69:/root/.zeroclaw/config.toml
```

### 2. Run setup script

```bash
ssh root@87.99.133.69 'bash -s' < server/setup.sh
```

Or copy it over and run interactively:

```bash
scp server/setup.sh root@87.99.133.69:/tmp/setup.sh
ssh root@87.99.133.69
bash /tmp/setup.sh
```

### 3. Configure secrets

Edit `/opt/giftmaster-agent/.env` on the VPS:

```bash
ssh root@87.99.133.69
nano /opt/giftmaster-agent/.env
```

Fill in:
- `ANTHROPIC_API_KEY` — Your Anthropic API key
- `SUPABASE_SERVICE_KEY` — Supabase service role key (from Project Settings > API)
- `AGENT_SECRET` — A random shared secret (generate with `openssl rand -hex 32`)

Then restart:

```bash
pm2 restart all
```

### 4. Set up SSH keys (recommended)

On your **local machine**, generate a key and copy it to the server:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/giftmaster -N ""
ssh-copy-id -i ~/.ssh/giftmaster root@87.99.133.69
```

Then on the **server**, disable password auth:

```bash
ssh root@87.99.133.69
sed -i 's/^#*PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 5. SSL (needs a domain)

Point a domain (e.g., `agent.giftmaster.app`) to 87.99.133.69, then:

```bash
ssh root@87.99.133.69
apt install -y certbot python3-certbot-nginx
certbot --nginx -d agent.giftmaster.app
```

## Architecture

```
Internet
    |
    v
[Nginx :80/:443] --> [Agent API :3001] --> [BullMQ/Redis]
                                               |
                                               v
                                         [Playwright Workers]
                                               |
                                               v
                                         [Claude API + Browser]

[ZeroClaw] --> [WhatsApp/Telegram] <--> [Supabase]
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Queue status, memory, uptime |
| POST | `/tasks` | Bearer token | Queue a new agent task |
| GET | `/tasks/:id` | Bearer token | Check task status + result |
| POST | `/tasks/:id/cancel` | Bearer token | Cancel a queued/running task |

### Auth

All authenticated endpoints require:
```
Authorization: Bearer <AGENT_SECRET>
```

### Example: Queue a gift research task

```bash
curl -X POST http://87.99.133.69/tasks \
  -H "Authorization: Bearer YOUR_AGENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "research_gifts",
    "instructions": {
      "person_name": "Sarah",
      "occasion": "birthday",
      "budget_min": 50,
      "budget_max": 100
    },
    "context": {
      "personality": { "mbti": { "type": "INFP" }, "love_languages": { "primary": "receiving_gifts" } },
      "preferences": [
        { "category": "hobbies", "type": "like", "value": "watercolor painting" },
        { "category": "books", "type": "like", "value": "fantasy novels" }
      ]
    },
    "supabase_task_id": "uuid-from-supabase"
  }'
```

## Task Types

| Type | Status | Description |
|------|--------|-------------|
| `research_gifts` | Implemented | Claude + Playwright gift research |
| `book_reservation` | Stub | Restaurant booking via OpenTable/Resy |
| `order_flowers` | Stub | Flower delivery via 1-800-Flowers/FTD |
| `custom` | Stub | Claude-guided browser automation |

## PM2 Commands

```bash
pm2 list                    # See running processes
pm2 logs giftmaster-agent   # Stream logs
pm2 restart all             # Restart after config change
pm2 monit                   # Live monitoring dashboard
```

## Memory Budget (2GB VPS)

| Service | Estimated |
|---------|-----------|
| OS + system | ~400MB |
| Node.js (Agent API) | ~200MB |
| Redis | ~50MB |
| Playwright (1 browser) | ~500MB |
| ZeroClaw (Rust) | ~50MB |
| **Buffer** | ~800MB |

`MAX_CONCURRENT_BROWSERS=1` is set to stay within limits.
