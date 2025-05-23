import { EvaluationRead } from '@/file-classifier-api';
import { FormActionState } from '@/types/form';
import { z } from 'zod';

export const schema = z.object({
  id: z.string().nullable(),
  project_id: z.string({
    required_error: 'Project ID is required',
  }),
  title: z.string({
    required_error: 'Title is required',
  }),
  description: z.string({
    required_error: 'Description is required',
  }),
  prompt: z.string({
    required_error: 'Prompt is required',
  }),
  system_prompt: z.string().nullable(),
  evaluation_type: z.enum(['enum_choice', 'text', 'boolean']),
  evaluation_options: z.array(z.string()).nullable(),
  parent_evaluation_id: z.string().nullable(),
  parent_evaluation_option: z.string().nullable(),
});

export type FormSchema = z.output<typeof schema>;

export type FormAction = FormActionState<FormSchema, EvaluationRead>;
