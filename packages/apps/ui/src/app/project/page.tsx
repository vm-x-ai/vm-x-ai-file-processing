import { fileClassifierApi } from '@/api';
import { ProjectList } from '@/components/project/list';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function ProjectPage() {
  const projects = await fileClassifierApi.getProjects();
  return (
    <ProjectList
      projects={projects.data}
      onDeleteAction={async (projectId) => {
        'use server';

        await fileClassifierApi.deleteProject(projectId);

        revalidatePath('/');
        revalidatePath(`/project`);
        revalidatePath(`/project/${projectId}`);
      }}
    />
  );
}
