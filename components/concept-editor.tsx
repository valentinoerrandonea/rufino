"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveFileContent } from "@/app/actions";
import { AutoTextarea } from "./note-editor";

interface ConceptEditorCtx {
  start: () => void;
}
const Ctx = createContext<ConceptEditorCtx | null>(null);

interface Section {
  heading: string;
  content: string;
}

interface ParsedConcept {
  pre: string; // frontmatter block (with trailing \n)
  title: string;
  aliases: string[];
  sections: Section[];
  /** "Sources" section + everything below it. Auto-managed, kept verbatim. */
  tail: string;
}

const TAIL_HEADING_RE = /^##\s+sources\b/i;

function parseConcept(md: string): ParsedConcept {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
  const pre = fmMatch ? fmMatch[0] : "";
  const rest = fmMatch ? md.slice(fmMatch[0].length) : md;

  // Pull aliases from frontmatter for the editor
  let aliases: string[] = [];
  if (fmMatch) {
    const fmBody = fmMatch[1];
    const block = fmBody.match(/^aliases:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (block) {
      aliases = block[1]
        .split("\n")
        .map((l) => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean);
    }
  }

  const titleMatch = rest.match(/^#\s+(.+)$/m);
  if (!titleMatch || titleMatch.index === undefined) {
    return { pre, title: "", aliases, sections: [], tail: rest.trimEnd() };
  }
  const title = titleMatch[1].trim();
  const afterTitle = rest.slice(titleMatch.index + titleMatch[0].length);
  const lines = afterTitle.split("\n");

  let tailLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TAIL_HEADING_RE.test(lines[i])) {
      tailLineIdx = i;
      break;
    }
  }

  const editableLines = tailLineIdx === -1 ? lines : lines.slice(0, tailLineIdx);
  const tail =
    tailLineIdx === -1 ? "" : lines.slice(tailLineIdx).join("\n").trimEnd();

  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentHeading !== null) {
      sections.push({
        heading: currentHeading,
        content: buffer.join("\n").trim(),
      });
    }
    buffer = [];
  };

  for (const line of editableLines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      currentHeading = h2[1].trim();
    } else if (currentHeading !== null) {
      buffer.push(line);
    }
  }
  flush();

  // If no sections were detected (e.g. fresh stub), seed a "Definición" section
  // so the editor always has at least one editable field.
  if (sections.length === 0) {
    sections.push({ heading: "Definición", content: "" });
  }

  return { pre, title, aliases, sections, tail };
}

function serializePre(originalPre: string, aliases: string[]): string {
  // Replace the `aliases:` block in the frontmatter with the new list.
  // If no `aliases:` block exists, append one before the closing `---`.
  if (!originalPre) return originalPre;

  const aliasBlock = aliases.length
    ? "aliases:\n" + aliases.map((a) => `  - ${a}`).join("\n") + "\n"
    : "";

  const hasAliases = /^aliases:\s*\n((?:\s*-\s*.+\n?)+)/m.test(originalPre);
  if (hasAliases) {
    if (!aliasBlock) {
      return originalPre.replace(/^aliases:\s*\n((?:\s*-\s*.+\n?)+)/m, "");
    }
    return originalPre.replace(
      /^aliases:\s*\n((?:\s*-\s*.+\n?)+)/m,
      aliasBlock,
    );
  }
  if (aliasBlock) {
    return originalPre.replace(/\n---\n$/, `\n${aliasBlock}---\n`);
  }
  return originalPre;
}

function serializeConcept(
  parsed: ParsedConcept,
  title: string,
  aliases: string[],
  sections: Section[],
): string {
  const newTitle = title.trim() || parsed.title;
  const sectionBlocks = sections
    .map((s) => {
      const heading = s.heading.trim() || "Sin título";
      const content = s.content.trim();
      return content ? `## ${heading}\n${content}` : `## ${heading}\n`;
    })
    .join("\n\n");

  const tailBlock = parsed.tail ? `\n\n${parsed.tail}` : "";
  const newPre = serializePre(parsed.pre, aliases);
  return `${newPre}\n# ${newTitle}\n\n${sectionBlocks}${tailBlock}\n`;
}

interface ConceptEditorProps {
  relativePath: string;
  initialContent: string;
  revalidate?: string[];
  initialName: string;
  aliases: string[];
  children: ReactNode;
}

export function ConceptEditor({
  relativePath,
  initialContent,
  revalidate,
  initialName,
  children,
}: ConceptEditorProps) {
  const parsed = useMemo(() => parseConcept(initialContent), [initialContent]);

  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(parsed.title || initialName);
  const [aliasesText, setAliasesText] = useState(parsed.aliases.join(", "));
  const [sections, setSections] = useState<Section[]>(parsed.sections);

  const start = () => {
    setName(parsed.title || initialName);
    setAliasesText(parsed.aliases.join(", "));
    setSections(parsed.sections.map((s) => ({ ...s })));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const updateSection = (idx: number, content: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, content } : s)),
    );
  };

  const save = () => {
    setError(null);
    const aliases = aliasesText
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const newContent = serializeConcept(parsed, name, aliases, sections);
    startTransition(async () => {
      try {
        await saveFileContent({ relativePath, content: newContent, revalidate });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  const dirty =
    name.trim() !== parsed.title ||
    aliasesText.trim() !== parsed.aliases.join(", ") ||
    sections.some(
      (s, i) =>
        s.content !== (parsed.sections[i]?.content ?? "") ||
        s.heading !== (parsed.sections[i]?.heading ?? ""),
    ) ||
    sections.length !== parsed.sections.length;

  if (editing) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <Link
            href="/memory/conceptos"
            className="btn ghost sm"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            ← Conceptos
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={cancel}
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={save}
              disabled={isPending || !dirty}
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        <header style={{ marginBottom: 32 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            placeholder="Nombre del concepto"
            className="serif"
            style={{
              width: "100%",
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.1,
              marginBottom: 8,
              padding: "4px 6px",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 6,
              color: "var(--ink)",
              outline: "none",
              fontFamily: "'Newsreader', Georgia, serif",
              letterSpacing: "-0.005em",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--hair)";
              e.currentTarget.style.background = "var(--surface)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.background = "transparent";
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <label
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                fontWeight: 600,
                minWidth: 60,
              }}
            >
              Aliases
            </label>
            <input
              type="text"
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              spellCheck={false}
              placeholder="vector embeddings, semantic embeddings…"
              style={{
                flex: 1,
                fontSize: 14,
                padding: "6px 10px",
                background: "var(--surface)",
                border: "1px solid var(--hair)",
                borderRadius: 6,
                color: "var(--ink)",
                outline: "none",
                fontFamily: "var(--font-serif), Georgia, serif",
                fontStyle: "italic",
              }}
            />
          </div>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((s, i) => (
            <SectionField
              key={i}
              heading={s.heading}
              value={s.content}
              onChange={(v) => updateSection(i, v)}
            />
          ))}
        </div>

        {parsed.tail && (
          <div
            style={{
              marginTop: 32,
              padding: "14px 18px",
              borderRadius: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--hair-soft)",
              color: "var(--ink-3)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Auto · no editable
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              <b style={{ color: "var(--ink-2)" }}>Sources</b> lo mantiene Rufino
              cuando una nota nueva menciona este concepto. No se toca acá.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: "10px 14px",
              background: "rgba(180, 73, 60, 0.08)",
              border: "1px solid var(--red)",
              borderRadius: 6,
              color: "var(--red)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return <Ctx.Provider value={{ start }}>{children}</Ctx.Provider>;
}

function SectionField({
  heading,
  value,
  onChange,
}: {
  heading: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          letterSpacing: 0.7,
          fontWeight: 600,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {heading}
      </label>
      <AutoTextarea
        value={value}
        onChange={onChange}
        minHeight={80}
        style={{ fontSize: 14, lineHeight: 1.6 }}
      />
    </div>
  );
}

export function ConceptEditButton({ label = "Editar" }: { label?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return (
    <button
      type="button"
      className="btn ghost sm"
      onClick={ctx.start}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      ✏ {label}
    </button>
  );
}
