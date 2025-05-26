'use client';

import {
  EvaluationRead,
  FileEvaluationReadWithEvaluation,
  FileReadWithEvaluations,
  FileSearchEvaluationGroup,
  FileSearchEvaluationOperation,
} from '@/file-classifier-api';
import { Separator } from './ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Combobox } from './combobox';
import { parseAsJson, useQueryState } from 'nuqs';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useCallback, useMemo } from 'react';
import { Badge } from './ui/badge';

export type ExploreProps = {
  projectId: string;
  evaluations: EvaluationRead[];
  files: FileReadWithEvaluations[];
};

export function Explore({ projectId, evaluations, files }: ExploreProps) {
  const evaluationsMap = useMemo(
    () =>
      evaluations.reduce((acc, evaluation) => {
        acc[evaluation.id] = evaluation;
        return acc;
      }, {} as Record<string, EvaluationRead>),
    [evaluations]
  );

  const [evaluationsFilters, setEvaluationsFilters] = useQueryState(
    'evaluations',
    parseAsJson<FileSearchEvaluationGroup>((value) => {
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    })
      .withDefault({
        operation: 'or',
        evaluations: [],
      })
      .withOptions({
        history: 'push',
        shallow: false,
      })
  );

  const getOptionLabel = useCallback(
    (evaluation: EvaluationRead) => (
      <div className="flex items-center gap-2">
        <strong>{evaluation.title}</strong>
        <span className="text-sm">{evaluation.prompt.slice(0, 100)}</span>
      </div>
    ),
    []
  );

  const filterOption = useCallback(
    (
      option: EvaluationRead | undefined,
      value: string,
      search: string,
      keywords?: string[]
    ) => {
      const extendValue = `${value}|${keywords?.join('|')}|`;
      if (option?.title.includes(search)) return 1;
      if (option?.prompt.includes(search)) return 1;
      if (option?.description.includes(search)) return 1;

      if (extendValue.includes(search)) return 1;
      return 0;
    },
    []
  );
  return (
    <>
      <div className="col-span-12 space-y-4">
        <h1 className="text-xl font-bold">Explore Files</h1>
        <Separator />
        <Card>
          <CardContent>
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="grid grid-cols-1 gap-4 self-start">
                <div className="text-center font-bold">Filter By:</div>
              </div>
              <div className="col-span-11 space-y-2">
                <div className="grid grid-cols-1 gap-4">
                  {(
                    evaluationsFilters.evaluations as unknown as FileSearchEvaluationOperation[]
                  ).map((evaluation, index, list) => (
                    <div key={index}>
                      <div className="flex items-center gap-2">
                        <Combobox
                          buttonClassName="w-[500px]"
                          popoverClassName="w-[500px]"
                          options={evaluations}
                          value={evaluation.value.evaluation_id}
                          filterOption={filterOption}
                          searchPlaceholder="Select a evaluation"
                          isOptionMatch={(option, value) => option.id === value}
                          getOptionKey={(evaluation) => evaluation.id}
                          getOptionValue={(evaluation) => evaluation.id}
                          getOptionLabel={getOptionLabel}
                          onChange={(evaluation) => {
                            setEvaluationsFilters((prev) => ({
                              ...prev,
                              evaluations: prev.evaluations.map((e, i) =>
                                i === index
                                  ? {
                                      ...e,
                                      value: {
                                        evaluation_id: evaluation.id,
                                      },
                                    }
                                  : e
                              ),
                            }));
                          }}
                        />
                        {evaluationsMap[evaluation.value.evaluation_id]
                          .evaluation_type !== 'text' && (
                          <div className="text-center font-bold">Response:</div>
                        )}
                        {evaluationsMap[evaluation.value.evaluation_id]
                          .evaluation_type === 'enum_choice' && (
                          <Combobox
                            options={[
                              'All',
                              ...(evaluationsMap[evaluation.value.evaluation_id]
                                .evaluation_options ?? []),
                            ]}
                            value={evaluation.value.response_value ?? 'All'}
                            searchPlaceholder="Select a option"
                            onChange={(option) => {
                              setEvaluationsFilters((prev) => ({
                                ...prev,
                                evaluations: prev.evaluations.map((e, i) =>
                                  i === index
                                    ? {
                                        ...e,
                                        value: {
                                          ...(
                                            e as FileSearchEvaluationOperation
                                          ).value,
                                          response_value:
                                            option === 'All' ? null : option,
                                        },
                                      }
                                    : e
                                ),
                              }));
                            }}
                          />
                        )}
                        {evaluationsMap[evaluation.value.evaluation_id]
                          .evaluation_type === 'boolean' && (
                          <Combobox
                            options={['All', 'Yes', 'No']}
                            value={
                              evaluation.value.response_value
                                ? evaluation.value.response_value?.toLowerCase() ===
                                  'true'
                                  ? 'Yes'
                                  : 'No'
                                : 'All'
                            }
                            searchPlaceholder="Select a option"
                            onChange={(option) => {
                              setEvaluationsFilters((prev) => ({
                                ...prev,
                                evaluations: prev.evaluations.map((e, i) =>
                                  i === index
                                    ? {
                                        ...e,
                                        value: {
                                          ...evaluation.value,
                                          response_value:
                                            option === 'All'
                                              ? null
                                              : option.toLowerCase() === 'yes'
                                              ? 'true'
                                              : 'false',
                                        },
                                      }
                                    : e
                                ),
                              }));
                            }}
                          />
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setEvaluationsFilters((prev) => ({
                              ...prev,
                              evaluations: prev.evaluations.filter(
                                (_, i) => i !== index
                              ),
                            }));
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {index < list.length && (
                        <div className="flex items-center gap-4 mt-4">
                          <Separator className="flex-1" />
                          <span
                            className="text-muted-foreground uppercase hover:cursor-pointer"
                            onDoubleClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              
                              setEvaluationsFilters((prev) => ({
                                ...prev,
                                operation:
                                  prev.operation === 'or' ? 'and' : 'or',
                              }));
                            }}
                          >
                            {evaluationsFilters.operation}
                          </span>
                          <Separator className="flex-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <Combobox
                    buttonClassName="w-[500px]"
                    popoverClassName="w-[500px]"
                    options={evaluations}
                    searchPlaceholder="Add a evaluation to filter"
                    isOptionMatch={(option, value) => option.id === value}
                    getOptionKey={(evaluation) => evaluation.id}
                    getOptionValue={(evaluation) => evaluation.id}
                    getOptionLabel={getOptionLabel}
                    filterOption={filterOption}
                    onChange={(evaluation) => {
                      setEvaluationsFilters((prev) => ({
                        ...prev,
                        evaluations: [
                          ...prev.evaluations,
                          {
                            operation: 'eq',
                            value: {
                              evaluation_id: evaluation.id,
                            },
                          },
                        ],
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="col-span-6 space-y-4">
        <h2 className="text-xl font-bold">Files</h2>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardHeader>
                <CardTitle>{file.name}</CardTitle>
                <CardDescription>{file.status}</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  {Object.entries(
                    file.evaluations.reduce<
                      Record<number, FileEvaluationReadWithEvaluation[]>
                    >((acc, evaluation) => {
                      if (!acc[evaluation.content.content_number]) {
                        acc[evaluation.content.content_number] = [];
                      }

                      acc[evaluation.content.content_number].push(evaluation);
                      return acc;
                    }, {})
                  ).map(([pageNumber, evaluations]) => (
                    <div key={pageNumber}>
                      <div>Page #{pageNumber}</div>
                      <div className="flex flex-wrap gap-2">
                        {evaluations.map((evaluation) => (
                          <Badge key={evaluation.id}>
                            {evaluation.evaluation.evaluation_type !==
                            'text' ? (
                              <>
                                {evaluation.evaluation.title}:{' '}
                                {evaluation.response}
                              </>
                            ) : (
                              evaluation.response
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="col-span-6 space-y-4">
        <h2 className="text-xl font-bold">Chat with your files</h2>
        <Separator />
      </div>
    </>
  );
}
