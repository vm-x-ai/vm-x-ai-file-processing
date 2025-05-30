import ProjectForm from '@/components/project/form';
import { submitForm } from './actions';
import { Separator } from '@/components/ui/separator';
import { fileClassifierApi } from '@/api';

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await fileClassifierApi.getProject(projectId);

  return (
    <div className="grid grid-cols-1 gap-4">
      <h3 className="text-2xl font-bold">Edit Project</h3>
      <Separator />
      <ProjectForm submitAction={submitForm} data={project.data} />
    </div>
  );
}
