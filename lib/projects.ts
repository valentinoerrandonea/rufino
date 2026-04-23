import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_PATH, RUFINO_PATH } from "./vault";

const PROJECTS_PATH = path.join(VAULT_PATH, "proyectos");

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  decisionesCount: number;
  aprendizajesCount: number;
  notesCount: number;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string;
  overviewContent: string;
  decisiones: string[];
  aprendizajes: string[];
  noteIds: string[];
};

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

async function countFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).length;
}

async function listMdFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.basename(e.name, ".md"));
}

function extractDescription(content: string): string {
  // Try "## Qué es" section first
  const queEsMatch = content.match(/##\s+Qué\s+es\s*\n([\s\S]*?)(?=\n##|$)/);
  if (queEsMatch) {
    const lines = queEsMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(0, 2).join(" ");
  }
  // Fallback: first non-header, non-empty paragraph
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

export async function listProjects(): Promise<ProjectSummary[]> {
  const entries = await fs.readdir(PROJECTS_PATH, { withFileTypes: true }).catch(() => []);
  const projects: ProjectSummary[] = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const id = e.name;
    const overviewPath = path.join(PROJECTS_PATH, id, "overview.md");
    const raw = await readSafe(overviewPath);
    if (!raw) continue;

    const { content } = matter(raw);

    // Extract project name from first h1
    const h1Match = content.match(/^#\s+(.+)$/m);
    const name = h1Match ? h1Match[1].trim() : id;

    const description = extractDescription(content);

    const [decisionesCount, aprendizajesCount, notesCount] = await Promise.all([
      countFiles(path.join(PROJECTS_PATH, id, "decisiones")),
      countFiles(path.join(PROJECTS_PATH, id, "aprendizajes")),
      countRufinoNotes(id),
    ]);

    projects.push({ id, name, description, decisionesCount, aprendizajesCount, notesCount });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readProjectOverview(id: string): Promise<ProjectDetail | null> {
  const overviewPath = path.join(PROJECTS_PATH, id, "overview.md");
  const raw = await readSafe(overviewPath);
  if (!raw) return null;

  const { content } = matter(raw);

  const h1Match = content.match(/^#\s+(.+)$/m);
  const name = h1Match ? h1Match[1].trim() : id;

  const description = extractDescription(content);
  const overviewContent = content.replace(/^#\s+.+$/m, "").trim();

  const [decisiones, aprendizajes, noteIds] = await Promise.all([
    listMdFiles(path.join(PROJECTS_PATH, id, "decisiones")),
    listMdFiles(path.join(PROJECTS_PATH, id, "aprendizajes")),
    listRufinoNoteIds(id),
  ]);

  return { id, name, description, overviewContent, decisiones, aprendizajes, noteIds };
}

export async function readProjectFolders(id: string) {
  const [decisiones, aprendizajes, noteIds] = await Promise.all([
    listMdFiles(path.join(PROJECTS_PATH, id, "decisiones")),
    listMdFiles(path.join(PROJECTS_PATH, id, "aprendizajes")),
    listRufinoNoteIds(id),
  ]);
  return { decisiones, aprendizajes, noteIds };
}
