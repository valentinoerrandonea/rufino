import fs from "node:fs/promises";
import path from "node:path";
import { VAULT_PATH } from "./vault";

export type LintSeverity = "high" | "medium" | "low";

export type LintActionKind =
  | "create_concept_page"
  | "create_person_page"
  | "link_notes"
  | "mark_replacement"
  | "view_note"
  | "ignore";

export interface LintIssue {
  id: string;
  type: string;
  severity: LintSeverity;
  /** Short title shown as the issue's main line. */
  title: string;
  /** Longer detail under the title. */
  detail: string;
  /** Paths/slugs the issue relates to — rendered as mono chips. */
  refs: string[];
  /** Primary action label + kind used by the action buttons. */
  action?: { kind: LintActionKind; label: string; params?: Record<string, unknown> };
}

export interface LintReport {
  ranAt: string;
  durationMs: number;
  issuesTotal: number;
  severityHigh: number;
  severityMedium: number;
  severityLow: number;
  /** Original file path within the vault (for reference). */
  source: string;
  /** Issues grouped by their `type` for the UI. */
  groups: { type: string; severity: LintSeverity; items: LintIssue[] }[];
}

const META_DIR = path.join(VAULT_PATH, "_meta");
const IGNORE_PATH = path.join(META_DIR, "lint-ignore.md");

async function listLintFiles(): Promise<string[]> {
  const entries = await fs.readdir(META_DIR, { withFileTypes: true }).catch(() => []);
  return entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.startsWith("lint-") &&
        e.name.endsWith(".json"),
    )
    .map((e) => path.join(META_DIR, e.name))
    .sort()
    .reverse();
}

export interface LintRunSummary {
  ranAt: string;
  issues: number;
  source: string;
}

export async function listLintRuns(): Promise<LintRunSummary[]> {
  const files = await listLintFiles();
  const out: LintRunSummary[] = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, "utf-8");
      const data = JSON.parse(raw) as RawLintFile;
      out.push({
        ranAt: data.ran_at,
        issues: (data.issues ?? []).length,
        source: file,
      });
    } catch {
      /* skip corrupt file */
    }
  }
  return out;
}

interface RawLintFile {
  ran_at: string;
  duration_ms?: number;
  issues?: Array<{
    id: string;
    type: string;
    severity: LintSeverity;
    title: string;
    detail: string;
    refs?: string[];
    action?: { kind: LintActionKind; label: string; params?: Record<string, unknown> };
  }>;
}

export async function readLatestLint(): Promise<LintReport | null> {
  const files = await listLintFiles();
  if (files.length === 0) return null;

  const ignored = await readIgnoredIds();

  for (const file of files) {
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf-8");
    } catch {
      continue;
    }
    let data: RawLintFile;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }

    const visible = (data.issues ?? []).filter((i) => !ignored.has(i.id));

    const groupsMap = new Map<string, LintIssue[]>();
    for (const it of visible) {
      const arr = groupsMap.get(it.type) ?? [];
      arr.push({
        id: it.id,
        type: it.type,
        severity: it.severity,
        title: it.title,
        detail: it.detail,
        refs: it.refs ?? [],
        action: it.action,
      });
      groupsMap.set(it.type, arr);
    }

    const groups = Array.from(groupsMap.entries()).map(([type, items]) => {
      // group severity = highest severity of any item in the group
      const sev: LintSeverity = items.some((i) => i.severity === "high")
        ? "high"
        : items.some((i) => i.severity === "medium")
          ? "medium"
          : "low";
      return { type, severity: sev, items };
    });

    // Sort groups by severity, high first
    const order: Record<LintSeverity, number> = { high: 0, medium: 1, low: 2 };
    groups.sort((a, b) => order[a.severity] - order[b.severity]);

    const sevCount = (s: LintSeverity) =>
      visible.filter((i) => i.severity === s).length;

    return {
      ranAt: data.ran_at,
      durationMs: data.duration_ms ?? 0,
      issuesTotal: visible.length,
      severityHigh: sevCount("high"),
      severityMedium: sevCount("medium"),
      severityLow: sevCount("low"),
      source: file,
      groups,
    };
  }

  return null;
}

async function readIgnoredIds(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(IGNORE_PATH, "utf-8");
    const ids = new Set<string>();
    for (const line of raw.split("\n")) {
      const m = line.match(/^-\s+(\S+)/);
      if (m) ids.add(m[1]);
    }
    return ids;
  } catch {
    return new Set();
  }
}

export async function ignoreIssue(issueId: string): Promise<void> {
  await fs.mkdir(META_DIR, { recursive: true });
  let existing = "";
  try {
    existing = await fs.readFile(IGNORE_PATH, "utf-8");
  } catch {
    existing = "# Lint issues marcados como ignorados\n\nUna línea por issue id. Si querés revivir uno, borralo de acá.\n\n";
  }
  if (!existing.includes(`- ${issueId}`)) {
    existing = existing.trimEnd() + `\n- ${issueId}\n`;
  }
  await fs.writeFile(IGNORE_PATH, existing);
}
