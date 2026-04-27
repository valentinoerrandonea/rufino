import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_PATH, RUFINO_PATH } from "./vault";

const CONCEPTS_PATH = path.join(VAULT_PATH, "conceptos");

export type ConceptMention = {
  /** Note id used by the dashboard's notes route */
  id: string;
  /** Title pulled from the note's H1 */
  title: string;
  project: string | null;
  date: string | null;
};

export type ConceptSummary = {
  id: string;
  name: string;
  aliases: string[];
  definition: string;
  mentionsCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type ConceptDetail = ConceptSummary & {
  /** Body of the concept page minus the title — used by the editor */
  bodyContent: string;
  /** Notes that include `concepto/<id>` in their tags */
  mentions: ConceptMention[];
};

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

function firstLine(content: string, fallback = ""): string {
  const def = content.match(/##\s+Definici[óo]n\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (def) {
    const lines = def[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines[0]) return lines[0];
  }
  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  return lines[0] ?? fallback;
}

async function listConceptIds(): Promise<string[]> {
  const entries = await fs.readdir(CONCEPTS_PATH, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => path.basename(e.name, ".md"));
}

async function loadConcept(id: string): Promise<ConceptSummary | null> {
  const raw = await readSafe(path.join(CONCEPTS_PATH, `${id}.md`));
  if (!raw) return null;
  const { data, content } = matter(raw);

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const name = titleMatch ? titleMatch[1].trim() : id;

  const aliases = Array.isArray(data.aliases)
    ? (data.aliases as unknown[]).map((a) => String(a))
    : [];

  return {
    id,
    name,
    aliases,
    definition: firstLine(content, "Sin definición."),
    mentionsCount: typeof data.mentions === "number" ? data.mentions : 0,
    firstSeen: data.created != null ? String(data.created) : null,
    lastSeen: data.updated != null ? String(data.updated) : null,
  };
}

export async function listConcepts(): Promise<ConceptSummary[]> {
  const ids = await listConceptIds();
  const out = await Promise.all(ids.map((id) => loadConcept(id)));
  return out
    .filter((c): c is ConceptSummary => c !== null)
    .sort((a, b) => {
      const al = a.lastSeen ?? "";
      const bl = b.lastSeen ?? "";
      if (al !== bl) return bl.localeCompare(al);
      return a.name.localeCompare(b.name);
    });
}

async function findMentions(conceptId: string): Promise<ConceptMention[]> {
  // Walk rufino/<project>/<category>/<note>.md and collect notes whose
  // frontmatter tags include `concepto/<id>`.
  const out: ConceptMention[] = [];
  const tag = `concepto/${conceptId}`;

  async function walk(dir: string, project: string | null) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith("_")) continue;
        await walk(p, project ?? e.name);
      } else if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) {
        const raw = await readSafe(p);
        if (!raw) continue;
        const { data, content } = matter(raw);
        const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];
        if (!tags.includes(tag)) continue;
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : path.basename(e.name, ".md");
        const id = path.basename(e.name, ".md");
        const date = data.processed != null
          ? String(data.processed)
          : data.created != null
            ? String(data.created)
            : null;
        out.push({ id, title, project, date });
      }
    }
  }

  await walk(RUFINO_PATH, null);
  out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return out;
}

export async function readConcept(id: string): Promise<ConceptDetail | null> {
  const summary = await loadConcept(id);
  if (!summary) return null;

  const raw = (await readSafe(path.join(CONCEPTS_PATH, `${id}.md`))) ?? "";
  const { content } = matter(raw);
  const bodyContent = content.replace(/^#\s+.+$/m, "").trim();

  const mentions = await findMentions(id);

  return {
    ...summary,
    bodyContent,
    mentions,
  };
}
