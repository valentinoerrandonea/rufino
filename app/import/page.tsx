import { listImports } from "@/lib/import";
import { ImportSubmit } from "@/components/import-submit";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const recents = (await listImports()).slice(0, 8);
  return <ImportSubmit recents={recents} />;
}
