import { listProjects } from "@/lib/projects";
import { ProjectsList } from "@/components/projects-list";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return <ProjectsList projects={projects} />;
}
