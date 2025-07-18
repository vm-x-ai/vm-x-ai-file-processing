'use server';

import { fileClassifierApi } from '@/api';
import { FormAction, FormSchema, schema } from '@/components/project/schema';
import { ProjectCreateRequest } from '@/file-classifier-api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

  const newProject = await fileClassifierApi.createProject({}, createPayload);

  revalidatePath('/');
  revalidatePath('/project');
  revalidatePath(`/project/${newProject.data.id}`);

  redirect(`/project/${newProject.data.id}`);
}
