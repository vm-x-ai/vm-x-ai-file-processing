'use server';

import {
  FormAction,
  FormSchema,
  schema,
} from '@/components/evaluation-template/schema';
import {
  createEvaluationTemplate,
  HttpEvaluationTemplateCreate,
  HttpEvaluationTemplateUpdate,
  updateEvaluationTemplate,
} from '@/clients/api';
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

    const newEvaluation = await createEvaluationTemplate({
      path: {
        project_id: data.project_id,
      },
      body: createPayload,
    });

    if (!newEvaluation.data) {
      return {
        ...prevState,
        success: false,
        message:
          getErrorMessageFromResponse(newEvaluation.error) ||
          'Failed to create evaluation template',
      };
    }

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

    const updatedEvaluation = await updateEvaluationTemplate({
      path: {
        project_id: data.project_id,
        evaluation_template_id: data.id,
      },
      body: updatePayload,
    });

    if (!updatedEvaluation.data) {
      return {
        ...prevState,
        success: false,
        message:
          getErrorMessageFromResponse(updatedEvaluation.error) ||
          'Failed to update evaluation template',
      };
    }

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
