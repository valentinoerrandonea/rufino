import type { CSSProperties } from "react";

export const RELATION_TONES: Record<
  string,
  { fg: string; bg: string }
> = {
  "depends-on":  { fg: "var(--blue)",   bg: "rgba(90,122,160,0.12)" },
  "blocks":      { fg: "var(--red)",    bg: "rgba(180,73,60,0.12)" },
  "caused-by":   { fg: "var(--ink-3)",  bg: "var(--surface-2)" },
  "led-to":      { fg: "var(--green)",  bg: "rgba(91,138,90,0.14)" },
  "references":  { fg: "var(--ink-2)",  bg: "var(--surface-2)" },
  "contradicts": { fg: "var(--red)",    bg: "rgba(180,73,60,0.12)" },
  "refines":     { fg: "var(--accent)", bg: "var(--accent-wash)" },
  "replaces":    { fg: "var(--amber)",  bg: "rgba(196,149,48,0.14)" },
  "decided-by":  { fg: "var(--green)",  bg: "rgba(91,138,90,0.14)" },
  "learned-in":  { fg: "var(--accent)", bg: "var(--accent-wash)" },
};

export function RelationChip({
  kind,
  style,
}: {
  kind: string;
  style?: CSSProperties;
}) {
  const tone = RELATION_TONES[kind] ?? {
    fg: "var(--ink-2)",
    bg: "var(--surface-2)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontWeight: 500,
        letterSpacing: 0.1,
        color: tone.fg,
        background: tone.bg,
        ...style,
      }}
    >
      {kind}
    </span>
  );
}

export const ENTITY_TONES: Record<
  string,
  { fg: string; bg: string; label: string }
> = {
  nota:     { fg: "var(--ink-2)",  bg: "var(--surface-2)",         label: "Nota" },
  persona:  { fg: "var(--green)",  bg: "rgba(91,138,90,0.14)",     label: "Persona" },
  proyecto: { fg: "var(--accent)", bg: "var(--accent-wash)",       label: "Proyecto" },
  concepto: { fg: "var(--blue)",   bg: "rgba(90,122,160,0.12)",    label: "Concepto" },
  source:   { fg: "var(--amber)",  bg: "rgba(196,149,48,0.14)",    label: "Source" },
};

export function EntityTag({
  kind,
  style,
}: {
  kind: string;
  style?: CSSProperties;
}) {
  const t = ENTITY_TONES[kind] ?? ENTITY_TONES.nota;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        borderRadius: 4,
        fontSize: 10.5,
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontWeight: 500,
        textTransform: "lowercase",
        color: t.fg,
        background: t.bg,
        ...style,
      }}
    >
      {t.label.toLowerCase()}
    </span>
  );
}
