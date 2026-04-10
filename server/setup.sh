#!/bin/bash
# GiftMaster VPS Setup — Run on fresh Ubuntu 24.04
# Usage: ssh root@87.99.133.69 'bash -s' < setup.sh
#
# This script is idempotent — safe to re-run.
# It does NOT handle secrets. After running, you must:
#   1. Edit /opt/giftmaster-agent/.env with real API keys
#   2. Edit /root/.zeroclaw/config.toml with real API keys
#   3. Set up SSH keys manually (see server/README.md)

set -euo pipefail

echo "=========================================="
echo " GiftMaster VPS Setup"
echo " $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "=========================================="

# -------------------------------------------
# Phase 1 — System Basics
# -------------------------------------------
echo "[Phase 1] System basics..."

hostnamectl set-hostname giftmaster-agent
timedatectl set-timezone UTC

apt update && apt upgrade -y
apt install -y curl wget git build-essential pkg-config libssl-dev unzip

echo "[Phase 1] Done."

# -------------------------------------------
# Phase 2 — Node.js 20
# -------------------------------------------
echo "[Phase 2] Installing Node.js 20..."

if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

npm install -g pm2

echo "  Node: $(node --version)"
echo "  PM2:  $(pm2 --version)"
echo "[Phase 2] Done."

# -------------------------------------------
# Phase 3 — Redis
# -------------------------------------------
echo "[Phase 3] Installing Redis..."

apt install -y redis-server

# Ensure Redis binds to localhost only
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

echo "  Redis ping: $(redis-cli ping)"
echo "[Phase 3] Done."

# -------------------------------------------
# Phase 4 — Playwright
# -------------------------------------------
echo "[Phase 4] Installing Playwright + Chromium..."

npx -y playwright install-deps
npx -y playwright install chromium

echo "[Phase 4] Done."

# -------------------------------------------
# Phase 5 — Rust & ZeroClaw
# -------------------------------------------
echo "[Phase 5] Installing Rust & ZeroClaw..."

if ! command -v rustc &>/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
source "$HOME/.cargo/env"

if [ ! -d /opt/zeroclaw ]; then
  git clone https://github.com/zeroclaw-labs/zeroclaw.git /opt/zeroclaw
fi

cd /opt/zeroclaw
echo "  Building ZeroClaw (this takes several minutes on CPX11)..."
cargo build --release

cp target/release/zeroclaw /usr/local/bin/zeroclaw
mkdir -p /root/.zeroclaw

# Only write config if it doesn't exist (don't overwrite secrets)
if [ ! -f /root/.zeroclaw/config.toml ]; then
  cp /opt/giftmaster-agent/zeroclaw-config.toml /root/.zeroclaw/config.toml 2>/dev/null || true
  echo "  ZeroClaw config template copied to /root/.zeroclaw/config.toml"
  echo "  *** Edit it with real API keys before starting ZeroClaw ***"
fi

echo "[Phase 5] Done."

# -------------------------------------------
# Phase 6 — Agent API
# -------------------------------------------
echo "[Phase 6] Setting up Agent API..."

mkdir -p /opt/giftmaster-agent

# If repo files are present, copy them in
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/agent-api/package.json" ]; then
  cp -r "$SCRIPT_DIR/agent-api/"* /opt/giftmaster-agent/
  echo "  Copied agent-api files from repo."
fi

cd /opt/giftmaster-agent

# Only write .env if it doesn't exist (don't overwrite secrets)
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
  echo "  *** Edit /opt/giftmaster-agent/.env with real API keys ***"
fi

npm install --production

echo "[Phase 6] Done."

# -------------------------------------------
# Phase 7 — PM2 Process Management
# -------------------------------------------
echo "[Phase 7] Configuring PM2..."

cd /opt/giftmaster-agent
pm2 start ecosystem.config.js
pm2 startup -u root --hp /root
pm2 save

echo "[Phase 7] Done."

# -------------------------------------------
# Phase 8 — Nginx Reverse Proxy
# -------------------------------------------
echo "[Phase 8] Setting up Nginx..."

apt install -y nginx

cp "$SCRIPT_DIR/nginx/giftmaster-agent" /etc/nginx/sites-available/giftmaster-agent 2>/dev/null || true

ln -sf /etc/nginx/sites-available/giftmaster-agent /etc/nginx/sites-enabled/giftmaster-agent
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "[Phase 8] Done."

# -------------------------------------------
# Phase 9 — Firewall
# -------------------------------------------
echo "[Phase 9] Configuring firewall..."

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[Phase 9] Done."

# -------------------------------------------
# Verification
# -------------------------------------------
echo ""
echo "=========================================="
echo " Verification"
echo "=========================================="
echo "Node.js:    $(node --version)"
echo "Redis:      $(redis-cli ping)"
echo "PM2 list:"
pm2 list
echo ""
echo "Agent API:  $(curl -s http://localhost:3001/health || echo 'NOT RUNNING — check .env and restart with: pm2 restart all')"
echo "Nginx:      $(nginx -t 2>&1)"
echo "Firewall:   $(ufw status | head -5)"
echo "ZeroClaw:   $(which zeroclaw 2>/dev/null || echo 'NOT FOUND — check Phase 5')"
echo "Redis svc:  $(systemctl is-active redis-server)"
echo "Disk:       $(df -h / | tail -1)"
echo "Memory:     $(free -h | grep Mem)"
echo ""
echo "=========================================="
echo " NEXT STEPS"
echo "=========================================="
echo "1. Edit /opt/giftmaster-agent/.env — add real ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY, AGENT_SECRET"
echo "2. Edit /root/.zeroclaw/config.toml — add real Anthropic API key"
echo "3. Run: pm2 restart all"
echo "4. Set up SSH keys (see server/README.md)"
echo "5. Set up SSL with certbot (needs a domain pointed to this IP)"
echo "=========================================="
