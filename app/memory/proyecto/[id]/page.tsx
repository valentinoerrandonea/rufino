import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { VAULT_PATH } from "@/lib/vault";
import { MemoryMarkdown } from "@/components/memory-markdown";
import { fmtDate } from "@/components/atoms";

export const dynamic = "force-dynamic";

async function readFileSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

interface NoteFile {
  filename: string;
  title: string;
  date: string;
  content: string;
  tags: string[];
}

async function readNoteFiles(dir: string): Promise<NoteFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const results: NoteFile[] = [];

  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const raw = await readFileSafe(path.join(dir, e.name));
    if (!raw) continue;
    const { data, content } = matter(raw);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(e.name, ".md");
    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    results.push({
      filename: e.name,
      title,
      date: String(data.updated || data.created || ""),
      content,
      tags,
    });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

async function readSessionsForProject(projectId: string): Promise<NoteFile[]> {
  const dir = path.join(VAULT_PATH, "sesiones");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const results: NoteFile[] = [];

  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const raw = await readFileSafe(path.join(dir, e.name));
    if (!raw) continue;
    const { data, content } = matter(raw);
    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    const hasProject =
      tags.includes(`proyecto/${projectId}`) ||
      tags.some((t) => t === `proyecto/${projectId}`);
    if (!hasProject) continue;
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(e.name, ".md");
    results.push({
      filename: e.name,
      title,
      date: String(data.created || ""),
      content,
      tags,
    });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Tab panels (server-rendered, expanded by default on click via details) ──

function NoteList({ notes, emptyLabel }: { notes: NoteFile[]; emptyLabel: string }) {
  if (notes.length === 0) {
    return <p style={{ fontSize: 14, color: "var(--ink-3)", padding: "12px 0" }}>{emptyLabel}</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--hair)", borderRadius: 10, overflow: "hidden" }}>
      {notes.map((n) => (
        <details
          key={n.filename}
          style={{ borderBottom: "1px solid var(--hair-soft)" }}
        >
          <summary
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "18px 22px",
              cursor: "pointer",
              listStyle: "none",
              background: "var(--surface)",
              userSelect: "none",
            }}
          >
            <span className="serif" style={{ fontSize: 18, fontWeight: 500, color: "var(--accent)", flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              {n.title}
            </span>
            {n.date && (
              <span style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}>{fmtDate(n.date)}</span>
            )}
          </summary>
          <div style={{ padding: "20px 24px 24px", background: "var(--bg)", borderTop: "1px solid var(--hair-soft)" }}>
            <MemoryMarkdown content={n.content} stripTitle />
          </div>
        </details>
      ))}
    </div>
  );
}

export default async function ProyectoMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;

  const projectDir = path.join(VAULT_PATH, "proyectos", id);
  const entries = await fs.readdir(projectDir, { withFileTypes: true }).catch(() => null);
  if (!entries) notFound();

  const overviewRaw = await readFileSafe(path.join(projectDir, "overview.md"));
  const overviewParsed = overviewRaw ? matter(overviewRaw) : null;
  const rawMeta = overviewParsed?.data as Record<string, unknown> | undefined;
  const overviewMeta = rawMeta
    ? {
        created: rawMeta.created != null ? String(rawMeta.created) : undefined,
        updated: rawMeta.updated != null ? String(rawMeta.updated) : undefined,
        tags: Array.isArray(rawMeta.tags) ? (rawMeta.tags as string[]) : undefined,
      }
    : undefined;
  const overviewContent = overviewParsed?.content ?? "";

  const titleMatch = overviewContent.match(/^#\s+(.+)$/m);
  const projectTitle = titleMatch ? titleMatch[1].trim() : id;

  const [decisiones, aprendizajes, sesiones] = await Promise.all([
    readNoteFiles(path.join(projectDir, "decisiones")),
    readNoteFiles(path.join(projectDir, "aprendizajes")),
    readSessionsForProject(id),
  ]);

  const tab = rawTab || "overview";
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "decisiones", label: "Decisiones", count: decisiones.length },
    { id: "aprendizajes", label: "Aprendizajes", count: aprendizajes.length },
    { id: "sesiones", label: "Sesiones", count: sesiones.length },
  ];

  return (
    <div style={{ padding: "40px 56px 80px", maxWidth: 880, margin: "0 auto" }}>
      {/* Back link */}
      <a
        href="/memory/proyectos"
        style={{ display: "inline-block", fontSize: 12, color: "var(--ink-3)", textDecoration: "none", marginBottom: 20 }}
      >
        ← Proyectos
      </a>

      {/* Title */}
      <h1 className="serif" style={{ fontSize: 30, fontWeight: 400, margin: "0 0 4px", letterSpacing: -0.3 }}>
        {projectTitle}
      </h1>
      <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 24 }}>
        Memoria · Proyecto
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--hair)", marginBottom: 32 }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <a
              key={t.id}
              href={`/memory/proyecto/${id}?tab=${t.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                textDecoration: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                color: active ? "var(--ink)" : "var(--ink-3)",
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                marginBottom: -1,
              }}
            >
              <span>{t.label}</span>
              {"count" in t && t.count !== undefined && (
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.count}</span>
              )}
            </a>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <>
          {overviewContent ? (
            <MemoryMarkdown content={overviewContent} meta={overviewMeta} stripTitle />
          ) : (
            <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Sin overview todavía.</p>
          )}
        </>
      )}

      {tab === "decisiones" && (
        <NoteList notes={decisiones} emptyLabel="Sin decisiones registradas en este proyecto." />
      )}

      {tab === "aprendizajes" && (
        <NoteList notes={aprendizajes} emptyLabel="Sin aprendizajes registrados en este proyecto." />
      )}

      {tab === "sesiones" && (
        <NoteList notes={sesiones} emptyLabel="Sin sesiones vinculadas a este proyecto." />
      )}
    </div>
  );
}
