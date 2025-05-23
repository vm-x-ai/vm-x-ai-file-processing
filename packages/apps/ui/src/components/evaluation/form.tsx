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
import { EvaluationRead, EvaluationType } from '@/file-classifier-api';
import { useActionState, useEffect, useRef, useTransition } from 'react';
import { Separator } from '../ui/separator';
import { PlusIcon, SaveIcon, TrashIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import Combobox from '../combobox';
import Editor from '@monaco-editor/react';

export type EvaluationFormProps = {
  projectId: string;
  data: EvaluationRead;
  onChange: (
    oldEvaluation: EvaluationRead,
    newEvaluation: EvaluationRead
  ) => void;
  parent?: EvaluationRead;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
};

const evaluationTypes = ['text', 'enum_choice', 'boolean'] as EvaluationType[];

export default function EvaluationForm({
  projectId,
  submitAction,
  parent,
  data,
  onChange,
}: EvaluationFormProps) {
  const [submitting, setSubmitting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(submitAction, {
    message: '',
    data: undefined,
    success: undefined,
  });

  useEffect(() => {
    if (state.data) {
      onChange(data, state.data as EvaluationRead);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data]);

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data,
      project_id: projectId,
      parent_evaluation_id: data?.parent_evaluation_id || parent?.id || null,
      parent_evaluation_option:
        data?.parent_evaluation_option ||
        parent?.parent_evaluation_option ||
        null,
      evaluation_type: data?.evaluation_type ?? 'text',
    },
  });

  return (
    <Form {...form}>
      <form
        action={async () => {
          await setSubmitting(async () => {
            await form.handleSubmit(async (values) => {
              console.log('values', values);
              await formAction(values);
            })({
              target: formRef.current,
            } as unknown as React.FormEvent<HTMLFormElement>);
          });
        }}
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 w-1/2">
          {parent && parent.evaluation_type === 'enum_choice' && (
            <FormField
              control={form.control}
              name="parent_evaluation_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Evaluation Option</FormLabel>
                  <FormControl>
                    <Combobox
                      options={parent.evaluation_options || []}
                      field={field}
                    />
                  </FormControl>
                  <FormDescription>
                    It will trigger this evaluation when the LLM responds with
                    the selected option from the parent evaluation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Short name for your evaluation.
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
                  Longer description of your evaluation.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="evaluation_type"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Evaluation Type</FormLabel>
                <Combobox options={evaluationTypes} field={field} />
                <FormDescription>
                  Define the way the LLM should respond to your evaluation.
                </FormDescription>
                <ul className="list-disc pl-5">
                  <li className="mt-2">
                    <strong>text</strong>: The LLM will respond with a arbitrary
                    text.
                  </li>
                  <li className="mt-2">
                    <strong>enum_choice</strong>: The LLM will respond with a
                    predefined list of values.
                  </li>
                  <li className="mt-2">
                    <strong>boolean</strong>: The LLM will respond with{' '}
                    <strong>true</strong> or <strong>false</strong>.
                  </li>
                </ul>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('evaluation_type') === 'enum_choice' && (
            <>
              <FormField
                control={form.control}
                name="evaluation_options"
                render={({ field: mainField }) => (
                  <>
                    <FormLabel>Evaluation Options</FormLabel>
                    {form.watch('evaluation_options')?.map((option, index) => (
                      <FormField
                        key={`evaluation_options.${index}`}
                        control={form.control}
                        name={`evaluation_options.${index}`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex w-full max-w-sm items-center gap-2">
                              <Input {...field} className="w-1/2" />
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                  mainField.onChange(
                                    mainField.value?.filter(
                                      (_, i) => i !== index
                                    ) || []
                                  );
                                }}
                              >
                                <TrashIcon />
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-35"
                      onClick={() => {
                        mainField.onChange([...(mainField.value || []), '']);
                      }}
                    >
                      <PlusIcon />
                      Add Option
                    </Button>
                  </>
                )}
              />
            </>
          )}
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
                  />
                </FormControl>
                <FormDescription>
                  Instruct the LLM on how to interpret the document.
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
                  />
                </FormControl>
                <FormDescription>
                  Formulate what you want to evaluate in the document.
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
