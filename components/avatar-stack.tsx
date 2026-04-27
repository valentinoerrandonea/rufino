import type { CSSProperties } from "react";

const TINTS: Array<[string, string]> = [
  ["#e8d8c4", "#7a5a3a"],
  ["#dbd0e0", "#5a4a6a"],
  ["#cad7c8", "#3f5a3f"],
  ["#e2c8c0", "#8a4530"],
  ["#d4cab8", "#5a4d35"],
];

interface AvatarProps {
  initials: string;
  size?: number;
  idx?: number;
  style?: CSSProperties;
}

export function Avatar({ initials, size = 22, idx = 0, style }: AvatarProps) {
  const [bg, fg] = TINTS[idx % TINTS.length];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size <= 22 ? 10 : 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        border: "1px solid var(--bg-2)",
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

interface AvatarStackProps {
  people: string[];
  size?: number;
  max?: number;
}

export function AvatarStack({ people, size = 22, max = 3 }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - max;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {visible.map((p, i) => (
        <span
          key={`${p}-${i}`}
          style={{
            marginLeft: i === 0 ? 0 : -6,
            position: "relative",
            zIndex: visible.length - i,
          }}
        >
          <Avatar initials={p} size={size} idx={i} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            marginLeft: -6,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--bg-2)",
            color: "var(--ink-3)",
            border: "1px solid var(--hair)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
