'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { EvaluationTemplateRead } from '@/file-classifier-api';
import { useTransition } from 'react';
import { Separator } from '../ui/separator';
import { SaveIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { CategorySelectorField } from '../evaluation/category-selector';
import Editor from '@monaco-editor/react';
import { Label } from '../ui/label';

export type EvaluationTemplateFormProps = {
  projectId: string;
  data: EvaluationTemplateRead;
  onChange: (
    oldEvaluationTemplate: EvaluationTemplateRead,
    newEvaluationTemplate: EvaluationTemplateRead
  ) => void;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
};

export default function EvaluationTemplateForm({
  projectId,
  submitAction,
  data,
  onChange,
}: EvaluationTemplateFormProps) {
  const [submitting, startTransition] = useTransition();

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data,
      project_id: projectId,
      category_id: data?.category_id || null,
      category_name: null,
      category_description: null,
      default: data.default ?? false,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const result = await submitAction(
        { message: '', data: undefined, success: undefined },
        values
      );
      if (result.success && result.data) {
        onChange(data, result.data as unknown as EvaluationTemplateRead);
      }
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
                <FormDescription>
                  Short name for your evaluation template.
                </FormDescription>
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
                  Longer description of your evaluation template.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <CategorySelectorField
                    field={field}
                    projectId={projectId}
                    hideEmptyDefault={data.id?.startsWith('new_evaluation')}
                    onCreateCategory={(categoryName) => {
                      // Set the category name for creation
                      form.setValue('category_name', categoryName);
                      form.setValue('category_id', null);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Select an existing category or create a new one.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="system_prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Prompt</FormLabel>
                <FormControl>
                  <Editor
                    height="15vh"
                    language="markdown"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    theme="vs-dark"
                    options={{
                      wordWrap: 'on',
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Instruct the LLM on how to interpret the document. You can use
                  Jinja2 syntax to reference the document.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt</FormLabel>
                <FormControl>
                  <Editor
                    height="15vh"
                    language="markdown"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    theme="vs-dark"
                    options={{
                      wordWrap: 'on',
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Formulate what you want to evaluate in the document. You can
                  use Jinja2 syntax to reference the document.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="default"
            render={({ field }) => (
              <FormItem>
                <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                    />
                  </FormControl>
                  <div className="grid gap-1.5 font-normal">
                    <p className="text-sm leading-none font-medium">
                      Default Template
                    </p>
                    <p className="text-muted-foreground text-sm">
                      If checked, this evaluation template will be used as the
                      default evaluation template for the category.
                    </p>
                  </div>
                </Label>
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
