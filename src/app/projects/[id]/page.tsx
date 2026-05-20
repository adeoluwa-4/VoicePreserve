import { ProjectEditorClient } from "@/components/ProjectEditorClient";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Params) {
  const { id } = await params;
  return <ProjectEditorClient projectId={id} />;
}
