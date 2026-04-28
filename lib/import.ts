import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_PATH, RUFINO_PATH } from "./vault";

const INBOX_DIR = path.join(VAULT_PATH, "inbox", "sources");
const PENDING_DIR = path.join(VAULT_PATH, "_meta", "ingest-pending");
const APPLIED_DIR = path.join(VAULT_PATH, "_meta", "ingest-applied");
const DISCARDED_DIR = path.join(VAULT_PATH, "_meta", "ingest-discarded");

export type IngestSourceKind = "file" | "url" | "text";
export type IngestStatus = "pending" | "applied" | "discarded";

export interface IngestPlanCreate {
  id: string;
  /** Where the new file will be written, relative to the vault */
  path: string;
  /** Entity kind (drives the icon/tag in the UI) */
  kind: "source" | "concepto" | "persona" | "nota";
  /** First N chars of the body — for preview in the review screen */
  preview: string;
  /** Full body content to be written on apply */
  body: string;
}

export interface IngestPlanUpdate {
  id: string;
  /** Vault-relative path of the file to be patched */
  path: string;
  /** Human label for the file (h1 or filename) */
  target: string;
  /** Lines to append to the bottom of the file (we keep it simple in v0.2) */
  appendLines: string[];
  /** Diff preview (rendered with simple `+` lines) */
  diff: { type: "ctx" | "add"; text: string }[];
}

export interface IngestPlanTriple {
  s: string;
  sKind: "source" | "concepto" | "persona" | "proyecto" | "nota";
  r: string;
  o: string;
  oKind: "source" | "concepto" | "persona" | "proyecto" | "nota";
  /** Where the triple will be written (the subject's vault path) */
  appendTo: string;
}

/** Lifecycle of the plan-generation step itself, distinct from the plan's
 * apply status. The heuristic plan is written immediately ("ready"), but if
 * we're upgrading via LLM async, we mark "generating" and flip to "ready" or
 * "failed" once the async job finishes. The /import/[id] UI polls this. */
export type PlanGenerationStatus = "generating" | "ready" | "failed";

export interface IngestPlan {
  id: string;
  status: IngestStatus;
  /** Generation status of the plan itself (pending LLM upgrade vs ready). */
  planStatus?: PlanGenerationStatus;
  /** Inbox file path (relative to vault) — used by the LLM upgrader. */
  inboxPath?: string;
  /** Error message if planStatus = "failed". */
  error?: string;
  createdAt: string;
  source: { kind: IngestSourceKind; original: string; bytes: number };
  title: string;
  subtitle: string | null;
  meta: string;
  create: IngestPlanCreate[];
  update: IngestPlanUpdate[];
  triples: IngestPlanTriple[];
}

async function ensureDirs(): Promise<void> {
  await Promise.all([
    fs.mkdir(INBOX_DIR, { recursive: true }),
    fs.mkdir(PENDING_DIR, { recursive: true }),
    fs.mkdir(APPLIED_DIR, { recursive: true }),
    fs.mkdir(DISCARDED_DIR, { recursive: true }),
  ]);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "source";
}

function extractH1(body: string): string | null {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function extractWikilinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]*)?\]\]/g)) {
    const id = m[1].trim().split("/").pop();
    if (id) out.add(id);
  }
  return Array.from(out);
}

function summarize(body: string, max = 240): string {
  const text = body
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/^#+\s+.*$/gm, "")
    .replace(/[\[\]`*_>]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/**
 * Produce a v0.2 plan from the raw body via simple heuristics. Real
 * Claude-driven planning lands later; this is enough for the UI flow.
 */
export function buildPlanFromBody(opts: {
  id: string;
  source: IngestPlan["source"];
  body: string;
  /** Existing entity ids in the vault — used to suggest references */
  knownEntities: string[];
}): IngestPlan {
  const { id, source, body, knownEntities } = opts;
  const knownSet = new Set(knownEntities);

  const h1 = extractH1(body);
  const title = h1 ?? source.original.replace(/\.[^.]+$/, "") ?? "documento";
  const slug = slugify(title);
  const summary = summarize(body);

  const sourceFilePath = `rufino/sources/${slug}.md`;

  const sourceBody =
    `---\n` +
    `tags:\n  - tipo/source\n  - source/${slug}\n` +
    `created: ${new Date().toISOString().slice(0, 10)}\n` +
    `updated: ${new Date().toISOString().slice(0, 10)}\n` +
    `source_kind: ${source.kind}\n` +
    `source_original: ${source.original}\n` +
    `---\n\n` +
    `# ${title}\n\n` +
    `## Resumen\n${summary || "_(sin resumen)_"}\n\n` +
    `## Contenido original\n${body.replace(/^---[\s\S]*?---\n/, "")}\n`;

  const create: IngestPlanCreate[] = [
    {
      id: "c-source",
      path: sourceFilePath,
      kind: "source",
      preview: summary || `Documento importado de ${source.original}.`,
      body: sourceBody,
    },
  ];

  // Find references to existing entities via wikilinks
  const links = extractWikilinks(body).filter((l) => knownSet.has(l));
  const triples: IngestPlanTriple[] = links.map((target) => ({
    s: slug,
    sKind: "source",
    r: "references",
    o: target,
    oKind: guessKind(target),
    appendTo: sourceFilePath,
  }));

  // No "update" suggestions in v0.2 — that's where the LLM would shine.
  // We keep the slot and the UI tab so the data shape matches the design.
  const update: IngestPlanUpdate[] = [];

  return {
    id,
    status: "pending",
    planStatus: "ready",
    createdAt: new Date().toISOString(),
    source,
    title,
    subtitle: null,
    meta: `Heurístico · ${create.length} entidades a crear, ${update.length} a updatear, ${triples.length} conexiones`,
    create,
    update,
    triples,
  };
}

function guessKind(id: string): IngestPlanTriple["oKind"] {
  if (id.startsWith("decision")) return "nota";
  if (id.startsWith("aprendizaje")) return "nota";
  if (id.startsWith("persona/")) return "persona";
  if (id.startsWith("proyecto/")) return "proyecto";
  return "nota";
}

export async function listKnownEntities(): Promise<string[]> {
  const out = new Set<string>();
  await collectMd(path.join(VAULT_PATH, "conceptos"), out);
  await collectMd(path.join(RUFINO_PATH, "_people"), out);
  const proyectos = path.join(VAULT_PATH, "proyectos");
  const entries = await fs.readdir(proyectos, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith("_")) {
      out.add(e.name);
      await collectMd(path.join(proyectos, e.name, "decisiones"), out);
      await collectMd(path.join(proyectos, e.name, "aprendizajes"), out);
    }
  }
  const rufinoEntries = await fs.readdir(RUFINO_PATH, { withFileTypes: true }).catch(() => []);
  for (const e of rufinoEntries) {
    if (e.isDirectory() && !e.name.startsWith("_")) {
      const sub = await fs.readdir(path.join(RUFINO_PATH, e.name), { withFileTypes: true }).catch(() => []);
      for (const s of sub) {
        if (s.isDirectory()) {
          await collectMd(path.join(RUFINO_PATH, e.name, s.name), out);
        } else if (s.isFile() && s.name.endsWith(".md") && !s.name.startsWith("_")) {
          out.add(path.basename(s.name, ".md"));
        }
      }
    }
  }
  return Array.from(out);
}

async function collectMd(dir: string, out: Set<string>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) {
      out.add(path.basename(e.name, ".md"));
    }
  }
}

export async function writeInbox(
  filename: string,
  contents: string,
): Promise<{ inboxPath: string; bytes: number }> {
  await ensureDirs();
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const inboxName = `${timestamp()}-${safe}`;
  const inboxPath = path.join(INBOX_DIR, inboxName);
  await fs.writeFile(inboxPath, contents);
  return { inboxPath, bytes: Buffer.byteLength(contents) };
}

export async function savePendingPlan(plan: IngestPlan): Promise<void> {
  await ensureDirs();
  const file = path.join(PENDING_DIR, `${plan.id}.json`);
  await fs.writeFile(file, JSON.stringify(plan, null, 2));
}

export async function readPendingPlan(id: string): Promise<IngestPlan | null> {
  for (const dir of [PENDING_DIR, APPLIED_DIR, DISCARDED_DIR]) {
    const file = path.join(dir, `${id}.json`);
    try {
      const raw = await fs.readFile(file, "utf-8");
      return JSON.parse(raw) as IngestPlan;
    } catch {
      /* try next dir */
    }
  }
  return null;
}

export async function listImports(): Promise<IngestPlan[]> {
  const out: IngestPlan[] = [];
  for (const [dir, status] of [
    [PENDING_DIR, "pending" as const],
    [APPLIED_DIR, "applied" as const],
    [DISCARDED_DIR, "discarded" as const],
  ] satisfies Array<[string, IngestStatus]>) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir, e.name), "utf-8");
        const plan = JSON.parse(raw) as IngestPlan;
        plan.status = status;
        out.push(plan);
      } catch {
        /* skip corrupt */
      }
    }
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

export async function applyPlan(
  id: string,
  selected: { create: string[]; update: string[]; triples: number[] },
): Promise<{ writes: string[]; tripleCount: number }> {
  const plan = await readPendingPlan(id);
  if (!plan) throw new Error(`plan not found: ${id}`);
  if (plan.status !== "pending") throw new Error(`plan already ${plan.status}`);

  const writes: string[] = [];

  // 1) Create new files
  for (const item of plan.create) {
    if (!selected.create.includes(item.id)) continue;
    const dest = path.resolve(VAULT_PATH, item.path);
    const rel = path.relative(VAULT_PATH, dest);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, item.body);
    writes.push(item.path);
  }

  // 2) Append updates
  for (const item of plan.update) {
    if (!selected.update.includes(item.id)) continue;
    const dest = path.resolve(VAULT_PATH, item.path);
    const rel = path.relative(VAULT_PATH, dest);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    let raw = "";
    try {
      raw = await fs.readFile(dest, "utf-8");
    } catch {
      continue;
    }
    const out = raw.trimEnd() + "\n\n" + item.appendLines.join("\n") + "\n";
    await fs.writeFile(dest, out);
    writes.push(item.path);
  }

  // 3) Append triples to subject files
  let tripleCount = 0;
  for (let i = 0; i < plan.triples.length; i++) {
    if (!selected.triples.includes(i)) continue;
    const t = plan.triples[i];
    const dest = path.resolve(VAULT_PATH, t.appendTo);
    const rel = path.relative(VAULT_PATH, dest);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    let raw: string;
    try {
      raw = await fs.readFile(dest, "utf-8");
    } catch {
      continue;
    }
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const existing: Array<{ r: string; o: string }> = Array.isArray(data.triples)
      ? (data.triples as Array<Record<string, unknown>>)
          .filter((x) => typeof x.r === "string" && typeof x.o === "string")
          .map((x) => ({ r: String(x.r), o: String(x.o) }))
      : [];
    if (!existing.some((e) => e.r === t.r && e.o === t.o)) {
      existing.push({ r: t.r, o: t.o });
      data.triples = existing;
      data.updated = new Date().toISOString().slice(0, 10);
      const out = matter.stringify(parsed.content, data);
      await fs.writeFile(dest, out);
    }
    tripleCount++;
  }

  // Move plan to applied/
  const oldFile = path.join(PENDING_DIR, `${id}.json`);
  const newFile = path.join(APPLIED_DIR, `${id}.json`);
  await fs.mkdir(APPLIED_DIR, { recursive: true });
  plan.status = "applied";
  await fs.writeFile(newFile, JSON.stringify(plan, null, 2));
  await fs.unlink(oldFile).catch(() => {});

  return { writes, tripleCount };
}

export async function discardPlan(id: string): Promise<void> {
  const plan = await readPendingPlan(id);
  if (!plan) throw new Error(`plan not found: ${id}`);
  const oldFile = path.join(PENDING_DIR, `${id}.json`);
  const newFile = path.join(DISCARDED_DIR, `${id}.json`);
  await fs.mkdir(DISCARDED_DIR, { recursive: true });
  plan.status = "discarded";
  await fs.writeFile(newFile, JSON.stringify(plan, null, 2));
  await fs.unlink(oldFile).catch(() => {});
}
