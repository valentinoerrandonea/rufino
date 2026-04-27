import Link from "next/link";
import type { ResolvedTriple, Triple } from "@/lib/triples";
import { RelationChip, EntityTag } from "./relation-chip";

interface Props {
  outgoing: ResolvedTriple[];
  incoming: ResolvedTriple[];
  unresolvedOut?: Triple[];
}

const KIND_HREF: Record<string, (id: string) => string> = {
  nota:     (id) => `/notes/${id}`,
  persona:  (id) => `/people/${id}`,
  proyecto: (id) => `/memory/proyecto/${id}`,
  concepto: (id) => `/memory/concepto/${id}`,
};

function hrefFor(node: { kind: string; id: string }): string | null {
  const fn = KIND_HREF[node.kind];
  return fn ? fn(node.id) : null;
}

export function ConexionesSection({
  outgoing,
  incoming,
  unresolvedOut = [],
}: Props) {
  const total = outgoing.length + incoming.length + unresolvedOut.length;

  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginBottom: 14,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        Conexiones
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          {total}
        </span>
      </h2>

      {total === 0 ? (
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
          Todavía no hay conexiones tipadas. Editá esta entidad y agregá una para empezar.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <Column title="Salientes" rows={outgoing} dir="out" unresolvedOut={unresolvedOut} />
          <Column title="Entrantes" rows={incoming} dir="in" />
        </div>
      )}
    </section>
  );
}

interface ColumnProps {
  title: string;
  rows: ResolvedTriple[];
  dir: "in" | "out";
  unresolvedOut?: Triple[];
}

function Column({ title, rows, dir, unresolvedOut = [] }: ColumnProps) {
  const total = rows.length + (dir === "out" ? unresolvedOut.length : 0);
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {total === 0 ? (
          <div style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--ink-3)" }}>
            Ninguna
          </div>
        ) : (
          <>
            {rows.map((t, i) => {
              const target = dir === "out" ? t.o : t.s;
              const href = hrefFor(target);
              const isLast = i === rows.length - 1 && (dir !== "out" || unresolvedOut.length === 0);
              return (
                <RowInner
                  key={`${target.id}-${i}`}
                  href={href}
                  isLast={isLast}
                  relation={t.r}
                  arrow={dir === "out" ? "→" : "←"}
                  label={target.label}
                  kind={target.kind}
                />
              );
            })}
            {dir === "out" &&
              unresolvedOut.map((t, i) => {
                const isLast = i === unresolvedOut.length - 1;
                return (
                  <RowInner
                    key={`unresolved-${t.o}-${i}`}
                    href={null}
                    isLast={isLast}
                    relation={t.r}
                    arrow="→"
                    label={t.o}
                    kind="?"
                    unresolved
                  />
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}

function RowInner({
  href,
  isLast,
  relation,
  arrow,
  label,
  kind,
  unresolved,
}: {
  href: string | null;
  isLast: boolean;
  relation: string;
  arrow: string;
  label: string;
  kind: string;
  unresolved?: boolean;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: isLast ? "none" : "1px solid var(--hair-soft)",
      }}
    >
      <RelationChip kind={relation} />
      <span style={{ color: "var(--ink-3)", fontSize: 13 }}>{arrow}</span>
      <span
        className="serif"
        style={{
          fontSize: 14,
          color: unresolved ? "var(--ink-3)" : "var(--ink)",
          fontStyle: unresolved ? "italic" : "normal",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {!unresolved && <EntityTag kind={kind} />}
      {unresolved && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--amber)",
            background: "rgba(196, 149, 48, 0.10)",
            padding: "1px 6px",
            borderRadius: 3,
          }}
        >
          unresolved
        </span>
      )}
    </div>
  );

  return href ? (
    <Link
      href={href}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      className="hoverable"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
