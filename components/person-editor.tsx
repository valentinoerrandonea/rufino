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

interface PersonEditorCtx {
  start: () => void;
}
const Ctx = createContext<PersonEditorCtx | null>(null);

interface Section {
  heading: string;
  content: string;
}

interface ParsedPerson {
  pre: string;
  title: string;
  sections: Section[];
  tail: string;
}

const TAIL_HEADING_RE = /^##\s+menciones\s+en\s+notas\b/i;

function parsePerson(md: string): ParsedPerson {
  const fmMatch = md.match(/^---\n[\s\S]*?\n---\n/);
  const pre = fmMatch ? fmMatch[0] : "";
  const rest = fmMatch ? md.slice(fmMatch[0].length) : md;

  const titleMatch = rest.match(/^#\s+(.+)$/m);
  if (!titleMatch || titleMatch.index === undefined) {
    return { pre, title: "", sections: [], tail: rest.trimEnd() };
  }
  const title = titleMatch[1].trim();
  const afterTitle = rest.slice(titleMatch.index + titleMatch[0].length);

  const lines = afterTitle.split("\n");

  // Find first occurrence of "## Menciones en notas" (or first trailing horizontal rule)
  let tailLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TAIL_HEADING_RE.test(lines[i])) {
      tailLineIdx = i;
      break;
    }
  }
  // If not found, check for `---\nRelacionado:` separator (older files)
  if (tailLineIdx === -1) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].trim() === "---" && /^Relacionado:/i.test(lines[i + 1] ?? "")) {
        tailLineIdx = i;
        break;
      }
    }
  }

  const editableLines = tailLineIdx === -1 ? lines : lines.slice(0, tailLineIdx);
  const tail =
    tailLineIdx === -1
      ? ""
      : lines.slice(tailLineIdx).join("\n").trimEnd();

  // Parse H2 sections from editable region
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

  return { pre, title, sections, tail };
}

function serializePerson(
  parsed: ParsedPerson,
  title: string,
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
  return `${parsed.pre}\n# ${newTitle}\n\n${sectionBlocks}${tailBlock}\n`;
}

interface PersonEditorProps {
  relativePath: string;
  initialContent: string;
  revalidate?: string[];
  initialName: string;
  children: ReactNode;
}

export function PersonEditor({
  relativePath,
  initialContent,
  revalidate,
  initialName,
  children,
}: PersonEditorProps) {
  const parsed = useMemo(() => parsePerson(initialContent), [initialContent]);

  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(parsed.title || initialName);
  const [sections, setSections] = useState<Section[]>(parsed.sections);

  const start = () => {
    setName(parsed.title || initialName);
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
    const newContent = serializePerson(parsed, name, sections);
    startTransition(async () => {
      try {
        await saveFileContent({
          relativePath,
          content: newContent,
          revalidate,
        });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  const dirty =
    name.trim() !== parsed.title ||
    sections.some(
      (s, i) =>
        s.content !== (parsed.sections[i]?.content ?? "") ||
        s.heading !== (parsed.sections[i]?.heading ?? ""),
    ) ||
    sections.length !== parsed.sections.length;

  if (editing) {
    const initial = (name.trim() || "·").charAt(0).toUpperCase();
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
            href="/people"
            className="btn ghost sm"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            ← Personas
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

        <header
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            className="avatar"
            style={{ width: 64, height: 64, fontSize: 26, flexShrink: 0 }}
          >
            {initial}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            placeholder="Nombre"
            className="serif"
            style={{
              flex: 1,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.15,
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
              <b style={{ color: "var(--ink-2)" }}>Menciones en notas</b> y{" "}
              <b style={{ color: "var(--ink-2)" }}>Relacionado</b> los maneja
              Rufino al procesar notas. No se tocan acá.
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

interface SectionFieldProps {
  heading: string;
  value: string;
  onChange: (v: string) => void;
}

function SectionField({ heading, value, onChange }: SectionFieldProps) {
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

export function PersonEditButton({ label = "Editar" }: { label?: string }) {
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
