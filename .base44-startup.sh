#!/usr/bin/env bash
set -e

echo "[base44-setup] Installing Deno..."
curl -fsSL https://deno.land/install.sh | DENO_DIR=/root/.deno sh
export DENO_INSTALL="/root/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
deno --version

echo "[base44-setup] Installing Base44 CLI..."
npm install -g base44@latest 2>&1 | tail -3

echo "[base44-setup] Installing npm dependencies..."
cd /app
npm install 2>&1 | tail -5

echo "[base44-setup] Creating .app.jsonc..."
APP_ID="${BASE44_APP_ID}"
if [ -z "$APP_ID" ]; then
  echo "[base44-setup] ERROR: BASE44_APP_ID env var is not set"
  exit 1
fi
mkdir -p /app/base44
cat > /app/base44/.app.jsonc <<EOF
// Base44 App Configuration
// This file links your local project to your Base44 app.
// Do not commit this file to version control.
{
  "id": "${APP_ID}"
}
EOF
echo "[base44-setup] .app.jsonc created with app id: ${APP_ID}"

echo "[base44-setup] Starting base44 dev..."
exec base44 dev
