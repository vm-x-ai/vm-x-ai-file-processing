'use client';

import { EvaluationTemplateRead, EvaluationTree } from '@/file-classifier-api';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Plus, TrashIcon } from 'lucide-react';
import { FormAction, FormSchema } from './schema';
import EvaluationForm from './form';
import { useState, useTransition } from 'react';
import { nanoid } from 'nanoid';

export type EvaluationProps = {
  projectId: string;
  evaluationTemplates: EvaluationTemplateRead[];
  evaluation: EvaluationTree;
  parent?: EvaluationTree;
  level?: number;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
  onChange: (
    oldEvaluation: EvaluationTree,
    newEvaluation: EvaluationTree,
    parent?: EvaluationTree
  ) => void;
  onDelete: (
    evaluation: EvaluationTree,
    parent?: EvaluationTree
  ) => Promise<void>;
  onDeleteAction: (evaluation: EvaluationTree) => Promise<void>;
};

export function Evaluation({
  projectId,
  evaluationTemplates,
  evaluation,
  level = 1,
  parent: initialParent,
  submitAction,
  onChange,
  onDelete,
  onDeleteAction,
}: EvaluationProps) {
  const [deleting, setDeleting] = useTransition();
  const [childrenOpen, setChildrenOpen] = useState<string[]>([]);
  const [data, setData] = useState<EvaluationTree>(evaluation);
  const [parent, setParent] = useState<EvaluationTree | undefined>(
    initialParent
  );

  return (
    <>
      <AccordionItem
        key={data.id}
        value={data.id}
        className="last:border-b-1 rounded-xl border px-4 mt-2 bg-muted/50"
      >
        <div className="flex justify-between items-center w-full">
          <AccordionTrigger>
            <div>
              <strong>{data.title}</strong>
            </div>
          </AccordionTrigger>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              disabled={deleting}
              onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();

                setDeleting(async () => {
                  await onDelete(data, parent);
                });
              }}
            >
              <TrashIcon className={deleting ? 'animate-pulse' : ''} />
            </Button>
          </div>
        </div>
        <AccordionContent className="grid grid-cols-1 gap-4">
          <div className="col-span-full">
            <EvaluationForm
              evaluationTemplates={evaluationTemplates}
              submitAction={submitAction}
              projectId={projectId}
              data={data}
              onChange={(oldEval, newEval, parent) => {
                setData({
                  ...newEval,
                  children: evaluation.children,
                });
                onChange(oldEval, newEval, parent);
              }}
              parent={parent}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
      {data.children && data.children.length > 0 && (
        <div style={{ paddingLeft: `${level * 16}px` }}>
          <Accordion
            type="multiple"
            value={childrenOpen}
            onValueChange={(value) => {
              setChildrenOpen(value);
            }}
          >
            {evaluation.children?.map((child) => (
              <Evaluation
                key={child.id}
                projectId={projectId}
                evaluationTemplates={evaluationTemplates}
                evaluation={child}
                level={level + 1}
                submitAction={submitAction}
                parent={data}
                onDeleteAction={onDeleteAction}
                onDelete={async (deletedItem, deletedItemParent) => {
                  if (
                    deletedItemParent &&
                    parent &&
                    deletedItemParent.id === parent.id
                  ) {
                    setParent({
                      ...parent,
                      children: parent.children?.filter(
                        (child) => child.id !== deletedItem.id
                      ),
                    });

                    await onDeleteAction(deletedItem);
                  }

                  if (
                    deletedItemParent &&
                    deletedItemParent.id === evaluation.id
                  ) {
                    setData({
                      ...data,
                      children: data.children?.filter(
                        (child) => child.id !== deletedItem.id
                      ),
                    });

                    await onDeleteAction(deletedItem);
                  }

                  await onDelete(deletedItem, deletedItemParent);
                }}
                onChange={(oldEval, newEval, changedItemParent) => {
                  if (
                    changedItemParent &&
                    changedItemParent.id === parent?.id
                  ) {
                    setParent({
                      ...parent,
                      children: parent.children?.map((child) =>
                        child.id === oldEval.id ? newEval : child
                      ),
                    });
                  }

                  if (
                    changedItemParent &&
                    changedItemParent.id === evaluation.id
                  ) {
                    setData({
                      ...data,
                      children: data.children?.map((child) =>
                        child.id === oldEval.id ? newEval : child
                      ),
                    });
                  }

                  if (newEval.id === evaluation.id) {
                    setData(newEval);
                  }

                  onChange(oldEval, newEval, changedItemParent);
                }}
              />
            ))}
          </Accordion>
        </div>
      )}
      {!data.id.startsWith('new_evaluation') && (
        <div
          className={
            'mt-2 border-2 border-dashed border-muted-foreground/30 rounded-xl border px-4 py-4 cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/20 transition-colors flex items-center gap-2 bg-muted/50'
          }
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => {
            const newEvaluation: EvaluationTree = {
              parent_evaluation_id: data.id,
              parent_evaluation_option: null,
              evaluation_type: 'text',
              description: '',
              system_prompt: '',
              prompt: '',
              title: 'Untitled',
              project_id: projectId,
              id: `new_evaluation_${nanoid()}`,
              evaluation_options: null,
              category_id: data.category_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              template_id: null,
              children: [],
            };

            const newEvaluationTree = {
              ...data,
              children: [...(data.children || []), newEvaluation],
            };

            onChange(data, newEvaluationTree, parent);
            setData(newEvaluationTree);

            setChildrenOpen((prev) => [...prev, newEvaluation.id]);
          }}
        >
          <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground font-medium">
            Add nested evaluation to {data.title}
          </span>
        </div>
      )}
    </>
  );
}
