'use server';

import { FormAction, FormSchema, schema } from '@/components/project/schema';
import { ProjectUpdateRequest } from '@/clients/api/types.gen';
import { revalidatePath } from 'next/cache';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';
import { updateProject } from '@/clients/api';
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

  const updatePayload: ProjectUpdateRequest = {
    name: data.name,
    description: data.description,
  };

  if (!data.id) {
    return {
      ...prevState,
      success: false,
      message: 'Project ID is required',
      data,
    };
  }

  const updatedProject = await updateProject({
    path: {
      project_id: data.id,
    },
    body: updatePayload,
  });

  if (!updatedProject.data) {
    return {
      ...prevState,
      success: false,
      message: getErrorMessageFromResponse(updatedProject.error) ?? 'Failed to update project',
    };
  }

  revalidatePath('/');
  revalidatePath('/project');
  revalidatePath(`/project/${updatedProject.data?.id}`);

  return {
    ...prevState,
    success: true,
    message: 'Project updated successfully',
    data: {
      ...updatedProject.data,
    },
    response: updatedProject.data,
  };
}
