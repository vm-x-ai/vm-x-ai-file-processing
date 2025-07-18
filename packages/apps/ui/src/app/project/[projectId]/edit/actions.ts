'use server';

import { fileClassifierApi } from '@/api';
import { FormAction, FormSchema, schema } from '@/components/project/schema';
import { ProjectCreateRequest } from '@/file-classifier-api';
import { revalidatePath } from 'next/cache';

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

  if (!data.id) {
    return {
      ...prevState,
      success: false,
      message: 'Project ID is required',
      data,
    };
  }

  const updatedProject = await fileClassifierApi.updateProject(
    {
      project_id: data.id,
    },
    createPayload
  );

  revalidatePath('/');
  revalidatePath('/project');
  revalidatePath(`/project/${updatedProject.data.id}`);

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
