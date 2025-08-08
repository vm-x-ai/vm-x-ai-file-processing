import {
  deleteEvaluation,
  getEvaluationCategories,
  getEvaluationsTree,
  getEvaluationTemplates,
} from '@/clients/api';
import { submitForm } from './actions';
import EvaluationRoot from '@/components/evaluation/root';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { getErrorMessageFromResponse } from '@/clients/api-utils';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const [evaluations, categories, evaluationTemplates] = await Promise.all([
    getEvaluationsTree({
      path: {
        project_id: projectId,
      },
    }),
    getEvaluationCategories({
      path: {
        project_id: projectId,
      },
    }),
    getEvaluationTemplates({
      path: {
        project_id: projectId,
      },
    }),
  ]);

  if (!evaluations.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading evaluations</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(evaluations.error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!categories.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading categories</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(categories.error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!evaluationTemplates.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading evaluation templates</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(evaluationTemplates.error)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Evaluations</h1>

      {/* Main dark container */}
      <div className="bg-background rounded-lg border p-6">
        <EvaluationRoot
          projectId={projectId}
          evaluations={evaluations.data}
          categories={categories.data}
          evaluationTemplates={evaluationTemplates.data}
          submitAction={submitForm}
          onDeleteAction={async (evaluation) => {
            'use server';

            ensureServerClientsInitialized()

            await deleteEvaluation({
              path: {
                project_id: projectId,
                evaluation_id: evaluation.id,
              },
            });
          }}
        />
      </div>
    </div>
  );
}
