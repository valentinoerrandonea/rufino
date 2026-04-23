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

  // Global keyboard shortcuts
  useEffect(() => {
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
  }, [router]);

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
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--hair)",
          background: "var(--bg-2)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 24px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 16,
              fontStyle: "italic",
            }}
          >
            R
          </div>
          <div>
            <div className="serif" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1 }}>
              Rufino
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>segundo cerebro</div>
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
