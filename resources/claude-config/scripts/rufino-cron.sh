#!/bin/bash
# Rufino daily processor — runs Claude Code with the rufino-daily prompt to
# process new vault notes (augmentation, organization, todos, people).
#
# Installed automatically by the Rufino macOS app on first run. The crontab
# entry runs this script daily at 22:00.
set -euo pipefail

LOGFILE="$HOME/.local/state/rufino/cron.log"
mkdir -p "$(dirname "$LOGFILE")"

PROMPT_FILE="$HOME/.claude/prompts/rufino-daily.md"

# Resolve claude binary: prefer ~/.local/bin then standard locations.
if [ -x "$HOME/.local/bin/claude" ]; then
    CLAUDE="$HOME/.local/bin/claude"
elif command -v claude >/dev/null 2>&1; then
    CLAUDE="$(command -v claude)"
else
    echo "$(date) ERROR: claude not found in PATH" >> "$LOGFILE"
    exit 1
fi

# Vault path: env var overrides; otherwise use the path Rufino persisted to
# the user-data config (~/Library/Application Support/Rufino/config.json).
RUFINO_CONFIG="$HOME/Library/Application Support/Rufino/config.json"
if [ -z "${RUFINO_VAULT_PATH:-}" ] && [ -f "$RUFINO_CONFIG" ]; then
    RUFINO_VAULT_PATH=$(/usr/bin/python3 -c "import json,sys; print(json.load(open('$RUFINO_CONFIG')).get('vaultPath','') or '')" 2>/dev/null || echo "")
fi
RUFINO_VAULT_PATH="${RUFINO_VAULT_PATH:-$HOME/Documents/vault}"

if [ ! -d "$RUFINO_VAULT_PATH" ]; then
    echo "$(date) ERROR: vault not found at $RUFINO_VAULT_PATH" >> "$LOGFILE"
    exit 1
fi
export RUFINO_VAULT_PATH

LOCKFILE="$RUFINO_VAULT_PATH/rufino/.processing.lock"

# Stale-lock cleanup
if [ -f "$LOCKFILE" ]; then
    LOCK_PID=$(cat "$LOCKFILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "$(date) skipped: already running (PID $LOCK_PID)" >> "$LOGFILE"
        exit 0
    fi
    rm -f "$LOCKFILE"
fi

mkdir -p "$(dirname "$LOCKFILE")"
echo "$$" > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

echo "=== Rufino run: $(date) ===" >> "$LOGFILE"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "ERROR: Prompt file not found at $PROMPT_FILE" >> "$LOGFILE"
    exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")

"$CLAUDE" -p "$PROMPT" \
    --allowedTools "Read,Write,Edit,Glob,Grep,Bash" \
    --dangerously-skip-permissions \
    --model sonnet \
    >> "$LOGFILE" 2>&1

echo "=== Rufino done: $(date) ===" >> "$LOGFILE"
