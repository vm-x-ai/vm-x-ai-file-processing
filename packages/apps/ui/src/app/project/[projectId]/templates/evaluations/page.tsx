import { fileClassifierApi } from '@/api';
import { submitForm } from './actions';
import EvaluationTemplateRoot from '@/components/evaluation-template/root';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const [evaluationTemplates, categories] = await Promise.all([
    fileClassifierApi.getEvaluationTemplates({
      project_id: projectId,
    }),
    fileClassifierApi.getEvaluationCategories({
      project_id: projectId,
    }),
  ]);

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
            await fileClassifierApi.deleteEvaluationTemplate({
              project_id: projectId,
              evaluation_template_id: evaluationTemplate.id,
            });
          }}
        />
      </div>
    </div>
  );
}
