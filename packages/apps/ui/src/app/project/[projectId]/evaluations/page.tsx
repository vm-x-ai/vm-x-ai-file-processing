import { fileClassifierApi } from '@/api';
import { submitForm } from './actions';
import EvaluationRoot from '@/components/evaluation/root';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const [evaluations, categories, evaluationTemplates] = await Promise.all([
    fileClassifierApi.getEvaluationsTree({
      project_id: projectId,
    }),
    fileClassifierApi.getEvaluationCategories({
      project_id: projectId,
    }),
    fileClassifierApi.getEvaluationTemplates({
      project_id: projectId,
    }),
  ]);

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
            await fileClassifierApi.deleteEvaluation({
              project_id: projectId,
              evaluation_id: evaluation.id,
            });
          }}
        />
      </div>
    </div>
  );
}
