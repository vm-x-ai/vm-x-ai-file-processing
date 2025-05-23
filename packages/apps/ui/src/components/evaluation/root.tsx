'use client';

import { Accordion } from '@/components/ui/accordion';
import { Evaluation } from '@/components/evaluation';
import { EvaluationTree } from '@/file-classifier-api';
import { FormAction, FormSchema } from './schema';
import { useState } from 'react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

type EvaluationRootProps = {
  projectId: string;
  evaluations: EvaluationTree[];
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
  onDelete: (evaluation: EvaluationTree) => Promise<void>;
};

export default function EvaluationRoot({
  projectId,
  evaluations,
  submitAction,
  onDelete,
}: EvaluationRootProps) {
  const [data, setData] = useState<EvaluationTree[]>(evaluations);
  const [open, setOpen] = useState<string[]>([]);

  return (
    <>
      <Button
        className="w-50"
        variant="secondary"
        onClick={() => {
          const newEvaluation: EvaluationTree = {
            parent_evaluation_id: null,
            parent_evaluation_option: null,
            evaluation_type: 'text',
            description: '',
            system_prompt: '',
            prompt: '',
            title: 'Untitled',
            project_id: projectId,
            id: `new_evaluation_${data.length}`,
            evaluation_options: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            children: [],
          };

          setData([...data, newEvaluation]);
          setOpen([...open, newEvaluation.id]);
        }}
      >
        Add Evaluation
      </Button>
      <Separator />
      <Accordion
        type="multiple"
        value={open}
        onValueChange={(value) => {
          setOpen(value);
        }}
      >
        {data.map((evaluation) => (
          <Evaluation
            key={evaluation.id}
            projectId={projectId}
            evaluation={evaluation}
            submitAction={submitAction}
            onChange={(oldEval, newEval) => {
              setData(
                data.map((item) => (item.id === oldEval.id ? newEval : item))
              );

              setOpen(
                open.map((item) => (item === oldEval.id ? newEval.id : item))
              );
            }}
            onDelete={async (evaluation) => {
              if (evaluation.id.startsWith('new_evaluation')) {
                setData(data.filter((item) => item.id !== evaluation.id));
                return;
              }

              await onDelete(evaluation);
              setData(data.filter((item) => item.id !== evaluation.id));
            }}
          />
        ))}
      </Accordion>
    </>
  );
}
