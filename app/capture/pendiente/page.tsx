import { listMentionables, listProjectTags } from "@/app/actions";
import { CaptureForm } from "./capture-form";

export const dynamic = "force-dynamic";

export default async function CapturePendiente() {
  const [mentionables, projectTags] = await Promise.all([
    listMentionables(),
    listProjectTags(),
  ]);

  return (
    <CaptureForm
      mentionables={mentionables}
      projectTags={projectTags}
    />
  );
}
