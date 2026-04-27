import { readLogEntries } from "@/lib/log";
import { ActividadTimeline } from "@/components/actividad-timeline";

export const dynamic = "force-dynamic";

export default async function ActividadPage() {
  const entries = await readLogEntries({ limit: 500 });
  return <ActividadTimeline entries={entries} />;
}
