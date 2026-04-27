"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitImport } from "@/app/actions";
import type { IngestPlan } from "@/lib/import";

type Modal = "url" | "text" | null;

export function ImportSubmit({ recents }: { recents: IngestPlan[] }) {
  const [dragover, setDragover] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [processing, setProcessing] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const fakeStream = (label: string, after: () => void) => {
    const lines = [
      `Recibido: ${label}`,
      "Leyendo documento…",
      "Extrayendo H1 y secciones…",
      "Cruzando con vault existente…",
      "Generando triples candidatos…",
      "Plan listo",
    ];
    setLogLines([]);
    let i = 0;
    const tick = () => {
      if (i >= lines.length) {
        setTimeout(after, 250);
        return;
      }
      setLogLines((L) => [...L, `[${nowHHMMSS()}] ${lines[i]}`]);
      i += 1;
      setTimeout(tick, 350 + Math.random() * 350);
    };
    tick();
  };

  const handleSubmit = async (
    kind: "file" | "url" | "text",
    payload: { filename?: string; body?: string; url?: string },
    label: string,
  ) => {
    setError(null);
    setProcessing(true);
    setModal(null);
    fakeStream(label, () => void 0);
    startTransition(async () => {
      const r = await submitImport({ kind, ...payload });
      setProcessing(false);
      if (!r.ok) {
        setError(r.error);
        setLogLines([]);
        return;
      }
      router.push(`/import/${r.id}`);
    });
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["md", "txt", "markdown"].includes(ext)) {
      setError(
        `Sólo .md/.txt soportados en v0.2. PDF y otros formatos llegan en un release próximo.`,
      );
      return;
    }
    const text = await file.text();
    handleSubmit("file", { filename: file.name, body: text }, file.name);
  };

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <Eyebrow>Rufino</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Importar documento
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-2)",
            marginTop: 8,
            maxWidth: 580,
            lineHeight: 1.55,
          }}
        >
          Subí un .md/.txt, una URL o pegá un texto. Rufino lo lee, propone qué notas crear,
          y vos confirmás antes de aplicar.
        </p>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 18,
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

      {!processing ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragover(true);
          }}
          onDragLeave={() => setDragover(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragover ? "var(--accent)" : "var(--ink-dim)"}`,
            borderRadius: 12,
            padding: "56px 40px",
            textAlign: "center",
            background: dragover ? "var(--accent-wash)" : "var(--bg-2)",
            transition: "all 0.15s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
              color: "var(--ink-3)",
            }}
          >
            <UploadIcon />
          </div>
          <div className="serif" style={{ fontSize: 18, color: "var(--ink)", marginBottom: 6 }}>
            Arrastrá un archivo acá
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 18 }}>
            .md / .txt · hasta 5 MB
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <FileButton onPicked={(name, body) => handleSubmit("file", { filename: name, body }, name)} />
            <button className="btn" onClick={() => setModal("url")}>
              Pegar URL
            </button>
            <button className="btn" onClick={() => setModal("text")}>
              Pegar texto
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "var(--accent)",
              }}
            >
              ↻
            </span>
            <span className="serif" style={{ fontSize: 16, fontWeight: 500 }}>
              Procesando documento…
            </span>
          </div>
          <pre
            className="mono"
            style={{
              margin: 0,
              fontSize: 11.5,
              color: "var(--ink-3)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              maxHeight: 220,
              overflow: "auto",
              background: "var(--bg-2)",
              padding: 14,
              borderRadius: 8,
              border: "1px solid var(--hair-soft)",
            }}
          >
            {logLines.join("\n")}
          </pre>
        </div>
      )}

      <h2
        className="serif"
        style={{ fontSize: 22, fontWeight: 500, marginTop: 40, marginBottom: 14 }}
      >
        Imports recientes
      </h2>
      {recents.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--hair)",
            borderRadius: 8,
            padding: "18px 22px",
            color: "var(--ink-3)",
            fontSize: 13,
          }}
        >
          Ninguno todavía.
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {recents.map((it, i) => (
            <RecentRow key={it.id} plan={it} isLast={i === recents.length - 1} />
          ))}
        </div>
      )}

      {modal && (
        <ImportModal
          kind={modal}
          onClose={() => setModal(null)}
          onSubmit={(value) => {
            if (modal === "url") {
              handleSubmit("url", { url: value }, value);
            } else {
              handleSubmit("text", { filename: "pasted.txt", body: value }, "texto pegado");
            }
          }}
        />
      )}
    </div>
  );
}

function FileButton({ onPicked }: { onPicked: (name: string, body: string) => void }) {
  return (
    <label className="btn" style={{ cursor: "pointer", display: "inline-flex" }}>
      Elegir archivo
      <input
        type="file"
        accept=".md,.txt,.markdown"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const text = await f.text();
          onPicked(f.name, text);
        }}
      />
    </label>
  );
}

function RecentRow({ plan, isLast }: { plan: IngestPlan; isLast: boolean }) {
  const stateTone: Record<IngestPlan["status"], { fg: string; label: string }> = {
    pending:    { fg: "var(--amber)", label: "pendiente review" },
    applied:    { fg: "var(--green)", label: "aplicado" },
    discarded:  { fg: "var(--ink-3)", label: "descartado" },
  };
  const t = stateTone[plan.status];
  const inner = (
    <div
      className="hoverable"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto",
        gap: 16,
        alignItems: "center",
        padding: "14px 22px",
        borderBottom: isLast ? "none" : "1px solid var(--hair-soft)",
        cursor: plan.status === "pending" ? "pointer" : "default",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "var(--surface-2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "var(--ink-2)",
        }}
      >
        {plan.source.kind === "url" ? "🔗" : plan.source.kind === "text" ? "✎" : "📄"}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          className="serif"
          style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.4 }}
        >
          {plan.title}
        </div>
        <div
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}
        >
          {plan.source.original}
        </div>
      </div>
      <span
        className="mono"
        style={{ fontSize: 11, color: t.fg, whiteSpace: "nowrap" }}
      >
        {t.label}
      </span>
      <span style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
        {relativeFromIso(plan.createdAt)}
      </span>
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {plan.status === "pending" ? "Ver →" : "·"}
      </span>
    </div>
  );

  return plan.status === "pending" ? (
    <Link href={`/import/${plan.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ImportModal({
  kind,
  onClose,
  onSubmit,
}: {
  kind: "url" | "text";
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [val, setVal] = useState("");
  const isUrl = kind === "url";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 520, padding: 22, background: "var(--surface)" }}
      >
        <h3
          className="serif"
          style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}
        >
          {isUrl ? "Pegar URL" : "Pegar texto"}
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            marginBottom: 14,
          }}
        >
          {isUrl
            ? "Voy a hacer fetch del HTML, lo limpio, y lo proceso como markdown."
            : "Pegá markdown o texto plano. Si es un screenshot OCR'd, también funciona."}
        </p>
        {isUrl ? (
          <input
            className="input"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="https://…"
            autoFocus
          />
        ) : (
          <textarea
            className="input mono"
            rows={6}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Pegá tu texto…"
            autoFocus
            style={{ resize: "vertical", minHeight: 140 }}
          />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            onClick={() => val.trim() && onSubmit(val.trim())}
            disabled={!val.trim()}
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}

function nowHHMMSS(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function relativeFromIso(iso: string): string {
  const t = new Date(iso);
  const ms = Date.now() - t.getTime();
  if (ms < 0) return "en el futuro";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return t.toLocaleDateString("es-AR");
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 0.6,
        fontWeight: 600,
        color: "var(--accent)",
        textTransform: "uppercase",
        marginBottom: 6,
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21V9M6 13l6-6 6 6M4 3h16" />
    </svg>
  );
}
