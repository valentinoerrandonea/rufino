import { readLatestLint, listLintRuns } from "@/lib/lint";
import { SaludScreen } from "@/components/salud-screen";

export const dynamic = "force-dynamic";

export default async function SaludPage() {
  const [report, history] = await Promise.all([readLatestLint(), listLintRuns()]);
  return <SaludScreen report={report} history={history} />;
}
