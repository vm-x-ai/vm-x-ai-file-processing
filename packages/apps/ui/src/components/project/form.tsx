'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { schema } from './schema';
import type { FormSchema, FormAction } from './schema';
import { ProjectRead } from '@/clients/api/types.gen';
import { useTransition } from 'react';
import { Separator } from '../ui/separator';
import { SaveIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';

export type EvaluationFormProps = {
  data?: ProjectRead;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
};

export default function ProjectForm({
  submitAction,
  data,
}: EvaluationFormProps) {
  const [submitting, startTransition] = useTransition();

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data,
      name: data?.name || '',
      description: data?.description || '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    startTransition(async () => {
      await submitAction(
        { message: '', data: undefined, success: undefined },
        values
      );
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 w-1/2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Short name for your project.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormDescription>
                  Longer description of your project.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <Button size="sm" type="submit" disabled={submitting}>
          <SaveIcon />
          {submitting ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </Form>
  );
}
