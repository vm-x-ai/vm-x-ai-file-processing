import {
  FileSearchEvaluationGroup,
  getEvaluations,
  searchFiles,
} from '@/clients/api';
import { Explore } from '@/components/explore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { parseAsString, parseAsJson } from 'nuqs/server';
import { getErrorMessageFromResponse } from '@/clients/api-utils';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const searchQueryParser = parseAsString.withDefault('');
const evaluationsParser = parseAsJson<FileSearchEvaluationGroup>((value) => {
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
}).withDefault({
  operation: 'or',
  evaluations: [],
});

export default async function Page({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const queryParams = await searchParams;

  const evaluationsDef = await getEvaluations({
    path: {
      project_id: projectId,
    },
  });

  const evaluationsFilters: FileSearchEvaluationGroup =
    evaluationsParser.parseServerSide(queryParams?.evaluations);

  const searchQuery = searchQueryParser.parseServerSide(
    queryParams?.search_query
  );

  const files = await searchFiles({
    path: {
      project_id: projectId,
    },
    body: {
      search_query: searchQuery,
      evaluations: evaluationsFilters,
    },
  });

  if (!evaluationsDef.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading evaluations</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(evaluationsDef.error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!files.data) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading files</AlertTitle>
        <AlertDescription>
          {getErrorMessageFromResponse(files.error)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <Explore
        projectId={projectId}
        evaluations={evaluationsDef.data}
        files={files.data}
      />
    </div>
  );
}
