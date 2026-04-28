import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_PATH, RUFINO_PATH } from "./vault";

export const RELATION_KINDS = [
  "depends-on",
  "blocks",
  "caused-by",
  "led-to",
  "references",
  "contradicts",
  "refines",
  "replaces",
  "decided-by",
  "learned-in",
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export type EntityKind = "nota" | "persona" | "proyecto" | "concepto" | "source";

export interface GraphNode {
  id: string;
  label: string;
  kind: EntityKind;
  /** absolute path to the markdown file for this node */
  filePath: string;
  /** path relative to VAULT_PATH (used by save actions) */
  relativePath: string;
}

export interface RawTriple {
  /** Relation kind. Free-form string; we lint against RELATION_KINDS. */
  r: string;
  /** Object id (the target). Subject is implicit = the file's id. */
  o: string;
}

export interface Triple {
  s: string;
  r: string;
  o: string;
}

export interface ResolvedTriple {
  s: GraphNode;
  r: string;
  o: GraphNode;
}

export interface VaultGraph {
  nodes: GraphNode[];
  edges: Triple[];
  /** edges where both s and o resolve to a node */
  resolved: ResolvedTriple[];
  /** edges that mention an unknown object — surfaced to lint later */
  unresolved: Triple[];
}

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

function readTriples(data: Record<string, unknown>): RawTriple[] {
  const raw = data.triples;
  if (!Array.isArray(raw)) return [];
  const out: RawTriple[] = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const obj = r as Record<string, unknown>;
    if (typeof obj.r !== "string" || typeof obj.o !== "string") continue;
    out.push({ r: obj.r, o: obj.o });
  }
  return out;
}

function fileLabel(content: string, fallback: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  if (!m) return fallback;
  return m[1].trim().replace(/^Decisi[óo]n:\s*/i, "").replace(/^Aprendizaje:\s*/i, "");
}

async function* walk(
  dir: string,
  filter?: (entry: { name: string; isFile: boolean }) => boolean,
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "_trash") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p, filter);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      const want = filter ? filter({ name: e.name, isFile: true }) : true;
      if (want) yield p;
    }
  }
}

/**
 * Build the full vault graph: scan every markdown file under
 * `rufino/`, `proyectos/`, and `conceptos/`, derive its kind from its
 * location, and collect any `triples:` listed in frontmatter.
 */
export async function readGraph(): Promise<VaultGraph> {
  const nodes = new Map<string, GraphNode>();
  const edges: Triple[] = [];

  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };

  const ingestFile = async (
    absPath: string,
    kindFromPath: EntityKind,
  ): Promise<void> => {
    const raw = await readSafe(absPath);
    if (!raw) return;
    const { data, content } = matter(raw);

    const id = path.basename(absPath, ".md");
    const label = fileLabel(content, id);
    const relativePath = path.relative(VAULT_PATH, absPath);

    addNode({ id, label, kind: kindFromPath, filePath: absPath, relativePath });

    for (const t of readTriples(data as Record<string, unknown>)) {
      edges.push({ s: id, r: t.r, o: t.o });
    }
  };

  // Concepts
  const conceptsDir = path.join(VAULT_PATH, "conceptos");
  for await (const p of walk(conceptsDir)) {
    if (path.basename(p).startsWith("_")) continue;
    await ingestFile(p, "concepto");
  }

  // People
  const peopleDir = path.join(RUFINO_PATH, "_people");
  for await (const p of walk(peopleDir)) {
    if (path.basename(p).startsWith("_")) continue;
    await ingestFile(p, "persona");
  }

  // Notes (rufino, except _people, _trash, leading-underscore index files)
  const rufinoEntries = await fs.readdir(RUFINO_PATH, { withFileTypes: true }).catch(() => []);
  for (const e of rufinoEntries) {
    if (!e.isDirectory()) continue;
    if (e.name === "_people" || e.name === "_trash") continue;
    if (e.name.startsWith("_")) continue;
    for await (const p of walk(path.join(RUFINO_PATH, e.name))) {
      if (path.basename(p).startsWith("_")) continue;
      await ingestFile(p, "nota");
    }
  }

  // Projects: overview as the project node, then decisiones / aprendizajes as notes
  const proyectosDir = path.join(VAULT_PATH, "proyectos");
  const proyectoEntries = await fs.readdir(proyectosDir, { withFileTypes: true }).catch(() => []);
  for (const e of proyectoEntries) {
    if (!e.isDirectory() || e.name.startsWith("_")) continue;
    const projectId = e.name;
    // Try new convention first (<id>Overview.md), fall back to legacy
    let overviewPath = path.join(proyectosDir, projectId, `${projectId}Overview.md`);
    let overviewRaw = await readSafe(overviewPath);
    if (overviewRaw == null) {
      overviewPath = path.join(proyectosDir, projectId, "overview.md");
      overviewRaw = await readSafe(overviewPath);
    }
    if (overviewRaw) {
      const { data, content } = matter(overviewRaw);
      const label = fileLabel(content, projectId).replace(
        /\s+[—-]\s+.+$/,
        "",
      );
      addNode({
        id: projectId,
        label,
        kind: "proyecto",
        filePath: overviewPath,
        relativePath: path.relative(VAULT_PATH, overviewPath),
      });
      for (const t of readTriples(data as Record<string, unknown>)) {
        edges.push({ s: projectId, r: t.r, o: t.o });
      }
    }
    for (const sub of ["decisiones", "aprendizajes"]) {
      const subDir = path.join(proyectosDir, projectId, sub);
      for await (const p of walk(subDir)) {
        await ingestFile(p, "nota");
      }
    }
  }

  const resolved: ResolvedTriple[] = [];
  const unresolved: Triple[] = [];
  for (const e of edges) {
    const s = nodes.get(e.s);
    const o = nodes.get(e.o);
    if (s && o) resolved.push({ s, r: e.r, o });
    else unresolved.push(e);
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
    resolved,
    unresolved,
  };
}

export interface ConnectionsForEntity {
  node: GraphNode | null;
  outgoing: ResolvedTriple[];
  incoming: ResolvedTriple[];
  unresolvedOut: Triple[];
}

export async function connectionsFor(entityId: string): Promise<ConnectionsForEntity> {
  const graph = await readGraph();
  const node = graph.nodes.find((n) => n.id === entityId) ?? null;
  const outgoing = graph.resolved.filter((t) => t.s.id === entityId);
  const incoming = graph.resolved.filter((t) => t.o.id === entityId);
  const unresolvedOut = graph.unresolved.filter((t) => t.s === entityId);
  return { node, outgoing, incoming, unresolvedOut };
}

/**
 * Read+parse a file, edit its `triples:` list in frontmatter, write it back.
 * Operations are best-effort: if the file has no frontmatter we add one.
 */
export async function setTriples(
  relativePathInVault: string,
  triples: RawTriple[],
): Promise<void> {
  const target = path.resolve(VAULT_PATH, relativePathInVault);
  const rel = path.relative(VAULT_PATH, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid path: outside vault");
  }
  const raw = await fs.readFile(target, "utf-8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  if (triples.length === 0) {
    delete data.triples;
  } else {
    data.triples = triples.map((t) => ({ r: t.r, o: t.o }));
  }
  // Bump updated date — best-effort, don't clobber the format
  data.updated = new Date().toISOString().slice(0, 10);
  const out = matter.stringify(parsed.content, data);
  await fs.writeFile(target, out);
}
