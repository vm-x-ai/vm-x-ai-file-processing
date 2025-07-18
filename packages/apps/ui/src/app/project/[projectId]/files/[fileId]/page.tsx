import { fileClassifierApi } from '@/api';
import FileEvaluationGraph from '@/components/evaluation/graph';
import FileCard from '@/components/file-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { FileEvaluationReadWithFile } from '@/file-classifier-api';
import { ReactFlowProvider } from '@xyflow/react';

type PageProps = {
  params: Promise<{
    projectId: string;
    fileId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { fileId, projectId } = await params;
  const { data: file } = await fileClassifierApi.getFile({
    project_id: projectId,
    file_id: fileId,
  });

  const { data: fileEvaluations } = await fileClassifierApi.getFileEvaluations({
    project_id: projectId,
    file_id: fileId,
  });

  const fileEvaluationsByPage = fileEvaluations.reduce((acc, evaluation) => {
    const pageNumber = evaluation.content.content_number;
    if (!acc[pageNumber]) {
      acc[pageNumber] = [];
    }
    const item = { ...evaluation, children: [] };
    acc[pageNumber].push(item);
    return acc;
  }, {} as Record<number, FileEvaluationReadWithFile[]>);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3 space-y-4">
        <h4 className="text-lg font-bold">File Details:</h4>
        <Separator />
        <FileCard file={file} readOnly />
      </div>
      <div className="col-span-9 space-y-4">
        <h4 className="text-lg font-bold">File Evaluations:</h4>
        <Separator />
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(fileEvaluationsByPage).map(
            ([pageNumber, evaluations]) => (
              <AccordionItem key={pageNumber} value={`page-${pageNumber}`}>
                <AccordionTrigger>
                  <div>
                    Page: <strong>#{pageNumber}</strong>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ReactFlowProvider>
                    <FileEvaluationGraph evaluations={evaluations} />
                  </ReactFlowProvider>
                </AccordionContent>
              </AccordionItem>
            )
          )}
        </Accordion>
      </div>
    </div>
  );
}
