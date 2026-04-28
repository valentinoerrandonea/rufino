import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_PATH, RUFINO_PATH, readPeople, readTodos } from "./vault";

const PROJECTS_PATH = path.join(VAULT_PATH, "proyectos");

/**
 * Resolve the overview file for a project. The current convention is
 * `proyectos/<id>/<id>Overview.md` (so wikilinks like [[umbruOverview]]
 * resolve by basename). Older vaults used `proyectos/<id>/overview.md`,
 * so we fall back to that for backwards compat.
 */
async function readProjectOverviewRaw(id: string): Promise<string | null> {
  const newConvention = path.join(PROJECTS_PATH, id, `${id}Overview.md`);
  const legacy = path.join(PROJECTS_PATH, id, "overview.md");
  const raw = await readSafe(newConvention);
  if (raw != null) return raw;
  return readSafe(legacy);
}

export type EntryPreview = {
  id: string;
  title: string;
  when: string | null;
};

export type ProjectSummary = {
  id: string;
  name: string;
  subtitle: string | null;
  blurb: string;
  description: string;
  decisionesCount: number;
  aprendizajesCount: number;
  notesCount: number;
  pendientesCount: number;
  lastActivity: string | null;
  peopleInitials: string[];
};

export type ProjectDetail = {
  id: string;
  name: string;
  subtitle: string | null;
  blurb: string;
  description: string;
  overviewContent: string;
  decisiones: string[];
  aprendizajes: string[];
  noteIds: string[];
  decisionEntries: EntryPreview[];
  lessonEntries: EntryPreview[];
  pendientesCount: number;
  lastActivity: string | null;
  peopleInitials: string[];
};

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

async function listMdFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.basename(e.name, ".md"));
}

function splitNameSubtitle(h1: string): { name: string; subtitle: string | null } {
  // H1 patterns observed: "Name — Subtitle", "Name - Subtitle", "Name"
  const m = h1.match(/^(.+?)\s+[—-]\s+(.+)$/);
  if (m) return { name: m[1].trim(), subtitle: m[2].trim() };
  return { name: h1.trim(), subtitle: null };
}

function extractDescription(content: string): string {
  const queEsMatch = content.match(/##\s+Qué\s+es\s*\n([\s\S]*?)(?=\n##|$)/);
  if (queEsMatch) {
    const lines = queEsMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(0, 2).join(" ");
  }
  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  return lines.slice(0, 2).join(" ");
}

async function countRufinoNotes(projectId: string): Promise<number> {
  const dir = path.join(RUFINO_PATH, projectId);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  let count = 0;
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) {
      count++;
    } else if (e.isDirectory()) {
      const sub = await fs.readdir(path.join(dir, e.name), { withFileTypes: true }).catch(() => []);
      count += sub.filter((f) => f.isFile() && f.name.endsWith(".md") && !f.name.startsWith("_")).length;
    }
  }
  return count;
}

async function listRufinoNoteIds(projectId: string): Promise<string[]> {
  const dir = path.join(RUFINO_PATH, projectId);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const ids: string[] = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) {
      ids.push(path.basename(e.name, ".md"));
    } else if (e.isDirectory()) {
      const sub = await fs.readdir(path.join(dir, e.name), { withFileTypes: true }).catch(() => []);
      for (const f of sub) {
        if (f.isFile() && f.name.endsWith(".md") && !f.name.startsWith("_")) {
          ids.push(path.basename(f.name, ".md"));
        }
      }
    }
  }
  return ids;
}

async function readEntries(dir: string): Promise<EntryPreview[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: EntryPreview[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const filePath = path.join(dir, e.name);
    const raw = (await readSafe(filePath)) ?? "";
    const { data, content } = matter(raw);
    const id = path.basename(e.name, ".md");

    const h1Match = content.match(/^#\s+(.+)$/m);
    let title = h1Match ? h1Match[1].trim() : id;
    title = title
      .replace(/^Decisi[óo]n:\s*/i, "")
      .replace(/^Aprendizaje:\s*/i, "")
      .trim();

    const updated = data.updated != null ? String(data.updated) : null;
    const created = data.created != null ? String(data.created) : null;
    const when = updated ?? created;

    out.push({ id, title, when });
  }
  out.sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));
  return out;
}

function initialsFor(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const v of values) {
    if (!v) continue;
    if (!best || v > best) best = v;
  }
  return best;
}

async function projectActivityFloor(id: string, overviewUpdated: string | null): Promise<string | null> {
  const decisionsDir = path.join(PROJECTS_PATH, id, "decisiones");
  const lessonsDir = path.join(PROJECTS_PATH, id, "aprendizajes");
  const [decisions, lessons] = await Promise.all([
    readEntries(decisionsDir),
    readEntries(lessonsDir),
  ]);
  const all = [overviewUpdated, ...decisions.map((d) => d.when), ...lessons.map((l) => l.when)];
  return maxIso(all);
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const entries = await fs.readdir(PROJECTS_PATH, { withFileTypes: true }).catch(() => []);
  const dirIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const [people, todos] = await Promise.all([readPeople(), readTodos()]);

  const projects: ProjectSummary[] = [];
  for (const id of dirIds) {
    const raw = await readProjectOverviewRaw(id);
    if (!raw) continue;

    const { data, content } = matter(raw);
    const h1Match = content.match(/^#\s+(.+)$/m);
    const h1 = h1Match ? h1Match[1].trim() : id;
    const { name, subtitle } = splitNameSubtitle(h1);

    const blurb = extractDescription(content);

    const [decisionesCount, aprendizajesCount, notesCount] = await Promise.all([
      listMdFiles(path.join(PROJECTS_PATH, id, "decisiones")).then((a) => a.length),
      listMdFiles(path.join(PROJECTS_PATH, id, "aprendizajes")).then((a) => a.length),
      countRufinoNotes(id),
    ]);

    const overviewUpdated = data.updated != null ? String(data.updated) : null;
    const lastActivity = await projectActivityFloor(id, overviewUpdated);

    const peopleInitials = people
      .filter((p) => p.projects.includes(id))
      .map((p) => initialsFor(p.name));

    const pendientesCount = todos.porHacer.filter(
      (t) => t.projectArista === id || t.projectArista.startsWith(`${id}/`),
    ).length;

    projects.push({
      id,
      name,
      subtitle,
      blurb,
      description: blurb,
      decisionesCount,
      aprendizajesCount,
      notesCount,
      pendientesCount,
      lastActivity,
      peopleInitials,
    });
  }

  return projects.sort((a, b) => {
    const at = a.lastActivity ?? "";
    const bt = b.lastActivity ?? "";
    if (at !== bt) return bt.localeCompare(at);
    return a.name.localeCompare(b.name);
  });
}

export async function readProjectOverview(id: string): Promise<ProjectDetail | null> {
  const raw = await readProjectOverviewRaw(id);
  if (!raw) return null;

  const { data, content } = matter(raw);
  const h1Match = content.match(/^#\s+(.+)$/m);
  const h1 = h1Match ? h1Match[1].trim() : id;
  const { name, subtitle } = splitNameSubtitle(h1);

  const blurb = extractDescription(content);
  const overviewContent = content.replace(/^#\s+.+$/m, "").trim();

  const [decisionEntries, lessonEntries, noteIds, people, todos] = await Promise.all([
    readEntries(path.join(PROJECTS_PATH, id, "decisiones")),
    readEntries(path.join(PROJECTS_PATH, id, "aprendizajes")),
    listRufinoNoteIds(id),
    readPeople(),
    readTodos(),
  ]);

  const overviewUpdated = data.updated != null ? String(data.updated) : null;
  const lastActivity = maxIso([
    overviewUpdated,
    ...decisionEntries.map((d) => d.when),
    ...lessonEntries.map((l) => l.when),
  ]);

  const peopleInitials = people
    .filter((p) => p.projects.includes(id))
    .map((p) => initialsFor(p.name));

  const pendientesCount = todos.porHacer.filter(
    (t) => t.projectArista === id || t.projectArista.startsWith(`${id}/`),
  ).length;

  return {
    id,
    name,
    subtitle,
    blurb,
    description: blurb,
    overviewContent,
    decisiones: decisionEntries.map((d) => d.id),
    aprendizajes: lessonEntries.map((l) => l.id),
    noteIds,
    decisionEntries,
    lessonEntries,
    pendientesCount,
    lastActivity,
    peopleInitials,
  };
}

export async function readProjectFolders(id: string) {
  const [decisiones, aprendizajes, noteIds] = await Promise.all([
    listMdFiles(path.join(PROJECTS_PATH, id, "decisiones")),
    listMdFiles(path.join(PROJECTS_PATH, id, "aprendizajes")),
    listRufinoNoteIds(id),
  ]);
  return { decisiones, aprendizajes, noteIds };
}
