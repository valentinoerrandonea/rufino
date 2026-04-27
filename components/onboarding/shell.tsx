"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
} from "./icons";

export const ONB_FONT = "'Newsreader', Georgia, serif";

export function TrafficLights({ onClose }: { onClose?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
      }}
    >
      <button
        onClick={onClose}
        title="cerrar"
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#ff5f57",
          border: "0.5px solid rgba(0,0,0,0.15)",
          cursor: "pointer",
          padding: 0,
        }}
      />
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#febc2e",
          border: "0.5px solid rgba(0,0,0,0.15)",
        }}
      />
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#28c940",
          border: "0.5px solid rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

export function Dots({ active, total = 6 }: { active: number; total?: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === active;
        const isPast = i < active;
        return (
          <div
            key={i}
            style={{
              width: isActive ? 18 : 6,
              height: 6,
              borderRadius: 4,
              background: isActive
                ? "var(--accent)"
                : isPast
                  ? "var(--ink-2)"
                  : "var(--ink-dim)",
              opacity: isActive ? 1 : isPast ? 0.55 : 0.4,
              transition: "all 0.35s cubic-bezier(.4,.0,.2,1)",
            }}
          />
        );
      })}
    </div>
  );
}

export function OnbHeader({
  step,
  totalSteps,
  canBack,
  onBack,
  banner,
}: {
  step: number;
  totalSteps: number;
  canBack: boolean;
  onBack: () => void;
  banner?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 16px 16px",
        flexShrink: 0,
      }}
    >
      <TrafficLights />
      <div style={{ height: 14 }} />
      <Dots active={step} total={totalSteps} />
      {canBack ? (
        <button
          onClick={onBack}
          className="onb-back-btn"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--ink-3)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          <IconArrowLeft size={13} sw={1.7} /> Atrás
        </button>
      ) : null}
      {banner}
    </div>
  );
}

export function RecoveryBanner() {
  return (
    <div
      style={{
        margin: "14px 28px 0",
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--accent-wash)",
        border: "1px solid rgba(176,104,54,0.25)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 12.5,
        color: "var(--ink-2)",
      }}
    >
      <IconAlert
        size={14}
        sw={1.7}
        stroke="var(--accent)"
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      <span>
        <b style={{ color: "var(--ink)" }}>Algo cambió desde la última vez.</b>{" "}
        Confirmemos que todo siga en orden.
      </span>
    </div>
  );
}

export function StepBody({
  children,
  stepKey,
}: {
  children: ReactNode;
  stepKey: string;
}) {
  return (
    <div
      key={stepKey}
      className="onb-fade"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

export function StepActions({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 28px 24px",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Code({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 12.5,
        padding: "10px 14px",
        borderRadius: 6,
        background: "var(--surface-2)",
        color: "var(--ink)",
        border: "1px solid var(--hair)",
        whiteSpace: "pre",
        overflow: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type BtnKind = "primary" | "secondary" | "ghost";
type BtnSize = "md" | "lg";

const btnVariants: Record<BtnKind, CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "#fff",
    borderColor: "var(--accent)",
  },
  secondary: {
    background: "var(--surface)",
    color: "var(--ink)",
    borderColor: "var(--hair)",
  },
  ghost: { background: "transparent", color: "var(--ink-2)" },
};

const btnHover: Record<BtnKind, CSSProperties> = {
  primary: {
    background: "var(--accent-2)",
    borderColor: "var(--accent-2)",
  },
  secondary: {
    background: "var(--surface-2)",
    borderColor: "var(--ink-dim)",
  },
  ghost: { background: "var(--surface-2)", color: "var(--ink)" },
};

export function Btn({
  kind = "primary",
  icon,
  iconRight,
  children,
  onClick,
  disabled,
  full,
  style,
  size = "md",
}: {
  kind?: BtnKind;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  style?: CSSProperties;
  size?: BtnSize;
}) {
  const padding = size === "lg" ? "10px 18px" : "8px 14px";
  const fontSize = size === "lg" ? 14 : 13;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding,
    borderRadius: 8,
    fontSize,
    fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.12s",
    fontFamily: "inherit",
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid transparent",
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...btnVariants[kind], ...style }}
      onMouseEnter={(e) => {
        if (!disabled) Object.assign(e.currentTarget.style, btnHover[kind]);
      }}
      onMouseLeave={(e) => {
        if (!disabled) Object.assign(e.currentTarget.style, btnVariants[kind]);
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function OptionCard({
  icon,
  label,
  sub,
  onClick,
  selected,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 10,
        border: `1px solid ${selected ? "var(--accent)" : "var(--hair)"}`,
        background: selected ? "var(--accent-wash)" : "var(--surface)",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--ink-dim)";
          e.currentTarget.style.background = "var(--surface-2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--hair)";
          e.currentTarget.style.background = "var(--surface)";
        }
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          background: selected ? "var(--accent)" : "var(--surface-2)",
          color: selected ? "#fff" : "var(--ink-2)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      </div>
      <IconArrowRight size={16} stroke="var(--ink-3)" />
    </button>
  );
}

export function StatusRow({
  label,
  value,
  ok,
  monoValue,
}: {
  label: string;
  value: string;
  ok?: boolean;
  monoValue?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 0",
        borderBottom: "1px solid var(--hair-soft)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--ink-3)",
          width: 110,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div
        className={monoValue ? "mono" : ""}
        style={{
          flex: 1,
          fontSize: monoValue ? 12.5 : 13.5,
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {ok && (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--green)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconCheck size={13} sw={2.5} />
        </div>
      )}
    </div>
  );
}
