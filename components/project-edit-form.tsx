"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectMeta } from "@/app/actions";

interface ProjectEditFormProps {
  projectId: string;
  initialName: string;
  initialDescription: string;
  initialTags: string[];
  onClose: () => void;
}

function ProjectEditFormInner({
  projectId,
  initialName,
  initialDescription,
  initialTags,
  onClose,
}: ProjectEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [tagsStr, setTagsStr] = useState(initialTags.join(", "));
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const dirty =
    trimmedName !== initialName ||
    description.trim() !== initialDescription ||
    tagsStr.trim() !== initialTags.join(", ");

  const handleSave = () => {
    if (!trimmedName) return;

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      setError(null);
      const result = await updateProjectMeta({
        projectId,
        name: trimmedName,
        description: description.trim(),
        tags,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  };

  return (
    <div
      style={{
        background: "var(--accent-wash)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        maxWidth: 560,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent)",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
          marginBottom: 2,
        }}
      >
        Editar proyecto
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          htmlFor="proj-name"
          style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}
        >
          Nombre
        </label>
        <input
          id="proj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Nombre del proyecto"
          autoFocus
          style={{ fontSize: 15, fontWeight: 500 }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          htmlFor="proj-desc"
          style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}
        >
          Descripción
        </label>
        <textarea
          id="proj-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          placeholder="Descripción breve del proyecto"
          rows={3}
          style={{
            fontSize: 13,
            resize: "vertical",
            lineHeight: 1.55,
            fontFamily: "var(--font-sans)",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          htmlFor="proj-tags"
          style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}
        >
          Tags (separados por coma)
        </label>
        <input
          id="proj-tags"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          className="input"
          placeholder="ej: proyecto/umbru, tipo/activo"
          style={{ fontSize: 13 }}
        />
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "var(--red, #c0392b)",
            padding: "8px 12px",
            background: "var(--surface-2)",
            borderRadius: 6,
            border: "1px solid var(--hair)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn primary sm"
          onClick={handleSave}
          disabled={!trimmedName || !dirty || isPending}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

interface ProjectEditToggleProps {
  projectId: string;
  initialName: string;
  initialDescription: string;
  initialTags: string[];
}

/**
 * Client component: renders an "Editar" button; when clicked, replaces the
 * page header area with an inline edit form for the project metadata.
 *
 * The component renders two separate pieces:
 * 1. The toggle button (always visible in the top bar)
 * 2. The form (shown below the top bar when active, via a portal-like div)
 *
 * To keep this simple and avoid portals, we expose the button and the form
 * as a single component that renders conditionally. The parent page positions
 * them via CSS (the form has `gridColumn: 1 / -1` to span across).
 */
export function ProjectEditToggle({
  projectId,
  initialName,
  initialDescription,
  initialTags,
}: ProjectEditToggleProps) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn ghost sm"
        onClick={() => setEditing((e) => !e)}
        aria-pressed={editing}
      >
        {editing ? "Cancelar edición" : "Editar"}
      </button>
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 80,
            background: "rgba(0,0,0,0.18)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(false);
          }}
        >
          <ProjectEditFormInner
            projectId={projectId}
            initialName={initialName}
            initialDescription={initialDescription}
            initialTags={initialTags}
            onClose={() => setEditing(false)}
          />
        </div>
      )}
    </>
  );
}
