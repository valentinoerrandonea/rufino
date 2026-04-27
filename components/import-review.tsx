"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyImport, discardImport } from "@/app/actions";
import type { IngestPlan } from "@/lib/import";
import { RelationChip, EntityTag } from "./relation-chip";

type Tab = "crear" | "update" | "triples";

export function ImportReview({ plan }: { plan: IngestPlan }) {
  const [tab, setTab] = useState<Tab>("crear");
  const [included, setIncluded] = useState({
    create: new Set(plan.create.map((c) => c.id)),
    update: new Set(plan.update.map((u) => u.id)),
    triples: new Set(plan.triples.map((_, i) => i)),
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(plan.create.slice(0, 1).map((c) => c.id)));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = <K extends "create" | "update">(cat: K, id: string) => {
    const s = new Set(included[cat]);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setIncluded({ ...included, [cat]: s });
  };

  const toggleTriple = (i: number) => {
    const s = new Set(included.triples);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setIncluded({ ...included, triples: s });
  };

  const expand = (id: string) => {
    const s = new Set(expanded);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setExpanded(s);
  };

  const totalIncluded = included.create.size + included.update.size + included.triples.size;

  const apply = (all: boolean) => {
    setError(null);
    const sel = all
      ? {
          create: plan.create.map((c) => c.id),
          update: plan.update.map((u) => u.id),
          triples: plan.triples.map((_, i) => i),
        }
      : {
          create: Array.from(included.create),
          update: Array.from(included.update),
          triples: Array.from(included.triples),
        };
    startTransition(async () => {
      const r = await applyImport({ id: plan.id, selected: sel });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/import");
    });
  };

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      const r = await discardImport(plan.id);
      if (!r.ok) setError(r.error);
      else router.push("/import");
    });
  };

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <Link
        href="/import"
        className="btn ghost sm"
        style={{
          textDecoration: "none",
          display: "inline-flex",
          marginBottom: 16,
          marginLeft: -8,
        }}
      >
        ← Importar
      </Link>

      <header
        style={{
          marginBottom: 24,
          paddingBottom: 22,
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <Eyebrow>Rufino · Import</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15, marginBottom: 6 }}
        >
          {plan.title}
        </h1>
        {plan.subtitle && (
          <p
            className="serif"
            style={{
              fontSize: 15,
              color: "var(--ink-2)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {plan.subtitle}
          </p>
        )}
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 14 }}>
          {plan.meta} · source <span className="mono">{plan.source.original}</span>
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button
            className="btn ghost"
            onClick={cancel}
            disabled={isPending}
          >
            Descartar
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn"
            onClick={() => apply(false)}
            disabled={isPending || totalIncluded === 0}
          >
            {isPending ? "Aplicando…" : `Aplicar selección (${totalIncluded})`}
          </button>
          <button
            className="btn primary"
            onClick={() => apply(true)}
            disabled={isPending}
          >
            Aplicar todo
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 14,
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
      </header>

      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--hair)",
          marginBottom: 18,
        }}
      >
        <TabButton
          label="Crear"
          count={`${included.create.size}/${plan.create.length}`}
          active={tab === "crear"}
          onClick={() => setTab("crear")}
        />
        <TabButton
          label="Updatear"
          count={`${included.update.size}/${plan.update.length}`}
          active={tab === "update"}
          onClick={() => setTab("update")}
        />
        <TabButton
          label="Conexiones"
          count={`${included.triples.size}/${plan.triples.length}`}
          active={tab === "triples"}
          onClick={() => setTab("triples")}
        />
      </div>

      {tab === "crear" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plan.create.length === 0 && (
            <EmptyDashed>El plan no propone crear ninguna entidad.</EmptyDashed>
          )}
          {plan.create.map((item) => {
            const isOpen = expanded.has(item.id);
            const isInc = included.create.has(item.id);
            return (
              <div key={item.id} className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 18px",
                  }}
                >
                  <CB done={isInc} onClick={() => toggle("create", item.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <EntityTag kind={item.kind} />
                      <span
                        className="mono"
                        style={{ fontSize: 11.5, color: "var(--ink-3)" }}
                      >
                        {item.path}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        lineHeight: 1.55,
                        ...(isOpen
                          ? {}
                          : {
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }),
                      }}
                    >
                      {item.preview}
                    </div>
                  </div>
                  <button
                    className="btn ghost sm"
                    onClick={() => expand(item.id)}
                  >
                    {isOpen ? "Cerrar" : "Ver más"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "update" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {plan.update.length === 0 ? (
            <EmptyDashed>
              No hay updates propuestos. La generación con LLM en futuras versiones va a sugerir patches a páginas existentes.
            </EmptyDashed>
          ) : (
            plan.update.map((item) => {
              const isInc = included.update.has(item.id);
              return (
                <div key={item.id} className="card" style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--hair-soft)",
                    }}
                  >
                    <CB done={isInc} onClick={() => toggle("update", item.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontSize: 14.5, fontWeight: 500 }}>
                        {item.target}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}
                      >
                        {item.path}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-2)", padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {item.diff.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            background:
                              d.type === "add"
                                ? "rgba(91,138,90,0.10)"
                                : "transparent",
                            borderLeft:
                              d.type === "add"
                                ? "2px solid var(--green)"
                                : "2px solid transparent",
                            padding: "6px 10px",
                            fontSize: 12.5,
                            color: d.type === "add" ? "var(--ink)" : "var(--ink-3)",
                            lineHeight: 1.5,
                          }}
                        >
                          <span
                            className="mono"
                            style={{ marginRight: 8, color: "var(--ink-3)" }}
                          >
                            {d.type === "add" ? "+" : " "}
                          </span>
                          {d.text || (
                            <span style={{ color: "var(--ink-3)" }}>·</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "triples" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 130px 1fr",
              padding: "10px 18px",
              fontSize: 10.5,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              fontWeight: 600,
              borderBottom: "1px solid var(--hair)",
            }}
          >
            <span></span>
            <span>Subject</span>
            <span>Relación</span>
            <span>Object</span>
          </div>
          {plan.triples.length === 0 ? (
            <div style={{ padding: "20px 22px", color: "var(--ink-3)", fontSize: 13 }}>
              Sin triples nuevos.
            </div>
          ) : (
            plan.triples.map((t, i) => {
              const isInc = included.triples.has(i);
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 130px 1fr",
                    gap: 0,
                    alignItems: "center",
                    padding: "12px 18px",
                    borderBottom:
                      i < plan.triples.length - 1
                        ? "1px solid var(--hair-soft)"
                        : "none",
                  }}
                >
                  <CB done={isInc} onClick={() => toggleTriple(i)} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      className="serif"
                      style={{
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.s}
                    </span>
                    <EntityTag kind={t.sKind} />
                  </div>
                  <div>
                    <RelationChip kind={t.r} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      className="serif"
                      style={{
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.o}
                    </span>
                    <EntityTag kind={t.oKind} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CB({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <span
      className={`cb ${done ? "done" : ""}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {done && <span className="cb-mark">✓</span>}
    </span>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 13,
        color: active ? "var(--ink)" : "var(--ink-2)",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        marginBottom: -1,
        cursor: "pointer",
        background: "transparent",
        border: "none",
        borderTop: 0,
        borderLeft: 0,
        borderRight: 0,
        fontWeight: active ? 500 : 400,
        fontFamily: "inherit",
      }}
    >
      {label}
      <span
        style={{
          color: "var(--ink-3)",
          marginLeft: 6,
          fontSize: 11.5,
          fontWeight: 400,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyDashed({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--hair)",
        borderRadius: 8,
        padding: "18px 22px",
        color: "var(--ink-3)",
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
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
