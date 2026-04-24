"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveFileContent } from "@/app/actions";
import { parseNote, serializeNote, type NoteUpdates } from "@/lib/note-sections";

interface NoteEditorCtx {
  start: () => void;
}
const Ctx = createContext<NoteEditorCtx | null>(null);

interface NoteEditorProps {
  relativePath: string;
  initialContent: string;
  revalidate?: string[];
  project: string;
  arista?: string;
  dateLabel: string;
  title: string;
  children: ReactNode;
}

export function NoteEditor({
  relativePath,
  initialContent,
  revalidate,
  project,
  arista,
  dateLabel,
  title,
  children,
}: NoteEditorProps) {
  const parsed = useMemo(() => parseNote(initialContent), [initialContent]);

  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [rawBody, setRawBody] = useState(parsed.rawBody);
  const [resumen, setResumen] = useState(parsed.resumen);
  const [analisis, setAnalisis] = useState(parsed.analisis);
  const [implicaciones, setImplicaciones] = useState(parsed.implicaciones);
  const [preguntas, setPreguntas] = useState(parsed.preguntas);
  const [followups, setFollowups] = useState(parsed.followups);

  const start = () => {
    setRawBody(parsed.rawBody);
    setResumen(parsed.resumen);
    setAnalisis(parsed.analisis);
    setImplicaciones(parsed.implicaciones);
    setPreguntas(parsed.preguntas);
    setFollowups(parsed.followups);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = () => {
    setError(null);
    const updates: NoteUpdates = {
      rawBody,
      resumen,
      analisis,
      implicaciones,
      preguntas,
      followups,
    };
    const newContent = serializeNote(initialContent, parsed, updates);
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
    rawBody !== parsed.rawBody ||
    resumen !== parsed.resumen ||
    analisis !== parsed.analisis ||
    implicaciones !== parsed.implicaciones ||
    preguntas !== parsed.preguntas ||
    followups !== parsed.followups;

  if (editing) {
    return (
      <div>
        <EditHeader
          title={title}
          project={project}
          arista={arista}
          dateLabel={dateLabel}
          onCancel={cancel}
          onSave={save}
          saving={isPending}
          dirty={dirty}
        />

        <AutoTextarea
          value={rawBody}
          onChange={setRawBody}
          minHeight={140}
          style={{ fontSize: 15, padding: "18px 20px" }}
        />

        <div
          style={{
            marginTop: 32,
            paddingLeft: 22,
            borderLeft: "2px solid var(--accent)",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: 0.8,
                fontWeight: 600,
                color: "var(--accent)",
                textTransform: "uppercase",
              }}
            >
              Augmentation · Editable
            </span>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-3)",
                marginTop: 4,
                lineHeight: 1.55,
              }}
            >
              Estos campos los escribe el daemon pero los podés ajustar a mano.
              Dejar vacío para ocultar una sección. Listas (preguntas, pasos) —
              un ítem por línea.
            </p>
          </div>

          <Field label="Resumen" value={resumen} onChange={setResumen} />
          <Field label="Análisis" value={analisis} onChange={setAnalisis} />
          <Field
            label="Implicaciones"
            value={implicaciones}
            onChange={setImplicaciones}
          />
          <Field
            label="Preguntas abiertas · una por línea"
            value={preguntas}
            onChange={setPreguntas}
          />
          <Field
            label="Próximos pasos · uno por línea"
            value={followups}
            onChange={setFollowups}
          />
        </div>

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

export function NoteEditButton({ label = "Editar" }: { label?: string }) {
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

interface EditHeaderProps {
  title: string;
  project: string;
  arista?: string;
  dateLabel: string;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}

function EditHeader({
  title,
  project,
  arista,
  dateLabel,
  onCancel,
  onSave,
  saving,
  dirty,
}: EditHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
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
          href="/notes"
          className="btn ghost sm"
          style={{ textDecoration: "none", display: "inline-flex" }}
        >
          ← Notas
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={onSave}
            disabled={saving || !dirty}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12.5,
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--accent)", fontWeight: 500 }}>
          {project}
          {arista ? ` · ${arista}` : ""}
        </span>
        <span style={{ color: "var(--ink-3)" }}>·</span>
        <span style={{ color: "var(--ink-3)" }}>{dateLabel}</span>
      </div>
      <h1
        className="serif"
        style={{
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.2,
          margin: 0,
          marginBottom: 20,
        }}
      >
        {title}
      </h1>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 10.5,
          letterSpacing: 0.8,
          fontWeight: 600,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <AutoTextarea value={value} onChange={onChange} minHeight={70} />
    </div>
  );
}

interface AutoTextareaProps {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
  style?: React.CSSProperties;
}

function AutoTextarea({ value, onChange, minHeight = 80, style }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [value, minHeight]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      spellCheck={false}
      style={{
        width: "100%",
        boxSizing: "border-box",
        minHeight,
        resize: "none",
        overflow: "hidden",
        padding: "12px 14px",
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: "var(--font-sans), -apple-system, sans-serif",
        background: "var(--surface)",
        color: "var(--ink)",
        border: "1px solid var(--hair)",
        borderRadius: 8,
        outline: "none",
        ...style,
      }}
    />
  );
}
