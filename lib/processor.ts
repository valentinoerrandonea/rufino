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
const SINGLE_FILE_SCRIPT = path.join(
  os.homedir(),
  ".claude",
  "scripts",
  "rufino-process-single.sh"
);
const IMPORT_PLAN_SCRIPT = path.join(
  os.homedir(),
  ".claude",
  "scripts",
  "rufino-import-plan.sh"
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
 * Process a single file in the background. Fire-and-forget.
 *
 * Spawns rufino-process-single.sh with the target file path. The script
 * runs Claude Code with the rufino-process-single.md prompt, which does
 * full processing (augmentation, tagging, triples, concept promotion,
 * persona detection, pendientes extraction, indices) on that single file.
 *
 * Use this from server actions after writing a file with
 * `status: queued` in frontmatter. The processor will flip the status
 * to `processing` while it runs and `processed` when done.
 */
export function processFile(absoluteOrVaultRelativePath: string): void {
  if (!fs.existsSync(SINGLE_FILE_SCRIPT)) {
    console.error(
      `[rufino-processor] single-file script not found at ${SINGLE_FILE_SCRIPT}`,
    );
    return;
  }

  const child = spawn("/bin/bash", [SINGLE_FILE_SCRIPT, absoluteOrVaultRelativePath], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      RUFINO_VAULT_PATH:
        process.env.RUFINO_VAULT_PATH || "/Users/val/Files/vaultlentino",
    },
  });

  child.unref();
}

/**
 * Generate an import plan using Claude Code in the background.
 * Fire-and-forget — the plan JSON is written by the script to the same
 * path it received, with planStatus flipped from "generating" to "ready".
 *
 * Use this from submitImport after writing the heuristic draft plan.
 * The dashboard's /import/[id] page polls planStatus and shows a
 * "generando plan…" indicator while it's not yet "ready".
 */
export function planImport(inboxFilePath: string, planJsonPath: string): void {
  if (!fs.existsSync(IMPORT_PLAN_SCRIPT)) {
    console.error(
      `[rufino-processor] import plan script not found at ${IMPORT_PLAN_SCRIPT}`,
    );
    return;
  }

  const child = spawn(
    "/bin/bash",
    [IMPORT_PLAN_SCRIPT, inboxFilePath, planJsonPath],
    {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        RUFINO_VAULT_PATH:
          process.env.RUFINO_VAULT_PATH || "/Users/val/Files/vaultlentino",
      },
    },
  );

  child.unref();
}

/**
 * Synchronously generate a 1-3 sentence description for a pendiente given
 * its title and project context. Used by the create-todo server action
 * when the user submits without filling description manually.
 *
 * Calls `claude -p` with model haiku for speed (target <10s round-trip).
 * Returns empty string on failure — the caller should fall back to writing
 * the row without a description.
 */
export async function augmentTodoDescription(
  title: string,
  projectArista: string,
): Promise<string> {
  const claudePath = path.join(os.homedir(), ".local", "bin", "claude");
  if (!fs.existsSync(claudePath)) {
    return "";
  }

  const prompt = `Sos un asistente que escribe descripciones cortas y concretas para pendientes/tareas en un tracker personal.

CONTEXTO:
- Proyecto / arista: ${projectArista || "general"}
- Título del pendiente: "${title}"

TU TAREA: escribir UNA descripción para ese pendiente. Reglas:
- 1-3 oraciones máximo. Concreta y accionable.
- Detalle qué exactamente hay que hacer y bajo qué restricciones, si las podés inferir del título y proyecto.
- Si el título es genérico, expandilo con qué se busca lograr concretamente. Si ya es específico, agregá contexto/criterios sin redundar.
- Sin markdown, sin bullets, sin meta-comentarios. Solo el texto plano de la descripción.
- Español rioplatense, mismo registro que el título.

Devolvé SOLO el texto de la descripción. Nada más.`;

  // Use child_process.spawn directly to capture stdout while keeping things
  // simple. 25s timeout — Haiku usually returns in 3-8s.
  return new Promise((resolve) => {
    const child = spawn(
      claudePath,
      [
        "-p",
        prompt,
        "--allowedTools",
        "",
        "--dangerously-skip-permissions",
        "--model",
        "haiku",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve("");
    }, 25_000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve("");
        return;
      }
      // Claude sometimes wraps in quotes or adds trailing newlines
      const cleaned = stdout
        .trim()
        .replace(/^["']|["']$/g, "")
        .trim();
      resolve(cleaned);
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
  });
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
