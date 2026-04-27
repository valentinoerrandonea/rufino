#!/bin/bash
set -euo pipefail

# Always restart on crash — the daemon should never stay down.

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NODE_ENV=production
export PORT=3737
export RUFINO_VAULT_PATH="${RUFINO_VAULT_PATH:-/Users/val/Files/vaultlentino}"

LOGFILE="$(pwd)/logs/rufino-dashboard.log"
mkdir -p "$(dirname "$LOGFILE")"
echo "=== Rufino dashboard starting: $(date) ===" >> "$LOGFILE"

exec npm run start >> "$LOGFILE" 2>&1
