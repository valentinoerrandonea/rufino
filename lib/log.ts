import fs from "node:fs/promises";
import path from "node:path";
import { VAULT_PATH } from "./vault";

export type LogOp = "ingest" | "edit" | "delete" | "lint-ok" | "lint-warn" | "import" | "remember";

export interface LogEntryInput {
  op: LogOp;
  /** Slug or path for the entry — what was acted on. e.g. "rufino/oiko/general/nota-X" */
  slug: string;
  /** Optional 1-2 line summary. Will be word-wrapped at write time. */
  summary?: string;
  /** Optional explicit ISO timestamp. Defaults to now. */
  at?: Date;
}

export interface LogEntry extends LogEntryInput {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
}

const LOG_PATH = path.join(VAULT_PATH, "_meta", "log.md");
const HEADER = "# Vault activity log\n\n";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmt(d: Date): { date: string; time: string; full: string } {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time, full: `${date} ${time}` };
}

export async function appendLogEntry(entry: LogEntryInput): Promise<void> {
  const at = entry.at ?? new Date();
  const { full } = fmt(at);

  const block =
    `## [${full}] ${entry.op} | ${entry.slug}\n` +
    (entry.summary ? `${entry.summary.trim()}\n\n` : "\n");

  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });

  let existing: string;
  try {
    existing = await fs.readFile(LOG_PATH, "utf-8");
  } catch {
    existing = HEADER;
  }
  if (!existing.startsWith("# ")) existing = HEADER + existing;

  await fs.writeFile(LOG_PATH, existing.trimEnd() + "\n\n" + block);
}

const ENTRY_RE = /^##\s+\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\]\s+(\S+)\s+\|\s+(.+?)\s*$/;

export async function readLogEntries(opts?: {
  limit?: number;
  ops?: LogOp[];
}): Promise<LogEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(LOG_PATH, "utf-8");
  } catch {
    return [];
  }

  const lines = raw.split("\n");
  const entries: LogEntry[] = [];
  let current: { date: string; time: string; op: LogOp; slug: string; summary: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    if (!opts?.ops || opts.ops.includes(current.op)) {
      entries.push({
        date: current.date,
        time: current.time,
        op: current.op,
        slug: current.slug,
        summary: current.summary.join("\n").trim() || undefined,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const m = line.match(ENTRY_RE);
    if (m) {
      flush();
      current = {
        date: m[1],
        time: m[2],
        op: m[3] as LogOp,
        slug: m[4],
        summary: [],
      };
    } else if (current && line.trim() && !line.startsWith("#")) {
      current.summary.push(line);
    }
  }
  flush();

  // Most recent first
  entries.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  return opts?.limit ? entries.slice(0, opts.limit) : entries;
}
