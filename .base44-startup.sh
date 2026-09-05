#!/usr/bin/env bash
set -e

export DENO_DIR="/root/.base44/.deno"
export DENO_INSTALL="$DENO_DIR"
export PATH="$DENO_INSTALL/bin:$PATH"

# Install Deno binary directly (skip slow installer-shell-setup post-install)
if ! command -v deno &>/dev/null; then
  echo "[base44-setup] Installing Deno..."
  mkdir -p "$DENO_INSTALL/bin"
  curl -fsSL -o /tmp/deno.zip "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip"
  unzip -o /tmp/deno.zip -d "$DENO_INSTALL/bin" >/dev/null
  rm -f /tmp/deno.zip
  chmod +x "$DENO_INSTALL/bin/deno"
fi
deno --version

# Install Base44 CLI (cached in mounted volume)
if ! command -v base44 &>/dev/null; then
  echo "[base44-setup] Installing Base44 CLI..."
  npm install -g base44@latest 2>&1 | tail -3
fi

# Install npm dependencies (skip if already installed)
if [ ! -d /app/node_modules ]; then
  echo "[base44-setup] Installing npm dependencies..."
  cd /app
  npm install 2>&1 | tail -5
else
  echo "[base44-setup] node_modules already present, skipping npm install"
fi

# Create .app.jsonc with app ID
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
