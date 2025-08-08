'use server';

import { FormAction, FormSchema, schema } from '@/components/project/schema';
import { createProject, ProjectCreateRequest } from '@/clients/api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';
import { getErrorMessageFromResponse } from '@/clients/api-utils';

ensureServerClientsInitialized();

export async function submitForm(
  prevState: FormAction,
  data: FormSchema
): Promise<FormAction> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ...prevState,
      success: false,
      message: 'Invalid form data',
      data,
    };
  }

  const createPayload: ProjectCreateRequest = {
    name: data.name,
    description: data.description,
  };

  const newProject = await createProject({
    body: createPayload,
  });

  if (!newProject.data) {
    return {
      ...prevState,
      success: false,
      message:
        getErrorMessageFromResponse(newProject.error) ||
        'Failed to create project',
    };
  }

  revalidatePath('/');
  revalidatePath('/project');
  revalidatePath(`/project/${newProject.data.id}`);

  redirect(`/project/${newProject.data.id}`);
}
