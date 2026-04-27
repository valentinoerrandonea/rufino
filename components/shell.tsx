"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "./theme-provider";
import { TweaksPanel } from "./tweaks-panel";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const isOnboarding = pathname.startsWith("/onboarding");

  // Global keyboard shortcuts (disabled during onboarding)
  useEffect(() => {
    if (isOnboarding) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        e.preventDefault();
        router.push("/capture/nota");
      } else if (k === "p") {
        e.preventDefault();
        router.push("/capture/persona");
      } else if (k === "t") {
        e.preventDefault();
        router.push("/capture/pendiente");
      } else if (k === "h") {
        e.preventDefault();
        router.push("/");
      } else if (k === "escape") {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, isOnboarding]);

  if (isOnboarding) return <>{children}</>;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const rufinoNav = [
    { label: "Inicio", href: "/" },
    { label: "Notas", href: "/notes" },
    { label: "Pendientes", href: "/pendientes" },
    { label: "Personas", href: "/people" },
  ];

  const memoryNav = [
    { label: "Perfil", href: "/memory/perfil" },
    { label: "Preferencias", href: "/memory/preferencias" },
    { label: "Stack", href: "/memory/stack" },
    { label: "Proyectos", href: "/memory/proyectos" },
  ];

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <div
        className="drag-region"
        style={{
          height: 36,
          flexShrink: 0,
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--hair-soft)",
        }}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "220px 1fr",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid var(--hair)",
            background: "var(--bg-2)",
            display: "flex",
            flexDirection: "column",
            padding: "16px 14px",
            overflow: "auto",
          }}
        >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 8px 20px",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <path d="M16 8 2 22" />
              <path d="M17.5 15H9" />
            </svg>
          </div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1 }}>
            Rufino
          </div>
        </div>

        <SectionLabel>Rufino</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {rufinoNav.map((n) => (
            <NavItem key={n.href} href={n.href} active={isActive(n.href)}>
              {n.label}
            </NavItem>
          ))}
        </nav>

        <SectionLabel style={{ marginTop: 24 }}>Memoria</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {memoryNav.map((n) => (
            <NavItem key={n.href} href={n.href} active={isActive(n.href)}>
              {n.label}
            </NavItem>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <NavItem href="/settings" active={isActive("/settings")}>
          Configuración
        </NavItem>

        <button
          onClick={toggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 6,
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--ink-2)",
            fontSize: 12,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span>{theme === "light" ? "☾" : "☀"}</span>
          <span>{theme === "light" ? "Tema oscuro" : "Tema claro"}</span>
        </button>

        <button
          onClick={() => setTweaksOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 6,
            background: tweaksOpen ? "var(--surface)" : "transparent",
            border: tweaksOpen ? "1px solid var(--hair)" : "1px solid transparent",
            color: tweaksOpen ? "var(--ink)" : "var(--ink-2)",
            fontSize: 12,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { if (!tweaksOpen) e.currentTarget.style.background = "var(--surface-2)"; }}
          onMouseLeave={(e) => { if (!tweaksOpen) e.currentTarget.style.background = "transparent"; }}
        >
          <span>⚙</span>
          <span>Ajustes</span>
        </button>

        <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
      </aside>

        <main style={{ overflow: "auto", position: "relative" }}>{children}</main>
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        color: "var(--ink-3)",
        padding: "0 10px 8px",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 6,
        background: active ? "var(--surface)" : "transparent",
        border: active ? "1px solid var(--hair)" : "1px solid transparent",
        color: active ? "var(--ink)" : "var(--ink-2)",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        textDecoration: "none",
        transition: "all 0.12s",
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
    </Link>
  );
}
