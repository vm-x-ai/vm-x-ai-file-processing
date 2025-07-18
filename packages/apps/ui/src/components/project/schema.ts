import { ProjectRead } from '@/file-classifier-api';
import { FormActionState } from '@/types/form';
import { z } from 'zod';

export const schema = z.object({
  id: z.string().optional(),
  name: z.string({
    required_error: 'Name is required',
  }),
  description: z.string({
    required_error: 'Description is required',
  }),
});

export type FormSchema = z.output<typeof schema>;

export type FormAction = FormActionState<FormSchema, ProjectRead>;
