'use server';

import { fileClassifierApi } from '@/api';
import { FormAction, FormSchema, schema } from '@/components/evaluation/schema';
import {
  HttpEvaluationCreate,
  HttpEvaluationUpdate,
} from '@/file-classifier-api';

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
    // Prepare payload for creation
    const createPayload: HttpEvaluationCreate = {
      title: data.title,
      description: data.description,
      system_prompt: data.system_prompt,
      prompt: data.prompt,
      evaluation_type: data.evaluation_type,
      evaluation_options: data.evaluation_options,
      parent_evaluation_id: data.parent_evaluation_id,
      parent_evaluation_option: data.parent_evaluation_option,
      category_id: data.category_name ? undefined : data.category_id,
      category_name: data.category_name || undefined,
      category_description: data.category_description || undefined,
      template_id: data.template_id,
    };

    const newEvaluation = await fileClassifierApi.createEvaluation(
      {
        project_id: data.project_id,
      },
      createPayload
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation created successfully',
      data: {
        ...newEvaluation.data,
        category_name: null,
        category_description: null,
      },
    };
  } else {
    // For updates, only include the standard fields
    if (!data.category_id) {
      return {
        ...prevState,
        success: false,
        message: 'Category ID is required',
        data,
      };
    }

    const updatePayload: HttpEvaluationUpdate = {
      title: data.title,
      description: data.description,
      system_prompt: data.system_prompt,
      prompt: data.prompt,
      project_id: data.project_id,
      evaluation_type: data.evaluation_type,
      evaluation_options: data.evaluation_options,
      parent_evaluation_id: data.parent_evaluation_id,
      parent_evaluation_option: data.parent_evaluation_option,
      category_id: data.category_id,
      template_id: data.template_id,
    };

    const updatedEvaluation = await fileClassifierApi.updateEvaluation(
      {
        project_id: data.project_id,
        evaluation_id: data.id,
      },
      updatePayload
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation updated successfully',
      data: {
        ...prevState.data,
        ...updatedEvaluation.data,
        category_name: null,
        category_description: null,
      },
    };
  }
}
