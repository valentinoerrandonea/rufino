import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { RUFINO_PATH } from "@/lib/vault";

const PROCESSOR_SCRIPT = path.join(
  os.homedir(),
  ".claude",
  "scripts",
  "rufino-cron.sh"
);
const LOCKFILE = path.join(RUFINO_PATH, ".processing.lock");

/**
 * Trigger the Rufino processor in the background. Fire-and-forget.
 *
 * The processor script itself handles locking (won't run if another instance
 * is already processing). This function spawns detached so the server action
 * returns immediately.
 */
export function triggerProcessor(): void {
  // Quick pre-check: if the lockfile exists and points to a live process, skip.
  if (fs.existsSync(LOCKFILE)) {
    try {
      const pid = Number.parseInt(fs.readFileSync(LOCKFILE, "utf-8").trim(), 10);
      if (Number.isFinite(pid)) {
        try {
          // kill -0 checks if the process exists without sending a signal
          process.kill(pid, 0);
          // Process is alive — already running
          return;
        } catch {
          // Stale lock — the script itself will clean it up on next start
        }
      }
    } catch {
      // Can't read lock, let the script handle it
    }
  }

  if (!fs.existsSync(PROCESSOR_SCRIPT)) {
    console.error(`[rufino-processor] script not found at ${PROCESSOR_SCRIPT}`);
    return;
  }

  const child = spawn("/bin/bash", [PROCESSOR_SCRIPT], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      RUFINO_VAULT_PATH:
        process.env.RUFINO_VAULT_PATH || "/Users/val/Files/vaultlentino",
    },
  });

  // Don't wait for child exit
  child.unref();
}

/**
 * Check if a processor run is currently in progress.
 */
export function isProcessorRunning(): boolean {
  if (!fs.existsSync(LOCKFILE)) return false;
  try {
    const pid = Number.parseInt(fs.readFileSync(LOCKFILE, "utf-8").trim(), 10);
    if (!Number.isFinite(pid)) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
