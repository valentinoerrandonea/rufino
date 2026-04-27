"use client";

import { useState, useTransition } from "react";
import { trashItem } from "@/app/actions";

interface DeleteButtonProps {
  /** Path inside the vault to remove (file or directory). */
  relativePath: string;
  /** Where to send the user after a successful delete. */
  redirectTo?: string;
  /** Paths to revalidate before redirecting. */
  revalidate?: string[];
  /** Human label for what's being deleted ("esta nota", "esta persona", "el proyecto Umbru"). */
  itemLabel: string;
  /** Button label. */
  label?: string;
}

export function DeleteButton({
  relativePath,
  redirectTo,
  revalidate,
  itemLabel,
  label = "Eliminar",
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setConfirming(false);
    setError(null);
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await trashItem({ relativePath, revalidate, redirectTo });
        // If redirectTo is set, the action throws redirect() — never reaches here.
        // Otherwise stay and just close the confirm.
        setConfirming(false);
      } catch (e) {
        // Next.js redirect throws a special error we should let bubble up.
        if (e instanceof Error && /NEXT_REDIRECT/i.test(e.message)) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Error al eliminar");
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn ghost sm"
        onClick={() => setConfirming(true)}
        style={{ color: "var(--red)", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        🗑 {label}
      </button>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px 4px 12px",
        border: "1px solid var(--red)",
        borderRadius: 8,
        background: "rgba(180, 73, 60, 0.06)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ¿Eliminar {itemLabel}?
      </span>
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
        className="btn sm"
        onClick={confirm}
        disabled={isPending}
        style={{
          background: "var(--red)",
          color: "#fff",
          borderColor: "var(--red)",
        }}
      >
        {isPending ? "Eliminando…" : "Sí, eliminar"}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: "var(--red)" }}>{error}</span>
      )}
    </div>
  );
}
