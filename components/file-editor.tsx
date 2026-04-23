"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { saveFileContent } from "@/app/actions";

interface FileEditorCtx {
  editing: boolean;
  start: () => void;
}

const Ctx = createContext<FileEditorCtx | null>(null);

interface FileEditorProps {
  relativePath: string;
  initialContent: string;
  revalidate?: string[];
  children: ReactNode;
}

/**
 * Wraps a content tree and provides edit mode through context.
 * When `editing` is true, replaces the children with a raw markdown editor.
 * Children can include an <EditButton /> to trigger edit mode.
 */
export function FileEditor({
  relativePath,
  initialContent,
  revalidate,
  children,
}: FileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveFileContent({ relativePath, content: draft, revalidate });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  const handleCancel = () => {
    setDraft(initialContent);
    setEditing(false);
    setError(null);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "var(--accent-wash)",
            borderRadius: 8,
            border: "1px solid var(--hair)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
            ✏ Editando
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {relativePath}
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={handleSave}
            disabled={isPending || draft === initialContent}
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input mono"
          spellCheck={false}
          style={{
            minHeight: 600,
            resize: "vertical",
            fontSize: 13,
            lineHeight: 1.65,
            padding: 20,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            border: "1px solid var(--hair)",
          }}
        />
        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(180, 73, 60, 0.08)",
              border: "1px solid var(--red)",
              borderRadius: 6,
              color: "var(--red)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ editing, start: () => setEditing(true) }}>
      {children}
    </Ctx.Provider>
  );
}

export function EditButton({ label = "Editar" }: { label?: string }) {
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
