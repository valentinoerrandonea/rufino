#!/bin/bash
set -euo pipefail

LOGFILE="$HOME/Files/codeProjects/rufino-dashboard/logs/rufino-cron.log"
mkdir -p "$(dirname "$LOGFILE")"
PROMPT_FILE="$HOME/.claude/prompts/rufino-daily.md"
CLAUDE="$HOME/.local/bin/claude"
VAULT_PATH="${RUFINO_VAULT_PATH:-/Users/val/Files/vaultlentino}"
LOCKFILE="$VAULT_PATH/rufino/.processing.lock"

# Check lock: if a processor is already running, exit.
# Lockfile contains the PID. If the PID is dead, it's stale — delete and continue.
if [ -f "$LOCKFILE" ]; then
    LOCK_PID=$(cat "$LOCKFILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "=== Rufino skipped: already running (PID $LOCK_PID) at $(date) ===" >> "$LOGFILE"
        exit 0
    fi
    # Stale lock
    rm -f "$LOCKFILE"
fi

# Write our PID to lock
echo "$$" > "$LOCKFILE"

# Ensure lock is cleaned up on exit (success, error, or signal)
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
