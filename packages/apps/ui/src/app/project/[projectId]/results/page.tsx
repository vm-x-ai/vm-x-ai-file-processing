'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryTabs, ResultsTable } from '@/components/evaluation';
import {
  EvaluationRead,
  FileEvaluationReadWithFile,
  getFilesByEvaluation,
} from '@/clients/api';
import { useQuery } from '@tanstack/react-query';
import { getEvaluationsByCategoryOptions } from '@/clients/api/@tanstack/react-query.gen';

interface ResultWithEvaluation extends FileEvaluationReadWithFile {
  evaluation: EvaluationRead;
}

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const { projectId } = use(params);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const evaluations = useQuery({
    ...getEvaluationsByCategoryOptions({
      path: {
        project_id: projectId,
        category_id: selectedCategoryId as string,
      },
    }),
  });

  const [results, setResults] = useState<ResultWithEvaluation[]>([]);
  const [loading, setLoading] = useState(false);

  // Function to deduplicate results, keeping the most recently updated record
  const deduplicateResults = (
    results: ResultWithEvaluation[]
  ): ResultWithEvaluation[] => {
    const resultMap = new Map<string, ResultWithEvaluation>();

    results.forEach((result) => {
      // Create a unique key based on all the important fields that define a "duplicate"
      const key = `${result.file.id}-${result.evaluation.id}-${result.content.id}-${result.response}`;

      const existing = resultMap.get(key);
      if (
        !existing ||
        new Date(result.updated_at) > new Date(existing.updated_at)
      ) {
        resultMap.set(key, result);
      }
    });

    return Array.from(resultMap.values());
  };

  useEffect(() => {
    if (!selectedCategoryId) return;

    async function fetchResults() {
      setLoading(true);
      try {
        // Get results for each evaluation
        const allResults = await Promise.all(
          evaluations.data?.map(async (evaluation) => {
            const { data: results } = await getFilesByEvaluation({
              path: {
                project_id: projectId,
                evaluation_id: evaluation.id,
              },
            });
            return (
              results?.map((result) => ({
                ...result,
                evaluation,
              })) ?? []
            );
          }) ?? []
        );

        // Flatten the results
        const flatResults = allResults.flat();

        // Deduplicate results, keeping the most recently updated record
        const deduplicatedResults = deduplicateResults(flatResults);

        setResults(deduplicatedResults);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [evaluations.data, projectId, selectedCategoryId]);

  if (!projectId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Results</h1>
        </div>
        <div className="space-y-0">
          <CategoryTabs
            projectId={projectId}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={(categoryId: string) =>
              setSelectedCategoryId(categoryId)
            }
          />
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-64 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
            <ResultsTable data={results} />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No evaluation results found for the selected category.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
