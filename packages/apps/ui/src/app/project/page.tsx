import { deleteProject, getProjects } from '@/clients/api';
import { getErrorMessageFromResponse } from '@/clients/api-utils';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';
import { ProjectList } from '@/components/project/list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function ProjectPage() {
  const projects = await getProjects();

  if (!projects.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading projects</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(projects.error)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ProjectList
      projects={projects.data}
      onDeleteAction={async (projectId) => {
        'use server';

        ensureServerClientsInitialized();
        await deleteProject({
          path: {
            project_id: projectId,
          },
        });

        revalidatePath('/');
        revalidatePath(`/project`);
        revalidatePath(`/project/${projectId}`);
      }}
    />
  );
}
