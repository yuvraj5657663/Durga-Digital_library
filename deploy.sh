#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Durga Digital Library full production deploy / restart
#
# Run from the project root:   bash deploy.sh
# First-time setup:            bash deploy.sh --setup
#
# What it does:
#   1. Pull latest code from git
#   2. Install/update server dependencies
#   3. Install/update client dependencies
#   4. Build the React client (Vite → dist/)
#   5. Ensure the server .env exists and has the required keys
#   6. Create required directories (logs, uploads)
#   7. Start / reload PM2 (no downtime reload)
#   8. Copy nginx.conf and reload Nginx
#   9. Run a health check to confirm the server is responding
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"
NGINX_SITE="/etc/nginx/sites-available/durga-library"
NGINX_ENABLED="/etc/nginx/sites-enabled/durga-library"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ─── Preflight checks ────────────────────────────────────────────────────────
command -v node  >/dev/null 2>&1 || die "node not found. Install Node.js 18+."
command -v npm   >/dev/null 2>&1 || die "npm not found."
command -v pm2   >/dev/null 2>&1 || die "pm2 not found. Run: sudo npm install -g pm2"
command -v nginx >/dev/null 2>&1 || warn "nginx not found — skipping nginx config step."

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
[ "$NODE_MAJOR" -ge 18 ] || die "Node.js 18+ required. Found: $(node -v)"

# ─── 1. Check / create server .env ───────────────────────────────────────────
info "Checking server/.env …"
if [ ! -f "$SERVER_DIR/.env" ]; then
    warn "server/.env not found!"
    if [ -f "$SERVER_DIR/.env.production" ]; then
        cp "$SERVER_DIR/.env.production" "$SERVER_DIR/.env"
        warn "Copied .env.production → .env. EDIT IT NOW: nano $SERVER_DIR/.env"
        warn "Then re-run this script."
        exit 1
    else
        die "No .env or .env.production found. Create $SERVER_DIR/.env manually."
    fi
fi

# Verify critical keys are not placeholder values
MISSING=()
while IFS='=' read -r key val; do
    [[ "$key" =~ ^# || -z "$key" ]] && continue
    val="${val//\"/}"
    val="${val// /}"
    [[ "$val" == *"your_"* || "$val" == *"_here"* ]] && MISSING+=("$key")
done < "$SERVER_DIR/.env"

if [ ${#MISSING[@]} -gt 0 ]; then
    warn "The following .env keys still have placeholder values:"
    for k in "${MISSING[@]}"; do echo "  - $k"; done
    warn "Server may fail to start. Continue anyway? (y/N)"
    read -r answer
    [[ "$answer" =~ ^[Yy] ]] || exit 1
fi

# ─── 2. Pull latest code ──────────────────────────────────────────────────────
if [ -d "$PROJECT_DIR/.git" ]; then
    info "Pulling latest code …"
    git -C "$PROJECT_DIR" pull --ff-only || warn "git pull failed — continuing with current code"
fi

# ─── 3. Install server dependencies ──────────────────────────────────────────
info "Installing server dependencies …"
cd "$SERVER_DIR"
npm install --omit=dev --prefer-offline 2>&1 | tail -3

# ─── 4. Create required directories ──────────────────────────────────────────
info "Creating required directories …"
mkdir -p "$SERVER_DIR/logs" "$SERVER_DIR/uploads"

# ─── 5. Install client dependencies and build ─────────────────────────────────
info "Installing client dependencies …"
cd "$CLIENT_DIR"
npm install --prefer-offline 2>&1 | tail -3

info "Building React client …"
npm run build 2>&1 | tail -5
info "Client build complete → $CLIENT_DIR/dist/"

# ─── 6. Start / reload PM2 ────────────────────────────────────────────────────
cd "$SERVER_DIR"
info "Starting PM2 process …"

if pm2 describe durga-library-server > /dev/null 2>&1; then
    info "PM2 process exists — reloading (zero-downtime) …"
    pm2 reload ecosystem.config.js --env production --update-env
else
    info "Starting new PM2 process …"
    pm2 start ecosystem.config.js --env production
fi

pm2 save
info "PM2 process saved."

# ─── 7. Configure and reload Nginx ────────────────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
    info "Deploying Nginx config …"
    sudo cp "$PROJECT_DIR/nginx.conf" "$NGINX_SITE"
    if [ ! -L "$NGINX_ENABLED" ]; then
        sudo ln -sf "$NGINX_SITE" "$NGINX_ENABLED"
        info "Nginx site enabled."
    fi
    # Remove the default site if it exists (blocks port 80)
    [ -f /etc/nginx/sites-enabled/default ] && sudo rm /etc/nginx/sites-enabled/default && info "Removed nginx default site."
    sudo nginx -t && sudo systemctl reload nginx
    info "Nginx reloaded."
else
    warn "Nginx not found — skipping nginx config."
fi

# ─── 8. Health check ─────────────────────────────────────────────────────────
info "Waiting 8 seconds for server to start …"
sleep 8

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/health" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    info "✅ Server is responding (HTTP $HTTP_CODE)"
    info "Health check: http://localhost:3000/health"
else
    error "❌ Server not responding (HTTP $HTTP_CODE)"
    error "Check PM2 logs with:  pm2 logs durga-library-server --lines 50"
    error "Or view error log:    tail -50 $SERVER_DIR/logs/pm2-error.log"
    exit 1
fi

echo ""
info "─────────────────────────────────────────────────────"
info "✅  Deploy complete!"
info ""
info "PM2 status:    pm2 status"
info "PM2 logs:      pm2 logs durga-library-server --lines 100"
info "Nginx status:  sudo systemctl status nginx"
info "Health check:  curl http://localhost:3000/health"
info "API login:     curl -s -X POST http://localhost:3000/api/v1/auth/login \\"
info "                    -H 'Content-Type: application/json' \\"
info "                    -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
info "─────────────────────────────────────────────────────"
