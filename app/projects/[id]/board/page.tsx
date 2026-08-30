import { ProjectBoardClient } from "@/components/ProjectBoardClient";

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectBoardClient id={id} />;
}
