"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeRawNote, appendTodo, writePersonFile, VAULT_PATH } from "@/lib/vault";
import {
  updateTodoFieldsInFile,
  updateTodoInFile,
  updateTodoProjectInFile,
} from "@/lib/todos";
import { triggerProcessor } from "@/lib/processor";
import { appendLogEntry } from "@/lib/log";
import { ignoreIssue } from "@/lib/lint";
import {
  applyPlan,
  buildPlanFromBody,
  discardPlan,
  listKnownEntities,
  savePendingPlan,
  writeInbox,
  type IngestPlan,
  type IngestSourceKind,
} from "@/lib/import";

type TodoState = "todo" | "done";

interface ToggleTodoParams {
  origin: string;
  desc: string;
  currentState: TodoState;
  nextState: TodoState;
}

export async function toggleTodoState(params: ToggleTodoParams): Promise<void> {
  const { origin, desc, nextState } = params;
  await updateTodoInFile({ origin, desc, nextState });
  revalidatePath("/");
  revalidatePath("/pendientes");
}

interface MoveTodoProjectParams {
  origin: string;
  desc: string;
  newProjectArista: string;
}

export async function moveTodoProject(params: MoveTodoProjectParams): Promise<void> {
  await updateTodoProjectInFile(params);
  revalidatePath("/");
  revalidatePath("/pendientes");
}

interface UpdateTodoFieldsParams {
  origin: string;
  desc: string;
  newDesc: string;
  newPeople: string;
  newDeadline?: string;
}

export async function updateTodoFields(params: UpdateTodoFieldsParams): Promise<void> {
  await updateTodoFieldsInFile(params);
  revalidatePath("/");
  revalidatePath("/pendientes");
}

export async function createNote(formData: FormData): Promise<void> {
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const firstLine = body.split("\n").find((l) => l.trim()) || "nota";
  const slug = firstLine
    .slice(0, 60)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const base = slug || `nota-${Date.now()}`;
  const filename = `${base}-${Date.now().toString().slice(-6)}.md`;

  await writeRawNote(filename, body);

  // Fire the processor in the background — it will pick up this note (and any
  // others waiting in the inbox) and process them asynchronously. The script
  // itself handles locking to avoid concurrent runs.
  triggerProcessor();

  revalidatePath("/");
  revalidatePath("/notes");
  redirect("/notes");
}

export async function createTodo(formData: FormData): Promise<void> {
  const desc = String(formData.get("desc") || "").trim();
  const projectArista = String(formData.get("projectArista") || "general").trim();
  const peopleStr = String(formData.get("people") || "").trim();
  const deadline = String(formData.get("deadline") || "").trim() || null;
  const priority = String(formData.get("priority") || "media") as "alta" | "media" | "baja";

  if (!desc) return;

  const people = peopleStr
    .split(/[\s,]+/)
    .map((p) => p.replace(/^@/, ""))
    .filter(Boolean);

  await appendTodo({ desc, projectArista, people, deadline, priority });
  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect("/pendientes");
}

/**
 * Save edited content back to a file in the vault.
 * Guards: only accepts paths inside VAULT_PATH (prevents path traversal).
 */
export async function saveFileContent(params: {
  /** Path relative to the vault root (e.g., "rufino/general/tech/foo.md" or "perfil.md") */
  relativePath: string;
  content: string;
  /** Paths to revalidate (e.g., ["/notes/foo", "/notes"]) */
  revalidate?: string[];
}): Promise<void> {
  const { relativePath, content, revalidate = [] } = params;

  // Normalize and validate
  const target = path.resolve(VAULT_PATH, relativePath);
  const rel = path.relative(VAULT_PATH, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid path: outside vault");
  }

  // Ensure the file exists (only edit, not create-new-anywhere)
  try {
    await fs.access(target);
  } catch {
    throw new Error(`File not found: ${relativePath}`);
  }

  await fs.writeFile(target, content, "utf-8");
  await appendLogEntry({ op: "edit", slug: relativePath });
  for (const p of revalidate) revalidatePath(p);
}

/**
 * Move a file or directory inside the vault to `_trash/<timestamp>/<original-path>`.
 *
 * Soft-delete by design: we never `rm -rf` inside the vault. If Val ever needs
 * something back she can pull it from `_trash/`. To purge for real she empties
 * `_trash/` manually.
 */
export async function trashItem(params: {
  relativePath: string;
  revalidate?: string[];
  redirectTo?: string;
}): Promise<void> {
  const { relativePath, revalidate = [], redirectTo } = params;

  const target = path.resolve(VAULT_PATH, relativePath);
  const rel = path.relative(VAULT_PATH, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid path: outside vault");
  }
  if (rel === "" || rel === "_trash" || rel.startsWith("_trash/")) {
    throw new Error("Cannot trash this path");
  }

  try {
    await fs.access(target);
  } catch {
    throw new Error(`Not found: ${relativePath}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_");
  const dest = path.join(VAULT_PATH, "_trash", stamp, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rename(target, dest);

  await appendLogEntry({
    op: "delete",
    slug: relativePath,
    summary: `movido a _trash/${path.relative(VAULT_PATH, path.dirname(dest))}/`,
  });

  for (const p of revalidate) revalidatePath(p);
  if (redirectTo) redirect(redirectTo);
}

export async function createPerson(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const relation = String(formData.get("relation") || "").trim();
  const rol = String(formData.get("rol") || "").trim();
  const projectsStr = String(formData.get("projects") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!name) return;

  const id = name
    .toLowerCase()
    .split(/\s+/)[0]
    .replace(/[^a-z]/g, "")
    .slice(0, 20);

  const projects = projectsStr
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  await writePersonFile({ id, name, relation, rol, projects, bio });
  revalidatePath("/");
  revalidatePath("/people");
  redirect("/people");
}

/**
 * Apply a lint action — ignore the issue, create a stub concept page, etc.
 *
 * Right now we wire only the safe-and-easy actions (ignore, create_concept_page,
 * create_person_page); link_notes / mark_replacement raise an error with a
 * "no implementado" message. The lint corrida can keep flagging them; they
 * just won't auto-resolve from the UI yet.
 */
export async function applyLintAction(params: {
  issueId: string;
  kind: string;
  actionParams?: Record<string, unknown>;
  redirectTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { issueId, kind, actionParams, redirectTo } = params;

  if (kind === "ignore") {
    await ignoreIssue(issueId);
    revalidatePath("/salud");
    return { ok: true };
  }

  if (kind === "create_concept_page") {
    const id = String(actionParams?.id ?? "").trim();
    if (!id) return { ok: false, error: "missing concept id" };
    const dest = path.resolve(VAULT_PATH, "conceptos", `${id}.md`);
    const rel = path.relative(VAULT_PATH, dest);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return { ok: false, error: "invalid path" };
    }
    try {
      await fs.access(dest);
      // already exists — just ignore the issue
      await ignoreIssue(issueId);
      revalidatePath("/salud");
      return { ok: true };
    } catch {
      /* missing, will create */
    }
    const today = new Date().toISOString().slice(0, 10);
    const mentions = Number(actionParams?.mentions ?? 0);
    const stub =
      `---\n` +
      `tags:\n  - tipo/concepto\n  - concepto/${id}\n` +
      `created: ${today}\nupdated: ${today}\n` +
      `mentions: ${mentions}\n---\n\n` +
      `# ${id}\n\n` +
      `## Definición\n_(stub auto-creado por lint pass · 2026-04-27)_\n\n` +
      `## Notas adicionales\n\n\n## Sources\n_(auto-managed)_\n`;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, stub);
    await ignoreIssue(issueId);
    revalidatePath("/salud");
    revalidatePath("/memory/conceptos");
    if (redirectTo) redirect(redirectTo);
    return { ok: true };
  }

  if (kind === "create_person_page") {
    const id = String(actionParams?.id ?? "").trim();
    const name = String(actionParams?.name ?? id).trim();
    if (!id) return { ok: false, error: "missing person id" };
    const dest = path.resolve(VAULT_PATH, "rufino", "_people", `${id}.md`);
    const rel = path.relative(VAULT_PATH, dest);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return { ok: false, error: "invalid path" };
    }
    try {
      await fs.access(dest);
      await ignoreIssue(issueId);
      revalidatePath("/salud");
      return { ok: true };
    } catch {
      /* missing */
    }
    const today = new Date().toISOString().slice(0, 10);
    const stub =
      `---\n` +
      `tags:\n  - tipo/persona\n  - persona/${id}\n` +
      `created: ${today}\nupdated: ${today}\n---\n\n` +
      `# ${name}\n\n## Contexto\n\n\n## Relación\n\n\n## Proyectos\n\n\n## Menciones en notas\n_(auto-managed)_\n`;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, stub);
    await ignoreIssue(issueId);
    revalidatePath("/salud");
    revalidatePath("/people");
    return { ok: true };
  }

  return {
    ok: false,
    error: `Acción "${kind}" todavía no implementada — usá la opción de ignorar mientras tanto.`,
  };
}

/**
 * Trigger a lint pass via Claude Code. v0.2 stub: returns a not-implemented
 * message. Real streaming impl lands in a follow-up release; the cron-based
 * weekly pass is the production path for now.
 */
export async function runLintNow(): Promise<{ ok: false; error: string }> {
  return {
    ok: false,
    error:
      "El lint manual desde el dashboard se conecta en un release próximo. Por ahora el cron del domingo a las 22:00 corre el pass.",
  };
}

/**
 * Submit a document for ingestion. Writes the raw payload to
 * `vault/inbox/sources/<timestamp>-<safeName>`, builds a plan via
 * heuristics (real Claude integration lands later), persists the plan to
 * `_meta/ingest-pending/<id>.json`, and returns its id.
 *
 * For URLs we fetch server-side; the caller should pass a real URL.
 */
export async function submitImport(payload: {
  kind: IngestSourceKind;
  filename?: string;
  body?: string;
  url?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    let body = payload.body ?? "";
    let filename = payload.filename ?? "untitled.md";

    if (payload.kind === "url") {
      if (!payload.url) return { ok: false, error: "URL vacía" };
      const r = await fetch(payload.url, { redirect: "follow" });
      if (!r.ok) return { ok: false, error: `fetch falló (${r.status})` };
      body = await r.text();
      // Strip HTML tags for a baseline plain-text view; real readability
      // extraction is a v0.3 thing.
      body = body
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      filename = (payload.url.split("/").pop() || "url").replace(/\W+/g, "-").slice(0, 40) + ".txt";
    }

    if (!body.trim()) return { ok: false, error: "documento vacío" };

    const id = "imp-" + Date.now().toString(36);
    const inbox = await writeInbox(filename, body);

    const known = await listKnownEntities();
    const plan: IngestPlan = buildPlanFromBody({
      id,
      source: { kind: payload.kind, original: filename, bytes: inbox.bytes },
      body,
      knownEntities: known,
    });
    await savePendingPlan(plan);

    revalidatePath("/import");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al procesar el documento",
    };
  }
}

export async function applyImport(params: {
  id: string;
  selected: { create: string[]; update: string[]; triples: number[] };
}): Promise<{ ok: true; writes: string[]; tripleCount: number } | { ok: false; error: string }> {
  try {
    const r = await applyPlan(params.id, params.selected);
    await appendLogEntry({
      op: "import",
      slug: `_meta/ingest-applied/${params.id}.json`,
      summary: `${r.writes.length} files writes · ${r.tripleCount} triples`,
    });
    revalidatePath("/import");
    revalidatePath("/grafo");
    revalidatePath("/actividad");
    return { ok: true, writes: r.writes, tripleCount: r.tripleCount };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al aplicar el plan",
    };
  }
}

export async function discardImport(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await discardPlan(id);
    revalidatePath("/import");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al descartar",
    };
  }
}
