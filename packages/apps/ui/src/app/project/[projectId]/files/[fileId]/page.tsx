import {
  FileEvaluationReadWithFile,
  getFile,
  getFileEvaluations,
} from '@/clients/api';
import FileEvaluationGraph from '@/components/evaluation/graph';
import FileCard from '@/components/file-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ReactFlowProvider } from '@xyflow/react';
import { AlertCircleIcon } from 'lucide-react';
import { getErrorMessageFromResponse } from '@/clients/api-utils';

type PageProps = {
  params: Promise<{
    projectId: string;
    fileId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { fileId, projectId } = await params;
  const file = await getFile({
    path: {
      project_id: projectId,
      file_id: fileId,
    },
  });

  const fileEvaluations = await getFileEvaluations({
    path: {
      project_id: projectId,
      file_id: fileId,
    },
  });

  if (!file.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading file</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(file.error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!fileEvaluations.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading file evaluations</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(fileEvaluations.error)}
        </AlertDescription>
      </Alert>
    );
  }

  const fileEvaluationsByPage = fileEvaluations.data.reduce(
    (acc, evaluation) => {
      const pageNumber = evaluation.content.content_number;
      if (!acc[pageNumber]) {
        acc[pageNumber] = [];
      }
      const item = { ...evaluation, children: [] };
      acc[pageNumber].push(item);
      return acc;
    },
    {} as Record<number, FileEvaluationReadWithFile[]>
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-3 space-y-4">
        <h4 className="text-lg font-bold">File Details:</h4>
        <Separator />
        <FileCard file={file.data} readOnly />
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
