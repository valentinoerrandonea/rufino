#!/bin/bash
set -euo pipefail

# Always restart on crash — the daemon should never stay down.

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NODE_ENV=production
export PORT=3737
export RUFINO_VAULT_PATH="${RUFINO_VAULT_PATH:-/Users/val/Files/vaultlentino}"

LOGFILE="$HOME/rufino-dashboard.log"
echo "=== Rufino dashboard starting: $(date) ===" >> "$LOGFILE"

exec npm run start >> "$LOGFILE" 2>&1
