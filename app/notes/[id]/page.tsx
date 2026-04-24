import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { readProcessedNotes, VAULT_PATH } from "@/lib/vault";
import { fmtDate } from "@/components/atoms";
import { Markdown } from "@/components/markdown";
import { NoteEditor, NoteEditButton } from "@/components/note-editor";

export const dynamic = "force-dynamic";

// Tag axis definitions
const TAG_AXES = [
  { prefix: "proyecto/", label: "Proyecto" },
  { prefix: "tema/", label: "Tema" },
  { prefix: "persona/", label: "Persona" },
  { prefix: "concepto/", label: "Concepto" },
] as const;

function groupTagsByAxis(tags: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const { prefix, label } of TAG_AXES) {
    const matching = tags
      .filter((t) => t.startsWith(prefix))
      .map((t) => t.slice(prefix.length));
    if (matching.length > 0) {
      grouped[label] = matching;
    }
  }

  // Any tags not matched by an axis
  const others = tags.filter((t) => !TAG_AXES.some(({ prefix }) => t.startsWith(prefix)));
  if (others.length > 0) {
    grouped["Otros"] = others;
  }

  return grouped;
}

function TagChip({ label, axis }: { label: string; axis: string }) {
  const axisColors: Record<string, string> = {
    Proyecto: "var(--accent)",
    Tema: "var(--blue)",
    Persona: "var(--green)",
    Concepto: "var(--ink-2)",
    Otros: "var(--ink-3)",
  };
  const color = axisColors[axis] ?? "var(--ink-2)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        color,
        background: "var(--surface-2)",
        border: "1px solid var(--hair-soft)",
      }}
    >
      {label}
    </span>
  );
}

interface SectionBlockProps {
  label: string;
  children: React.ReactNode;
}

function SectionBlock({ label, children }: SectionBlockProps) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: "var(--accent)",
          marginBottom: 16,
          letterSpacing: -0.2,
        }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notes = await readProcessedNotes();

  const note = notes.find((n) => n.id === id);
  if (!note) {
    notFound();
  }

  // Path of this note relative to the vault root (used by the editor)
  const noteFilePath = path.join("rufino", note.project, note.type, `${note.filename}.md`);
  const rawFile = await fs.readFile(path.join(VAULT_PATH, noteFilePath), "utf-8");

  // Build set of known note IDs for wikilink resolution
  const noteIds = new Set(notes.map((n) => n.id));

  const tagGroups = groupTagsByAxis(note.tags);

  // Parse augmentation sections from note body
  // The body contains the full markdown including the title
  // We split manually to get distinct renderable sections
  const augStart = note.body.indexOf("## Rufino Augmentation");
  const contextStart = note.body.indexOf("## Context");
  const connectionsStart = note.body.indexOf("## Connections");

  const originalContent = note.original;

  const augmentationContent =
    augStart !== -1
      ? note.body.slice(
          augStart + "## Rufino Augmentation".length,
          contextStart !== -1 ? contextStart : connectionsStart !== -1 ? connectionsStart : undefined
        ).trim()
      : "";

  const contextContent =
    contextStart !== -1
      ? note.body.slice(
          contextStart + "## Context".length,
          connectionsStart !== -1 ? connectionsStart : undefined
        ).trim()
      : "";

  const connectionsContent =
    connectionsStart !== -1
      ? note.body.slice(connectionsStart + "## Connections".length).trim()
      : "";

  return (
    <div style={{ padding: "48px 72px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <NoteEditor
        relativePath={noteFilePath}
        initialContent={rawFile}
        revalidate={[`/notes/${id}`, "/notes", "/"]}
        project={note.project}
        arista={note.arista}
        dateLabel={fmtDate(note.processed || note.created)}
        title={note.title}
      >
        {/* Top bar */}
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Link
            href="/notes"
            className="btn ghost sm"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            ← Volver a notas
          </Link>
          <NoteEditButton />
        </div>

      {/* Header */}
      <header style={{ marginBottom: 36 }}>
        {/* Project · arista pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--accent)",
              fontWeight: 500,
            }}
          >
            {note.project}
            {note.arista ? ` · ${note.arista}` : ""}
          </span>
          <span style={{ color: "var(--ink-dim)", fontSize: 11 }}>·</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {note.type}
          </span>
        </div>

        {/* Title */}
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15, marginBottom: 16 }}
        >
          {note.title}
        </h1>

        {/* Dates */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--ink-3)",
            marginBottom: 18,
          }}
        >
          <span>Creada {fmtDate(note.created)}</span>
          {note.processed && (
            <>
              <span style={{ color: "var(--ink-dim)" }}>→</span>
              <span>Procesada {fmtDate(note.processed)}</span>
            </>
          )}
        </div>

        {/* Tags grouped by axis */}
        {Object.keys(tagGroups).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(tagGroups).map(([axis, tagList]) => (
              <div key={axis} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: "var(--ink-3)",
                    fontWeight: 600,
                    minWidth: 60,
                  }}
                >
                  {axis}
                </span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {tagList.map((t) => (
                    <TagChip key={t} label={t} axis={axis} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <hr className="hr" style={{ marginBottom: 36 }} />

      {/* Original content */}
      {originalContent && (
        <SectionBlock label="Nota original">
          <div
            className="card-soft"
            style={{
              padding: "20px 22px",
            }}
          >
            <Markdown content={originalContent} noteIds={noteIds} fontSize={15.5} />
          </div>
        </SectionBlock>
      )}

      {/* Rufino Augmentation */}
      {augmentationContent && (
        <SectionBlock label="Rufino Augmentation">
          <div
            style={{
              borderLeft: "2px solid var(--accent)",
              paddingLeft: 22,
              marginLeft: 2,
            }}
          >
            <Markdown content={augmentationContent} noteIds={noteIds} fontSize={15.5} />
          </div>
        </SectionBlock>
      )}

      {/* Context */}
      {contextContent && (
        <SectionBlock label="Context">
          <Markdown content={contextContent} noteIds={noteIds} fontSize={15.5} />
        </SectionBlock>
      )}

      {/* Connections */}
      {connectionsContent && (
        <SectionBlock label="Connections">
          <Markdown content={connectionsContent} noteIds={noteIds} fontSize={15.5} />
        </SectionBlock>
      )}
      </NoteEditor>
    </div>
  );
}
