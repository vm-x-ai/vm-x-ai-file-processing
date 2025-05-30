import { convertToCoreMessages, JSONValue, streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import camelCase from 'lodash.camelcase';
import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { headers } from 'next/headers';
import z from 'zod';
import { fileClassifierApi } from '@/api';
import { FileRead } from '@/file-classifier-api';

export async function POST(request: NextRequest) {
  const { messages, projectId, files } = await request.json();

  const actionHeaders = await headers();
  const headerMetadata: Record<string, JSONValue> = {};
  const baseURL = `${process.env.VMX_PROTOCOL}://${process.env.VMX_DOMAIN}/completion/${process.env.VMX_WORKSPACE_ID}/${process.env.VMX_ENVIRONMENT_ID}/${process.env.VMX_RESOURCE}/openai-adapter`;
  const model = getLanguageModel(baseURL, actionHeaders, headerMetadata);

  const result = streamText({
    model,
    messages: [
      {
        role: 'system',
        content: `You are an assistant that help the user to explore upload files
        
        You can lookup for information inside the files by using the lookup_files tool.
          - Use this tool if you need to perform a similarity search.
          - When you don't know what to search, pass the threshold as 0.

        Use the list_files tool to list the files.
          - This will return a list of files that are available in the explore view of the page.
        `,
      },
      ...convertToCoreMessages(messages),
    ],
    maxSteps: 10,
    tools: {
      list_files: tool({
        description: 'List the selected files',
        parameters: z.object({}),
        execute: async () => {
          return files;
        },
      }),
      lookup_files: tool({
        description: 'Lookup for information inside the selected files',
        parameters: z.object({
          search: z.string().describe('The search query'),
          scoreThreshold: z
            .number()
            .optional()
            .describe(
              'The score threshold for the search, between 0 and 1, use 0 to return all results'
            ),
          fileIds: z
            .array(z.string())
            .optional()
            .describe('The file ids to search'),
          limit: z
            .number()
            .optional()
            .describe('The limit of results to return'),
        }),
        execute: async ({ search, scoreThreshold, fileIds, limit }) => {
          try {
            const score = scoreThreshold === undefined ? 0.3 : scoreThreshold;
            const response = await fileClassifierApi.similaritySearch(
              {
                project_id: projectId,
              },
              {
                query: search,
                file_ids: fileIds ?? files.map((file: FileRead) => file.id),
                when_match_return: 'content',
                before_neighbor_count: score > 0.3 ? 1 : 0,
                after_neighbor_count: score > 0.3 ? 1 : 0,
                score_threshold: score,
                order_by: score > 0.3 ? 'score' : 'chunk',
                limit: limit ?? 10,
              }
            );

            return response.data;
          } catch (error) {
            return {
              error: `An error occurred while searching for the files: ${error}`,
            };
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}

function getLanguageModel(
  baseURL: string,
  actionHeaders: ReadonlyHeaders,
  headerMetadata: Record<string, JSONValue>
) {
  return createOpenAI({
    apiKey: process.env.VMX_API_KEY,
    baseURL,
    fetch: async (...args) => {
      const sourceIp = actionHeaders.get('x-forwarded-for');
      if (args[1] && sourceIp) {
        args[1].headers = {
          ...(args[1]?.headers ?? {}),
          'x-forwarded-for': sourceIp,
        };
      }

      const resp = await fetch(...args);

      resp.headers.forEach((value, key) => {
        if (!key.startsWith('x-vm-x-')) {
          return;
        }

        const normalizedKey = camelCase(key.replace('x-vm-x-', ''));
        if (normalizedKey === 'fallback') {
          headerMetadata[normalizedKey] = value === 'true';
        } else if (normalizedKey === 'fallbackAttempts') {
          headerMetadata[normalizedKey] = parseInt(value, 10);
        } else {
          headerMetadata[normalizedKey] = value;
        }
      });

      return resp;
    },
  }).languageModel('gpt-4o');
}
