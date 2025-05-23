'use client';

import { EvaluationTree } from '@/file-classifier-api';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { FormAction, FormSchema } from './schema';
import EvaluationForm from './form';
import { useState, useTransition } from 'react';

export type EvaluationProps = {
  projectId: string;
  evaluation: EvaluationTree;
  parent?: EvaluationTree;
  onParentChange?: (
    parent: EvaluationTree,
    oldChild?: EvaluationTree,
    newChild?: EvaluationTree
  ) => void;
  level?: number;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
  onChange: (
    oldEvaluation: EvaluationTree,
    newEvaluation: EvaluationTree
  ) => void;
  onDelete: (evaluation: EvaluationTree) => Promise<void>;
};

export function Evaluation({
  projectId,
  evaluation,
  level = 1,
  parent,
  submitAction,
  onChange,
  onDelete,
  onParentChange,
}: EvaluationProps) {
  const [deleting, setDeleting] = useTransition();
  const [childrenOpen, setChildrenOpen] = useState<string[]>([]);
  const [data, setData] = useState<EvaluationTree>(evaluation);

  return (
    <AccordionItem
      key={data.id}
      value={data.id}
      className="last:border-b-1 rounded-xl border px-4 mt-2"
    >
      <div className="flex justify-between items-center w-full">
        <AccordionTrigger>
          <div>
            <strong>{data.title}: </strong>
            <span className="text-muted-foreground">{data.prompt}</span>
          </div>
        </AccordionTrigger>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting}
            onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();

              setDeleting(async () => {
                if (data.id.startsWith('new_evaluation') && parent) {
                  onParentChange?.({
                    ...parent,
                    children: parent.children?.filter(
                      (child) => child.id !== data.id
                    ),
                  });
                  return;
                }

                await onDelete(data);

                if (parent) {
                  onParentChange?.({
                    ...parent,
                    children: parent.children?.filter(
                      (child) => child.id !== data.id
                    ),
                  });
                }
              });
            }}
          >
            <TrashIcon />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      <AccordionContent className="grid grid-cols-1 gap-4">
        <div className="col-span-full">
          <EvaluationForm
            submitAction={submitAction}
            projectId={projectId}
            data={data}
            onChange={(oldEval, newEval) => {
              setData(newEval);
              if (parent) {
                onParentChange?.(
                  {
                    ...parent,
                    children: parent.children?.map((child) =>
                      child.id === oldEval.id ? newEval : child
                    ),
                  },
                  oldEval,
                  newEval
                );
              } else {
                onChange(oldEval, newEval);
              }
            }}
            parent={parent}
          />
        </div>
        <div className="col-span-full">
          <div className="flex flex-col gap-2">
            <h5>Sub Evaluations</h5>
            <span className="text-muted-foreground">
              The following evaluations are only triggered if the document
              matches the parent evaluation with a certain value.
            </span>

            {data.children && data.children.length > 0 ? (
              <div className={`pl-${level * 4}`}>
                <Accordion
                  type="multiple"
                  value={childrenOpen}
                  onValueChange={(value) => {
                    setChildrenOpen(value);
                  }}
                >
                  {data.children?.map((child) => (
                    <Evaluation
                      key={child.id}
                      projectId={projectId}
                      evaluation={child}
                      level={level + 1}
                      submitAction={submitAction}
                      parent={evaluation}
                      onParentChange={(item, oldChild, newChild) => {
                        setData({ ...item });

                        if (oldChild && newChild) {
                          setChildrenOpen((prev) =>
                            prev.map((id) =>
                              id === oldChild.id ? newChild.id : id
                            )
                          );
                        }
                      }}
                      onDelete={onDelete}
                      onChange={onChange}
                    />
                  ))}
                </Accordion>
              </div>
            ) : (
              <div className="col-span-full">
                <p className="text-muted-foreground">No sub evaluations</p>
              </div>
            )}
            <div
              className={
                data.children && data.children.length > 0
                  ? `pl-${level * 4}`
                  : ''
              }
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!data.children) {
                    data.children = [];
                  }

                  const newEvaluations = data.children.filter((child) =>
                    child.id.startsWith('new_evaluation')
                  );

                  const newEvaluation: EvaluationTree = {
                    parent_evaluation_id: evaluation.id,
                    parent_evaluation_option: null,
                    evaluation_type: 'text',
                    description: '',
                    system_prompt: '',
                    prompt: '',
                    title: 'Untitled',
                    project_id: projectId,
                    id: `new_evaluation_${newEvaluations.length}`,
                    evaluation_options: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    children: [],
                  };

                  data.children.push(newEvaluation);

                  setChildrenOpen((prev) => [...prev, newEvaluation.id]);
                }}
              >
                <PlusIcon />
                Add Sub Evaluation
              </Button>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
