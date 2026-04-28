import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const VAULT_PATH =
  process.env.RUFINO_VAULT_PATH || "/Users/val/Files/vaultlentino";
export const RUFINO_PATH = path.join(VAULT_PATH, "rufino");

export type ProcessedNote = {
  id: string; // relative path without extension
  filename: string;
  project: string;
  arista?: string;
  type: string;
  title: string;
  tags: string[];
  status: "processed" | "raw" | "queued" | "processing";
  created: string;
  processed?: string;
  /** fs mtime of the note file (ISO) — used for accurate ordering/relTime since `processed` is date-only */
  mtime: string;
  original: string; // raw content above the separator
  augmentation: string; // content below the separator
  body: string; // full body
  excerpt: string;
};

export type RawNote = {
  id: string;
  filename: string;
  body: string;
  createdAt: string;
  excerpt: string;
};

export type Todo = {
  id: string;
  state: "todo" | "done";
  /** Short, glanceable headline (new 8-col format). Falls back to `desc`
   * if not present (legacy todos that pre-date the title/description split). */
  title?: string;
  /** Longer detail (new 8-col format). New schema: extracted automatically
   * by the processor, editable later. Legacy todos store the whole string
   * in `desc`. */
  description?: string;
  /** Legacy field kept for backwards compat. New code should prefer
   * `title` (with `description` as detail). When reading: title ?? desc. */
  desc: string;
  projectArista: string;
  people: string[];
  deadline: string | null;
  origin: string;
  created: string;
  completed?: string;
};

export type Person = {
  id: string; // filename without .md
  name: string;
  relation?: string;
  rol?: string;
  projects: string[];
  mentions: number;
  bio?: string;
};

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

// Content-based stable ID for todos. Unique across a snapshot as long as
// (origin, desc) is unique — which it should be for todos derived from the
// same source. Used as React key; stays stable when a todo moves between
// sections.
function stableId(origin: string, desc: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  const o = slug(origin) || "none";
  const d = slug(desc);
  return `t_${o}__${d}`;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith("_")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function parseBody(body: string): { original: string; augmentation: string } {
  const parts = body.split(/^---\s*$/m);
  // First chunk (before first ---) is empty if frontmatter was stripped
  // Expect: [original, augmentation] (separator between them)
  if (parts.length >= 2) {
    return {
      original: parts[0].trim(),
      augmentation: parts.slice(1).join("---").trim(),
    };
  }
  return { original: body.trim(), augmentation: "" };
}

export async function readProcessedNotes(): Promise<ProcessedNote[]> {
  const files = await walk(RUFINO_PATH);
  const notes: ProcessedNote[] = [];
  for (const file of files) {
    const raw = await readSafe(file);
    if (!raw) continue;
    const { data, content } = matter(raw);
    // Include queued/processing in the list so the "procesando" badge is
    // visible while the processor is running (e.g. right after Val edits
    // a title — the file flips to queued and the processor takes a few
    // minutes to flip it back to processed). Without this, edited notes
    // disappear from /notes until processing finishes.
    if (
      data.status !== "processed" &&
      data.status !== "queued" &&
      data.status !== "processing"
    ) {
      continue;
    }

    const rel = path.relative(RUFINO_PATH, file);
    const parts = rel.split(path.sep);
    const project = parts[0] || "general";
    const type = parts[1] || "tech";
    const filename = path.basename(file, ".md");

    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    const projectTag = tags.find((t) => t.startsWith("proyecto/"));
    const arista = projectTag?.split("/")[2];

    // title: first h1
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename;

    const { original, augmentation } = parseBody(content.replace(/^#\s+.+$/m, "").trim());

    const stat = await fs.stat(file);

    notes.push({
      id: filename,
      filename,
      project,
      arista,
      type,
      title,
      tags,
      status: (data.status as ProcessedNote["status"]) || "processed",
      created: data.created ? String(data.created) : "",
      processed: data.processed ? String(data.processed) : undefined,
      mtime: stat.mtime.toISOString(),
      original,
      augmentation,
      body: content,
      excerpt: original.split("\n").find((l) => l.trim()) || "",
    });
  }
  // Sort by mtime DESC (most recently written first). mtime is a full ISO
  // timestamp, so intra-day ordering is deterministic — unlike the date-only
  // `processed` field, which collapses everything from the same day.
  return notes.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export async function readRawNotes(): Promise<RawNote[]> {
  const entries = await fs.readdir(RUFINO_PATH, { withFileTypes: true }).catch(() => []);
  const out: RawNote[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md") || e.name.startsWith("_")) continue;
    const p = path.join(RUFINO_PATH, e.name);
    const raw = await readSafe(p);
    if (!raw) continue;
    const stat = await fs.stat(p);
    out.push({
      id: path.basename(e.name, ".md"),
      filename: e.name,
      body: raw,
      createdAt: stat.mtime.toISOString(),
      excerpt: raw.split("\n").find((l) => l.trim()) || "",
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readTodos(): Promise<{ porHacer: Todo[]; completados: Todo[] }> {
  const file = path.join(RUFINO_PATH, "_pendientes.md");
  const raw = (await readSafe(file)) || "";
  const { content } = matter(raw);

  const sections = content.split(/^##\s+/m);
  const parseSection = (name: string): Todo[] => {
    const sec = sections.find((s) => s.trim().toLowerCase().startsWith(name.toLowerCase()));
    if (!sec) return [];
    const lines = sec.split("\n").filter((l) => l.trim().startsWith("|"));
    if (lines.length < 2) return [];
    // Skip header and separator
    const rows = lines.slice(2);
    return rows
      .map((line, i): Todo | null => {
        const cols = line.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        // Legacy Por hacer/En progreso: Estado | Pendiente | Proyecto/Arista | Personas | Deadline | Origen | Creado (7 cols)
        // New Por hacer/En progreso: Estado | Title | Description | Proyecto/Arista | Personas | Deadline | Origen | Creado (8 cols)
        // Completados: Pendiente | Proyecto/Arista | Personas | Origen | Completado (5 cols)
        const minCols = name === "Completados" ? 5 : 7;
        if (cols.length < minCols) return null;
        if (name === "Completados") {
          const [desc, projectArista, people, origin, completed] = cols;
          const cleanOrigin = origin.replace(/\[\[|\]\]/g, "").trim();
          return {
            id: stableId(cleanOrigin, desc),
            state: "done",
            desc,
            projectArista,
            people: people.split(/[\s,]+/).filter((p) => p && p !== "-"),
            deadline: null,
            origin: cleanOrigin,
            created: "",
            completed,
          };
        }
        // Support both legacy 7-col format and new 8-col format with title+description:
        // Legacy (7):  Estado | Pendiente | Proyecto/Arista | Personas | Deadline | Origen | Creado
        // New (8):     Estado | Title | Description | Proyecto/Arista | Personas | Deadline | Origen | Creado
        const stateMap: Record<string, Todo["state"]> = {
          "[ ]": "todo",
          "[/]": "todo",
          "[x]": "done",
          "[X]": "done",
        };
        if (cols.length >= 8) {
          // New 8-col format
          const [state, title, description, projectArista, people, deadline, origin, created] = cols;
          const cleanOrigin = origin.replace(/\[\[|\]\]/g, "").trim();
          return {
            id: stableId(cleanOrigin, title),
            state: stateMap[state] || "todo",
            title,
            description,
            desc: title, // keep desc as title for backward compat with filters/search
            projectArista,
            people: people.split(/[\s,]+/).filter((p) => p && p !== "-"),
            deadline: deadline === "-" ? null : deadline,
            origin: cleanOrigin,
            created,
          };
        }
        // Legacy 7-col format
        const [state, desc, projectArista, people, deadline, origin, created] = cols;
        const cleanOrigin = origin.replace(/\[\[|\]\]/g, "").trim();
        return {
          id: stableId(cleanOrigin, desc),
          state: stateMap[state] || "todo",
          desc,
          projectArista,
          people: people.split(/[\s,]+/).filter((p) => p && p !== "-"),
          deadline: deadline === "-" ? null : deadline,
          origin: cleanOrigin,
          created,
        };
      })
      .filter((t): t is Todo => t !== null);
  };

  // Merge any legacy "En progreso" rows into porHacer; the dashboard no
  // longer surfaces in-progress as a distinct state.
  const porHacer = [...parseSection("Por hacer"), ...parseSection("En progreso")];
  return {
    porHacer,
    completados: parseSection("Completados"),
  };
}

export async function readPeople(): Promise<Person[]> {
  const dir = path.join(RUFINO_PATH, "_people");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const people: Person[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const p = path.join(dir, e.name);
    const raw = (await readSafe(p)) || "";
    const { data, content } = matter(raw);
    const id = path.basename(e.name, ".md");
    const nameMatch = content.match(/^#\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : id;

    const relMatch = content.match(/\*\*Rol\*\*:?\s*(.+)/);
    const rol = relMatch ? relMatch[1].trim() : undefined;

    const contextMatch = content.match(/## Contexto\s*([\s\S]*?)(?=##|$)/);
    const bio = contextMatch ? contextMatch[1].trim() : undefined;

    const mencionesSection = content.match(/## Menciones en notas\s*([\s\S]*?)(?=##|$)/);
    const mentions = mencionesSection
      ? (mencionesSection[1].match(/^\s*-\s*\[\[/gm) || []).length
      : 0;

    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    const projects = tags
      .filter((t) => t.startsWith("proyecto/"))
      .map((t) => t.split("/")[1]);

    people.push({
      id,
      name,
      rol,
      projects,
      mentions,
      bio,
    });
  }
  return people.sort((a, b) => b.mentions - a.mentions);
}

export async function writeRawNote(filename: string, content: string): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
  const fullname = safeName.endsWith(".md") ? safeName : `${safeName}.md`;
  const filepath = path.join(RUFINO_PATH, fullname);
  await fs.writeFile(filepath, content, "utf-8");
  return fullname;
}

/**
 * Set or update the `status` field in a file's YAML frontmatter, preserving
 * all other fields and the body. Used by save flows to mark a note as
 * `queued` for the single-file processor.
 *
 * If the file has no frontmatter, one is added (with status + today's date).
 * If it has frontmatter without `status`, the field is inserted just before
 * the closing `---`.
 */
export async function setStatus(absolutePath: string, status: string): Promise<void> {
  const raw = await fs.readFile(absolutePath, "utf-8");
  const today = new Date().toISOString().split("T")[0];
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  let next: string;
  if (fmMatch) {
    const fm = fmMatch[1];
    const body = raw.slice(fmMatch[0].length);
    let newFm: string;
    if (/^status:.*$/m.test(fm)) {
      newFm = fm.replace(/^status:.*$/m, `status: ${status}`);
    } else {
      newFm = fm.trimEnd() + `\nstatus: ${status}`;
    }
    next = `---\n${newFm}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
  } else {
    next = `---\nstatus: ${status}\ncreated: ${today}\nupdated: ${today}\n---\n\n${raw}`;
  }
  await fs.writeFile(absolutePath, next, "utf-8");
}

export async function appendTodo(todo: {
  desc: string;
  projectArista: string;
  people: string[];
  deadline: string | null;
  priority?: "alta" | "media" | "baja";
  /** Short glanceable title for new 8-col format. If absent, legacy 7-col row is written. */
  title?: string;
  /** Detailed description for new 8-col format. */
  description?: string;
}): Promise<void> {
  const file = path.join(RUFINO_PATH, "_pendientes.md");
  const raw = (await readSafe(file)) || "";
  const today = new Date().toISOString().split("T")[0];
  const personas = todo.people.length ? todo.people.map((p) => `@${p}`).join(" ") : "-";
  const deadline = todo.deadline || "-";
  // Write 8-col format when title+description provided, else legacy 7-col
  const row = todo.title && todo.description
    ? `| [ ] | ${todo.title} | ${todo.description} | ${todo.projectArista} | ${personas} | ${deadline} | captura manual | ${today} |`
    : `| [ ] | ${todo.desc} | ${todo.projectArista} | ${personas} | ${deadline} | captura manual | ${today} |`;

  // Insert after "## Por hacer" header row (find the row with ---|--- under the header)
  const lines = raw.split("\n");
  let inserted = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("## Por hacer")) {
      // Find separator row
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^\|[-\s|]+\|$/)) {
          lines.splice(j + 1, 0, row);
          inserted = true;
          break;
        }
      }
      break;
    }
  }
  if (!inserted) {
    lines.push(row);
  }
  await fs.writeFile(file, lines.join("\n"), "utf-8");
}

export async function writePersonFile(person: {
  id: string;
  name: string;
  relation?: string;
  rol?: string;
  projects: string[];
  bio?: string;
}): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const tags = [
    "tipo/persona",
    `persona/${person.id}`,
    ...person.projects.map((p) => `proyecto/${p}`),
  ];
  const body = `---
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
created: ${today}
updated: ${today}
---

# ${person.name}

## Contexto
${person.bio || ""}

## Relación
- **Rol**: ${person.rol || "-"}
${person.relation ? `- **Relación**: ${person.relation}` : ""}

## Proyectos
${person.projects.map((p) => `- [[${p}Overview|${p}]]`).join("\n")}

## Menciones en notas
_Ninguna aún. Se autoactualiza al procesar notas._

---
Relacionado: [[_people]]
`;
  const filepath = path.join(RUFINO_PATH, "_people", `${person.id}.md`);
  await fs.writeFile(filepath, body, "utf-8");
}

export async function getProjectStats() {
  const notes = await readProcessedNotes();
  const todos = await readTodos();
  const people = await readPeople();
  const rawNotes = await readRawNotes();

  const projectCounts = new Map<string, number>();
  for (const n of notes) {
    projectCounts.set(n.project, (projectCounts.get(n.project) || 0) + 1);
  }

  return {
    notesCount: notes.length,
    rawCount: rawNotes.length,
    todosActive: todos.porHacer.length,
    todosOverdue: todos.porHacer.filter((t) => {
      if (!t.deadline || t.deadline === "-") return false;
      return new Date(t.deadline) < new Date();
    }).length,
    peopleCount: people.length,
    projectsCount: projectCounts.size,
    projects: Array.from(projectCounts.entries()).map(([id, count]) => ({ id, count })),
  };
}
