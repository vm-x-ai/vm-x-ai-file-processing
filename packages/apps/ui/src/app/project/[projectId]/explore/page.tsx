import { fileClassifierApi } from '@/api';
import { Explore } from '@/components/explore';
import { FileSearchEvaluationGroup } from '@/file-classifier-api';
import { parseAsString, parseAsJson } from 'nuqs/server';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Record<string, string | string[] | undefined>;
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

  const { data: evaluationsDef } = await fileClassifierApi.getEvaluations({
    project_id: projectId,
  });

  const evaluationsFilters: FileSearchEvaluationGroup = evaluationsParser.parseServerSide(
    searchParams?.evaluations
  );

  const searchQuery = searchQueryParser.parseServerSide(
    searchParams?.search_query
  );

  const { data: files } = await fileClassifierApi.searchFiles(
    {
      project_id: projectId,
    },
    {
      search_query: searchQuery,
      evaluations: evaluationsFilters,
    }
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      <Explore
        projectId={projectId}
        evaluations={evaluationsDef}
        files={files}
      />
    </div>
  );
}
