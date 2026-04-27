import { listConcepts } from "@/lib/concepts";
import { ConceptsList } from "@/components/concepts-list";

export const dynamic = "force-dynamic";

export default async function ConceptosPage() {
  const concepts = await listConcepts();
  return <ConceptsList concepts={concepts} />;
}
