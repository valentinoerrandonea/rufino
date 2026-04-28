"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { RELATION_TONES, ENTITY_TONES, EntityTag, RelationChip } from "./relation-chip";

const RELATION_KINDS = [
  "depends-on",
  "led-to",
  "blocks",
  "references",
  "refines",
  "decided-by",
  "learned-in",
  "caused-by",
  "contradicts",
  "replaces",
] as const;

const ENTITY_KINDS = ["nota", "persona", "proyecto", "concepto"] as const;

const KIND_COLORS: Record<string, { fg: string; ring: string; bg: string }> = {
  nota:     { fg: "var(--ink-2)",  ring: "var(--ink-dim)", bg: "var(--surface-2)" },
  persona:  { fg: "var(--green)",  ring: "var(--green)",   bg: "rgba(91,138,90,0.18)" },
  proyecto: { fg: "var(--accent)", ring: "var(--accent)",  bg: "var(--accent-wash)" },
  concepto: { fg: "var(--blue)",   ring: "var(--blue)",    bg: "rgba(90,122,160,0.18)" },
  source:   { fg: "var(--amber)",  ring: "var(--amber)",   bg: "rgba(196,149,48,0.18)" },
};

interface NodeIn {
  id: string;
  label: string;
  kind: string;
}

interface EdgeIn {
  from: string;
  to: string;
  r: string;
}

interface SimNode extends NodeIn {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

const W = 1100;
const H = 620;
const REPULSE = 5200;
const SPRING_K = 0.035;
const SPRING_LEN = 170;
const CENTER_K = 0.012;
const FRICTION = 0.86;
const MAX_V = 32;

function computeDegrees(nodes: NodeIn[], edges: EdgeIn[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const n of nodes) m[n.id] = 0;
  for (const e of edges) {
    m[e.from] = (m[e.from] ?? 0) + 1;
    m[e.to] = (m[e.to] ?? 0) + 1;
  }
  return m;
}

function useForceLayout(
  nodes: NodeIn[],
  edges: EdgeIn[],
  resetKey: number,
): {
  positions: Record<string, { x: number; y: number }>;
  reheat: () => void;
  setFixed: (id: string, x: number | null, y?: number) => void;
} {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const stateRef = useRef<{ nodes: SimNode[]; edges: EdgeIn[]; raf: number | null }>({
    nodes: [],
    edges: [],
    raf: null,
  });

  useEffect(() => {
    const prior = stateRef.current.nodes.reduce<Record<string, { x: number; y: number }>>(
      (m, n) => {
        m[n.id] = { x: n.x, y: n.y };
        return m;
      },
      {},
    );

    const sim: SimNode[] = nodes.map((n, i) => {
      const p = prior[n.id];
      if (p) return { ...n, x: p.x, y: p.y, vx: 0, vy: 0, fx: null, fy: null };
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const r = Math.min(W, H) * 0.28;
      return {
        ...n,
        x: W / 2 + Math.cos(a) * r + (Math.random() - 0.5) * 30,
        y: H / 2 + Math.sin(a) * r + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
    stateRef.current.nodes = sim;
    stateRef.current.edges = edges;
    const idIndex: Record<string, number> = {};
    sim.forEach((n, i) => (idIndex[n.id] = i));

    let alpha = 1;
    const tick = () => {
      const ns = stateRef.current.nodes;
      const fx = new Array(ns.length).fill(0);
      const fy = new Array(ns.length).fill(0);

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            d2 = 1;
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
          }
          const f = REPULSE / d2;
          const d = Math.sqrt(d2);
          const fxv = (dx / d) * f;
          const fyv = (dy / d) * f;
          fx[i] -= fxv;
          fy[i] -= fyv;
          fx[j] += fxv;
          fy[j] += fyv;
        }
      }
      // Springs
      for (const e of stateRef.current.edges) {
        const i = idIndex[e.from];
        const j = idIndex[e.to];
        if (i == null || j == null) continue;
        const dx = ns[j].x - ns[i].x;
        const dy = ns[j].y - ns[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - SPRING_LEN) * SPRING_K;
        const fxv = (dx / d) * f;
        const fyv = (dy / d) * f;
        fx[i] += fxv;
        fy[i] += fyv;
        fx[j] -= fxv;
        fy[j] -= fyv;
      }
      // Center gravity
      for (let i = 0; i < ns.length; i++) {
        fx[i] += (W / 2 - ns[i].x) * CENTER_K;
        fy[i] += (H / 2 - ns[i].y) * CENTER_K;
      }
      // Integrate
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.fx != null && n.fy != null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx = (n.vx + fx[i] * alpha) * FRICTION;
        n.vy = (n.vy + fy[i] * alpha) * FRICTION;
        const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (sp > MAX_V) {
          n.vx *= MAX_V / sp;
          n.vy *= MAX_V / sp;
        }
        n.x += n.vx;
        n.y += n.vy;
        // No boundary clamp — the user can pan/zoom; clamping bunches isolated
        // nodes against the edges and produces visible stripes when most of
        // the graph has degree 0.
      }
      alpha *= 0.992;

      const next: Record<string, { x: number; y: number }> = {};
      for (const n of ns) next[n.id] = { x: n.x, y: n.y };
      setPositions(next);

      if (alpha > 0.02) {
        stateRef.current.raf = requestAnimationFrame(tick);
      } else {
        stateRef.current.raf = null;
      }
    };

    stateRef.current.raf = requestAnimationFrame(tick);
    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const reheat = useCallback(() => {
    if (stateRef.current.raf) return;
    let alpha = 0.4;
    const ns = stateRef.current.nodes;
    const idIndex: Record<string, number> = {};
    ns.forEach((n, i) => (idIndex[n.id] = i));
    const tick = () => {
      const fx = new Array(ns.length).fill(0);
      const fy = new Array(ns.length).fill(0);
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            d2 = 1;
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
          }
          const d = Math.sqrt(d2);
          const f = REPULSE / d2;
          fx[i] -= (dx / d) * f;
          fy[i] -= (dy / d) * f;
          fx[j] += (dx / d) * f;
          fy[j] += (dy / d) * f;
        }
      }
      for (const e of stateRef.current.edges) {
        const i = idIndex[e.from];
        const j = idIndex[e.to];
        if (i == null || j == null) continue;
        const dx = ns[j].x - ns[i].x;
        const dy = ns[j].y - ns[i].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - SPRING_LEN) * SPRING_K;
        fx[i] += (dx / d) * f;
        fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f;
        fy[j] -= (dy / d) * f;
      }
      for (let i = 0; i < ns.length; i++) {
        fx[i] += (W / 2 - ns[i].x) * CENTER_K;
        fy[i] += (H / 2 - ns[i].y) * CENTER_K;
      }
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.fx != null && n.fy != null) {
          n.x = n.fx;
          n.y = n.fy;
          continue;
        }
        n.vx = (n.vx + fx[i] * alpha) * FRICTION;
        n.vy = (n.vy + fy[i] * alpha) * FRICTION;
        const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (sp > MAX_V) {
          n.vx *= MAX_V / sp;
          n.vy *= MAX_V / sp;
        }
        n.x += n.vx;
        n.y += n.vy;
        // No boundary clamp — the user can pan/zoom; clamping bunches isolated
        // nodes against the edges and produces visible stripes when most of
        // the graph has degree 0.
      }
      alpha *= 0.985;
      const next: Record<string, { x: number; y: number }> = {};
      for (const n of ns) next[n.id] = { x: n.x, y: n.y };
      setPositions(next);
      if (alpha > 0.02) stateRef.current.raf = requestAnimationFrame(tick);
      else stateRef.current.raf = null;
    };
    stateRef.current.raf = requestAnimationFrame(tick);
  }, []);

  const setFixed = useCallback((id: string, x: number | null, y?: number) => {
    const n = stateRef.current.nodes.find((nn) => nn.id === id);
    if (!n) return;
    if (x == null) {
      n.fx = null;
      n.fy = null;
      return;
    }
    n.fx = x;
    n.fy = y ?? null;
    n.x = x;
    if (y != null) n.y = y;
    setPositions((p) => ({ ...p, [id]: { x, y: y ?? n.y } }));
  }, []);

  return { positions, reheat, setFixed };
}

const HREF_FOR: Record<string, (id: string) => string> = {
  nota:     (id) => `/notes/${id}`,
  persona:  (id) => `/people/${id}`,
  proyecto: (id) => `/memory/proyecto/${id}`,
  concepto: (id) => `/memory/concepto/${id}`,
};

export function GraphCanvas({
  nodes: rawNodes,
  edges: rawEdges,
}: {
  nodes: NodeIn[];
  edges: EdgeIn[];
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeRels, setActiveRels] = useState<Set<string>>(new Set(RELATION_KINDS));
  const [activeKinds, setActiveKinds] = useState<Set<string>>(new Set(ENTITY_KINDS));
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [search, setSearch] = useState("");
  // Mirror of panRef "is currently panning" state — needed in render so the
  // cursor reflects pan state without reading the ref during render (which
  // is impure per the new React lint).
  const [isPanning, setIsPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragNodeRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(
    null,
  );
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const filteredNodes = useMemo(
    () => rawNodes.filter((n) => activeKinds.has(n.kind)),
    [rawNodes, activeKinds],
  );
  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return rawEdges.filter((e) => activeRels.has(e.r) && ids.has(e.from) && ids.has(e.to));
  }, [rawEdges, filteredNodes, activeRels]);
  const degrees = useMemo(
    () => computeDegrees(filteredNodes, filteredEdges),
    [filteredNodes, filteredEdges],
  );

  const resetKey = useMemo(
    () => filteredNodes.length * 1000 + filteredEdges.length,
    [filteredNodes.length, filteredEdges.length],
  );

  const { positions, reheat, setFixed } = useForceLayout(
    filteredNodes,
    filteredEdges,
    resetKey,
  );

  const focused = hovered ?? selected;
  const focusedNode = focused ? filteredNodes.find((n) => n.id === focused) ?? null : null;

  const adj = useMemo(() => {
    if (!focused) return null;
    const s = new Set([focused]);
    for (const e of filteredEdges) {
      if (e.from === focused) s.add(e.to);
      if (e.to === focused) s.add(e.from);
    }
    return s;
  }, [focused, filteredEdges]);

  const searchMatchSet = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      filteredNodes
        .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
        .map((n) => n.id),
    );
  }, [search, filteredNodes]);

  const clientToWorld = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * W;
    const sy = ((cy - r.top) / r.height) * H;
    return { x: (sx - transform.x) / transform.k, y: (sy - transform.y) / transform.k };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = svgRef.current!.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    const my = ((e.clientY - r.top) / r.height) * H;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newK = Math.max(0.4, Math.min(3, transform.k * factor));
    const newX = mx - (mx - transform.x) * (newK / transform.k);
    const newY = my - (my - transform.y) * (newK / transform.k);
    setTransform({ k: newK, x: newX, y: newY });
  };

  const onMouseDownBg = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && (e.target as Element).tagName !== "rect") return;
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y };
    setIsPanning(true);
    setSelected(null);
  };

  const onMouseDownNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const w = clientToWorld(e.clientX, e.clientY);
    const p = positions[id];
    if (!p) return;
    dragNodeRef.current = { id, dx: w.x - p.x, dy: w.y - p.y, moved: false };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragNodeRef.current) {
      const w = clientToWorld(e.clientX, e.clientY);
      const { id, dx, dy } = dragNodeRef.current;
      setFixed(id, w.x - dx, w.y - dy);
      dragNodeRef.current.moved = true;
    } else if (panRef.current) {
      setTransform((t) => ({
        ...t,
        x: panRef.current!.ox + (e.clientX - panRef.current!.sx),
        y: panRef.current!.oy + (e.clientY - panRef.current!.sy),
      }));
    }
  };

  const onMouseUp = () => {
    if (dragNodeRef.current) {
      const { id, moved } = dragNodeRef.current;
      if (!moved) setSelected((s) => (s === id ? null : id));
      dragNodeRef.current = null;
      reheat();
    }
    panRef.current = null;
    setIsPanning(false);
  };

  const resetView = () => setTransform({ k: 1, x: 0, y: 0 });
  const zoomIn = () => setTransform((t) => ({ ...t, k: Math.min(3, t.k * 1.2) }));
  const zoomOut = () => setTransform((t) => ({ ...t, k: Math.max(0.4, t.k / 1.2) }));

  const toggleRel = (r: string) => {
    const s = new Set(activeRels);
    if (s.has(r)) s.delete(r);
    else s.add(r);
    setActiveRels(s);
  };
  const toggleKind = (k: string) => {
    const s = new Set(activeKinds);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    setActiveKinds(s);
  };

  const focusedOut = focusedNode
    ? filteredEdges
        .filter((e) => e.from === focused)
        .map((e) => ({
          r: e.r,
          target: rawNodes.find((n) => n.id === e.to)?.label ?? e.to,
          kind: rawNodes.find((n) => n.id === e.to)?.kind ?? "nota",
          id: e.to,
        }))
    : [];
  const focusedIn = focusedNode
    ? filteredEdges
        .filter((e) => e.to === focused)
        .map((e) => ({
          r: e.r,
          target: rawNodes.find((n) => n.id === e.from)?.label ?? e.from,
          kind: rawNodes.find((n) => n.id === e.from)?.kind ?? "nota",
          id: e.from,
        }))
    : [];

  const nodeRadius = (deg: number) => 14 + Math.min(deg, 8) * 2;

  const goTo = (id: string, kind: string) => {
    const fn = HREF_FOR[kind];
    if (fn) router.push(fn(id));
  };

  return (
    <div style={{ padding: "32px 40px 60px", maxWidth: 1280, margin: "0 auto" }}>
      <header style={{ marginBottom: 18 }}>
        <Eyebrow>Memoria · Grafo</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Grafo
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-2)",
            marginTop: 8,
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Conexiones tipadas entre todas las entidades del vault. Arrastrá nodos, scroll para zoom, click para abrirlos.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {ENTITY_KINDS.map((k) => {
            const c = KIND_COLORS[k];
            const active = activeKinds.has(k);
            return (
              <span
                key={k}
                onClick={() => toggleKind(k)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: active ? c.bg : "transparent",
                  color: active ? c.fg : "var(--ink-3)",
                  border: `1px solid ${active ? "transparent" : "var(--hair)"}`,
                  textTransform: "capitalize",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c.ring,
                    opacity: active ? 1 : 0.4,
                  }}
                />
                {k}s
              </span>
            );
          })}
        </div>
        <div style={{ width: 1, height: 18, background: "var(--hair)" }} />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {RELATION_KINDS.map((r) => {
            const active = activeRels.has(r);
            const tone = RELATION_TONES[r] ?? { fg: "var(--ink-2)", bg: "var(--surface-2)" };
            return (
              <span
                key={r}
                onClick={() => toggleRel(r)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  color: active ? tone.fg : "var(--ink-3)",
                  background: active ? tone.bg : "transparent",
                  border: `1px solid ${active ? "transparent" : "var(--hair)"}`,
                  opacity: active ? 1 : 0.6,
                }}
              >
                {r}
              </span>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", width: 200 }}>
          <SearchIcon />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar entidad…"
            style={{ paddingLeft: 32, fontSize: 12.5 }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--bg-2)",
            border: "1px solid var(--hair)",
            boxShadow: "var(--shadow-sm)",
            height: 620,
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              cursor: isPanning ? "grabbing" : "grab",
              userSelect: "none",
            }}
            onWheel={onWheel}
            onMouseDown={onMouseDownBg}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="var(--hair)" opacity="0.45" />
              </pattern>
            </defs>

            <rect
              x={-2000}
              y={-2000}
              width={W + 4000}
              height={H + 4000}
              fill="url(#grid)"
            />

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
              {filteredEdges.map((e, i) => {
                const a = positions[e.from];
                const b = positions[e.to];
                if (!a || !b) return null;
                const tone =
                  RELATION_TONES[e.r] ?? {
                    fg: "var(--ink-3)",
                    bg: "var(--surface-2)",
                  };
                const dim = focused !== null && e.from !== focused && e.to !== focused;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={tone.fg}
                    strokeWidth={1.1}
                    strokeOpacity={dim ? 0.08 : 0.55}
                    style={{ transition: "stroke-opacity 0.15s" }}
                  />
                );
              })}
              {filteredNodes.map((n) => {
                const p = positions[n.id];
                if (!p) return null;
                const c = KIND_COLORS[n.kind] ?? KIND_COLORS.nota;
                const r = nodeRadius(degrees[n.id] ?? 0);
                const isSel = selected === n.id;
                const isHov = hovered === n.id;
                const dim = focused !== null && (adj && !adj.has(n.id));
                const isMatch = searchMatchSet ? searchMatchSet.has(n.id) : true;
                const opacity = (dim ? 0.18 : 1) * (isMatch ? 1 : 0.25);
                const showLabel = transform.k > 0.85 || isHov || isSel;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    style={{
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onMouseDown={(e) => onMouseDownNode(n.id, e)}
                    onDoubleClick={() => goTo(n.id, n.kind)}
                  >
                    {(isSel || isHov) && (
                      <circle
                        r={r + 5}
                        fill="none"
                        stroke={c.ring}
                        strokeWidth={isSel ? 1.8 : 1.2}
                        strokeOpacity={0.45}
                      />
                    )}
                    <circle r={r} fill={c.bg} stroke={c.ring} strokeWidth={1.3} />
                    {showLabel && (
                      <text
                        x={0}
                        y={r + 13}
                        textAnchor="middle"
                        fontSize={11}
                        fontFamily="var(--font-serif)"
                        fontWeight={500}
                        fill="var(--ink)"
                        style={{ pointerEvents: "none" }}
                        paintOrder="stroke"
                        stroke="var(--bg-2)"
                        strokeWidth={3}
                      >
                        {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <div
            style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "var(--surface)",
              borderRadius: 8,
              border: "1px solid var(--hair)",
              padding: 4,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <ZoomBtn onClick={zoomIn}>+</ZoomBtn>
            <div style={{ height: 1, background: "var(--hair-soft)", margin: "0 4px" }} />
            <ZoomBtn onClick={zoomOut}>−</ZoomBtn>
            <div style={{ height: 1, background: "var(--hair-soft)", margin: "0 4px" }} />
            <ZoomBtn onClick={resetView} small>⌂</ZoomBtn>
          </div>

          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 11,
              color: "var(--ink-3)",
              background: "var(--surface)",
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--hair)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span>
              <b style={{ color: "var(--ink)", fontFamily: "var(--font-serif)", fontWeight: 500 }}>
                {filteredNodes.length}
              </b>{" "}
              nodos
            </span>
            <span style={{ color: "var(--hair)" }}>·</span>
            <span>
              <b style={{ color: "var(--ink)", fontFamily: "var(--font-serif)", fontWeight: 500 }}>
                {filteredEdges.length}
              </b>{" "}
              conexiones
            </span>
            <span style={{ color: "var(--hair)" }}>·</span>
            <span className="mono">zoom {Math.round(transform.k * 100)}%</span>
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 16, minHeight: 620, fontSize: 12.5, color: "var(--ink-3)" }}
        >
          {!focusedNode ? (
            <SidebarHelp />
          ) : (
            <SidebarFocus
              node={focusedNode}
              degree={degrees[focusedNode.id] ?? 0}
              outgoing={focusedOut}
              incoming={focusedIn}
              onTargetClick={(id) => setSelected(id)}
              onOpen={() => goTo(focusedNode.id, focusedNode.kind)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ZoomBtn({
  onClick,
  children,
  small,
}: {
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        padding: 0,
        border: "none",
        background: "transparent",
        fontSize: small ? 11 : 16,
        color: "var(--ink-2)",
        cursor: "pointer",
        borderRadius: 4,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function SidebarHelp() {
  return (
    <div style={{ lineHeight: 1.65 }}>
      <div
        className="serif"
        style={{
          fontSize: 14.5,
          color: "var(--ink-2)",
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        Cómo navegar
      </div>
      <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12.5 }}>
        <li style={{ marginBottom: 6 }}>Pasá el mouse sobre un nodo para ver sus vecinos.</li>
        <li style={{ marginBottom: 6 }}>Click para fijar la selección.</li>
        <li style={{ marginBottom: 6 }}>Doble click abre la página del nodo.</li>
        <li style={{ marginBottom: 6 }}>Arrastrá un nodo para reposicionarlo.</li>
        <li style={{ marginBottom: 6 }}>Scroll para zoom, drag del fondo para pan.</li>
        <li>Filtrá por tipo de entidad o relación arriba.</li>
      </ul>
      <div style={{ height: 1, background: "var(--hair-soft)", margin: "20px 0" }} />
      <div
        style={{
          fontSize: 10.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Leyenda
      </div>
      {ENTITY_KINDS.map((k) => {
        const c = KIND_COLORS[k];
        return (
          <div
            key={k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
              fontSize: 12,
              color: "var(--ink-2)",
              textTransform: "capitalize",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: c.bg,
                border: `1.5px solid ${c.ring}`,
              }}
            />
            {k}s
          </div>
        );
      })}
    </div>
  );
}

function SidebarFocus({
  node,
  degree,
  outgoing,
  incoming,
  onTargetClick,
  onOpen,
}: {
  node: { id: string; label: string; kind: string };
  degree: number;
  outgoing: Array<{ r: string; target: string; kind: string; id: string }>;
  incoming: Array<{ r: string; target: string; kind: string; id: string }>;
  onTargetClick: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <div>
      <EntityTag kind={node.kind} />
      <h3
        className="serif"
        style={{ fontSize: 18, fontWeight: 500, marginTop: 8, marginBottom: 4, color: "var(--ink)" }}
      >
        {node.label}
      </h3>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 14 }}>
        {degree} {degree === 1 ? "conexión" : "conexiones"}
      </div>
      {outgoing.length > 0 && (
        <FocusList
          label="Salientes"
          rows={outgoing}
          arrow="→"
          onTargetClick={onTargetClick}
        />
      )}
      {incoming.length > 0 && (
        <FocusList
          label="Entrantes"
          rows={incoming}
          arrow="←"
          onTargetClick={onTargetClick}
        />
      )}
      <button
        type="button"
        className="btn sm"
        style={{ width: "100%", marginTop: 6 }}
        onClick={onOpen}
      >
        Abrir página completa →
      </button>
    </div>
  );
}

function FocusList({
  label,
  rows,
  arrow,
  onTargetClick,
}: {
  label: string;
  rows: Array<{ r: string; target: string; kind: string; id: string }>;
  arrow: string;
  onTargetClick: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {rows.map((t, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 7,
            fontSize: 12,
          }}
        >
          <RelationChip kind={t.r} />
          <span style={{ color: "var(--ink-3)" }}>{arrow}</span>
          <span
            className="serif"
            style={{
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onClick={() => onTargetClick(t.id)}
          >
            {t.target}
          </span>
        </div>
      ))}
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

function SearchIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--ink-3)",
        pointerEvents: "none",
      }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
