import {
  deleteEvaluationTemplate,
  getEvaluationCategories,
  getEvaluationTemplates,
} from '@/clients/api';
import { submitForm } from './actions';
import EvaluationTemplateRoot from '@/components/evaluation-template/root';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getErrorMessageFromResponse } from '@/clients/api-utils';
import { AlertCircleIcon } from 'lucide-react';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const [evaluationTemplates, categories] = await Promise.all([
    getEvaluationTemplates({
      path: {
        project_id: projectId,
      },
    }),
    getEvaluationCategories({
      path: {
        project_id: projectId,
      },
    }),
  ]);

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

  if (!categories.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading evaluation categories</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(categories.error)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Evaluation Templates</h1>

      {/* Main dark container */}
      <div className="bg-background rounded-lg border p-6">
        <EvaluationTemplateRoot
          projectId={projectId}
          evaluationTemplates={evaluationTemplates.data}
          categories={categories.data}
          submitAction={submitForm}
          onDeleteAction={async (evaluationTemplate) => {
            'use server';
            ensureServerClientsInitialized();

            await deleteEvaluationTemplate({
              path: {
                project_id: projectId,
                evaluation_template_id: evaluationTemplate.id,
              },
            });
          }}
        />
      </div>
    </div>
  );
}
