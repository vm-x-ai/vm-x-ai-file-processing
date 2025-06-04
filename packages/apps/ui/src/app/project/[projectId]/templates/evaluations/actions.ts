'use server';

import { fileClassifierApi } from '@/api';
import {
  FormAction,
  FormSchema,
  schema,
} from '@/components/evaluation-template/schema';
import {
  HttpEvaluationTemplateCreate,
  HttpEvaluationTemplateUpdate,
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
    const createPayload: HttpEvaluationTemplateCreate = {
      name: data.name,
      description: data.description,
      system_prompt: data.system_prompt,
      prompt: data.prompt,
      category_id: data.category_name ? undefined : data.category_id,
      category_name: data.category_name || undefined,
      category_description: data.category_description || undefined,
      default: data.default ?? false,
    };

    const newEvaluation = await fileClassifierApi.createEvaluationTemplate(
      {
        project_id: data.project_id,
      },
      createPayload
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation template created successfully',
      data: {
        ...newEvaluation.data,
        category_name: null,
        category_description: null,
        default: data.default ?? false,
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

    const updatePayload: HttpEvaluationTemplateUpdate = {
      name: data.name,
      description: data.description,
      system_prompt: data.system_prompt,
      prompt: data.prompt,
      category_id: data.category_id,
      category_name: data.category_name,
      category_description: data.category_description,
      default: data.default ?? false,
    };

    const updatedEvaluation = await fileClassifierApi.updateEvaluationTemplate(
      {
        project_id: data.project_id,
        evaluation_template_id: data.id,
      },
      updatePayload
    );

    return {
      ...prevState,
      success: true,
      message: 'Evaluation template updated successfully',
      data: {
        ...prevState.data,
        ...updatedEvaluation.data,
        category_name: null,
        category_description: null,
        default: data.default ?? false,
      },
    };
  }
}
