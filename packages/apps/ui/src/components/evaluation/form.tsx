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
import {
  EvaluationRead,
  EvaluationTemplateRead,
  EvaluationType,
} from '@/clients/api/types.gen';
import { useTransition } from 'react';
import { Separator } from '../ui/separator';
import { PlusIcon, SaveIcon, TrashIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { ComboboxField } from '../combobox';
import { CategorySelectorField } from './category-selector';
import Editor from '@monaco-editor/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

export type EvaluationFormProps = {
  projectId: string;
  data: EvaluationRead;
  evaluationTemplates: EvaluationTemplateRead[];
  onChange: (
    oldEvaluation: EvaluationRead,
    newEvaluation: EvaluationRead,
    parent?: EvaluationRead
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
  evaluationTemplates,
  onChange,
}: EvaluationFormProps) {
  const [submitting, startTransition] = useTransition();

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data,
      project_id: projectId,
      parent_evaluation_id: data?.parent_evaluation_id || parent?.id || null,
      parent_evaluation_option: data?.parent_evaluation_option || null,
      evaluation_type: data?.evaluation_type ?? 'text',
      category_id: data?.category_id || null,
      category_name: null,
      category_description: null,
      template_id:
        data?.template_id ||
        (!data?.id &&
          evaluationTemplates.find(
            (template) =>
              template.category_id === data?.category_id && template.default
          )?.id) ||
        null,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const result = await submitAction(
        { message: '', data: undefined, success: undefined },
        values
      );
      if (result.success && result.data) {
        onChange(data, result.data as unknown as EvaluationRead, parent);
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 w-1/2">
          {parent && parent.evaluation_type === 'enum_choice' && (
            <FormField
              control={form.control}
              name="parent_evaluation_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Evaluation Option</FormLabel>
                  <FormControl>
                    <ComboboxField
                      options={[
                        { label: 'Any', value: 'ANY' },
                        ...(parent.evaluation_options || []).map((option) => ({
                          label: option,
                          value: option,
                        })),
                      ]}
                      isOptionMatch={(option, value) => {
                        return (
                          (value === null && option.value === 'ANY') ||
                          option.value === value
                        );
                      }}
                      getOptionValue={(option) => option.value}
                      getOptionLabel={(option) => option.label}
                      getOptionKey={(option) => option.label}
                      getFieldValue={(option) =>
                        option.value === 'ANY' ? null : option.value
                      }
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
          {parent && parent.evaluation_type === 'boolean' && (
            <FormField
              control={form.control}
              name="parent_evaluation_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Evaluation Option</FormLabel>
                  <FormControl>
                    <ComboboxField
                      options={[
                        { label: 'Any', value: 'ANY' },
                        { label: 'Yes', value: 'true' },
                        { label: 'No', value: 'false' },
                      ]}
                      isOptionMatch={(option, value) => {
                        return (
                          (value === null && option.value === 'ANY') ||
                          option.value === value
                        );
                      }}
                      getOptionValue={(option) => option.value}
                      getOptionLabel={(option) => option.label}
                      getOptionKey={(option) => option.label}
                      getFieldValue={(option) =>
                        option.value === 'ANY' ? null : option.value
                      }
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
            name="template_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Evaluation Template</FormLabel>
                <ComboboxField
                  options={[
                    {
                      label: 'None',
                      value: 'NONE',
                    },
                    ...evaluationTemplates.map((template) => ({
                      label: template.name,
                      value: template.id,
                    })),
                  ]}
                  isOptionMatch={(option, value) => {
                    return (
                      (value === null && option.value === 'NONE') ||
                      option.value === value
                    );
                  }}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  getOptionKey={(option) => option.label}
                  getFieldValue={(option) =>
                    option.value === 'NONE' ? null : option.value
                  }
                  field={field}
                />
                <FormDescription>
                  Select an evaluation template to use for this evaluation.
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
            name="evaluation_type"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Evaluation Type</FormLabel>
                <ComboboxField options={evaluationTypes} field={field} />
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
                              <Input
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  mainField.onChange(
                                    mainField.value?.map((option, i) =>
                                      i === index ? e.target.value : option
                                    )
                                  );
                                }}
                                className="w-1/2"
                              />
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
          <Accordion type="multiple" className="w-full">
            <AccordionItem
              value="advanced-options"
              className="rounded-xl border px-4 mt-2 bg-muted/50"
            >
              <AccordionTrigger>Advanced Options</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
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
                          options={{
                            wordWrap: 'on',
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Formulate what you want to evaluate in the document.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
