import { readGraph } from "@/lib/triples";
import { GraphCanvas } from "@/components/graph-canvas";

export const dynamic = "force-dynamic";

export default async function GrafoPage() {
  const graph = await readGraph();
  // Build serializable shape for the client
  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    kind: n.kind,
  }));
  const edges = graph.resolved.map((t) => ({
    from: t.s.id,
    to: t.o.id,
    r: t.r,
  }));
  return <GraphCanvas nodes={nodes} edges={edges} />;
}
