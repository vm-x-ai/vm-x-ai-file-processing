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
  const evaluations = await fileClassifierApi.getEvaluationsTree({
    project_id: projectId,
  });
  return (
    <div className="grid grid-cols-1 gap-4">
      <EvaluationRoot
        projectId={projectId}
        evaluations={evaluations.data}
        submitAction={submitForm}
        onDelete={async (evaluation) => {
          'use server';
          await fileClassifierApi.deleteEvaluation({
            project_id: projectId,
            evaluation_id: evaluation.id,
          });
        }}
      />
    </div>
  );
}
