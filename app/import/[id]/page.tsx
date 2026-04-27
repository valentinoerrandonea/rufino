import { notFound } from "next/navigation";
import { readPendingPlan } from "@/lib/import";
import { ImportReview } from "@/components/import-review";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImportPlanPage({ params }: PageProps) {
  const { id } = await params;
  const plan = await readPendingPlan(id);
  if (!plan) notFound();
  return <ImportReview plan={plan} />;
}
