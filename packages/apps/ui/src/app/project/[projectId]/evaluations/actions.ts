'use server';

import { fileClassifierApi } from '@/api';
import { FormAction, FormSchema, schema } from '@/components/evaluation/schema';

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

  if (!data.id || data.id.startsWith('new_evaluation')) {
    const newEvaluation = await fileClassifierApi.createEvaluation(
      {
        project_id: data.project_id,
      },
      data
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation created successfully',
      data: newEvaluation.data,
    };
  } else {
    const updatedEvaluation = await fileClassifierApi.updateEvaluation(
      {
        project_id: data.project_id,
        evaluation_id: data.id,
      },
      data
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation updated successfully',
      data: updatedEvaluation.data,
    };
  }
}
