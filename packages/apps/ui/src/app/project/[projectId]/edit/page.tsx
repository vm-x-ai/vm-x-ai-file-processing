import ProjectForm from '@/components/project/form';
import { submitForm } from './actions';
import { Separator } from '@/components/ui/separator';
import { getProject } from '@/clients/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { getErrorMessageFromResponse } from '@/clients/api-utils';

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProject({
    path: {
      project_id: projectId,
    },
  });

  if (!project.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading project</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(project.error)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <h3 className="text-2xl font-bold">Edit Project</h3>
      <Separator />
      <ProjectForm submitAction={submitForm} data={project.data} />
    </div>
  );
}
