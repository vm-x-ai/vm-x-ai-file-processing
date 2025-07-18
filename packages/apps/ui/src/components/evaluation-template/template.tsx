'use client';

import { EvaluationTemplateRead } from '@/file-classifier-api';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { FormAction, FormSchema } from './schema';
import { useEffect, useState, useTransition } from 'react';
import EvaluationTemplateForm from './form';
import { Badge } from '../ui/badge';

export type EvaluationTemplateProps = {
  projectId: string;
  evaluationTemplate: EvaluationTemplateRead;
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
  onChange: (
    oldEvaluationTemplate: EvaluationTemplateRead,
    newEvaluationTemplate: EvaluationTemplateRead
  ) => void;
  onDelete: (evaluation: EvaluationTemplateRead) => Promise<void>;
};

export function EvaluationTemplate({
  projectId,
  evaluationTemplate,
  submitAction,
  onChange,
  onDelete,
}: EvaluationTemplateProps) {
  const [deleting, setDeleting] = useTransition();
  const [data, setData] = useState<EvaluationTemplateRead>(evaluationTemplate);

  useEffect(() => {
    setData(evaluationTemplate);
  }, [evaluationTemplate]);

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
              <strong>{data.name}</strong>
              {data.default && <Badge className="ml-2">Default</Badge>}
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
                  await onDelete(data);
                });
              }}
            >
              <TrashIcon className={deleting ? 'animate-pulse' : ''} />
            </Button>
          </div>
        </div>
        <AccordionContent className="grid grid-cols-1 gap-4">
          <div className="col-span-full">
            <EvaluationTemplateForm
              submitAction={submitAction}
              projectId={projectId}
              data={data}
              onChange={(oldEval, newEval) => {
                setData(newEval);
                onChange(oldEval, newEval);
              }}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
