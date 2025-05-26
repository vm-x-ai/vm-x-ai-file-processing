import { ChatMessage } from '@/components/ui/chat-message';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { createOpenAI } from '@ai-sdk/openai';
import type { CoreMessage, JSONValue } from 'ai';
import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue,
} from 'ai/rsc';
import camelCase from 'lodash.camelcase';
import { nanoid } from 'nanoid';
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { headers } from 'next/headers';

export type SubmitUserMessageProps = {
  content: string;
  stream?: boolean;
};

async function submitUserMessage({
  content,
  stream = true,
}: SubmitUserMessageProps) {
  'use server';

  const actionHeaders = await headers();
  const aiState = getMutableAIState<typeof AI>();

  const baseURL = `${process.env.VMX_PROTOCOL}://${process.env.VMX_DOMAIN}/completion/${process.env.VMX_WORKSPACE_ID}/${process.env.VMX_ENVIRONMENT_ID}/${process.env.VMX_RESOURCE}/openai-adapter`;

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content,
      },
    ],
  });

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>;
  let textNode: undefined | React.ReactNode;
  let fullContent = '';
  const headerMetadata: Record<string, JSONValue> = {};

  const requestMessages = [
    ...aiState.get().messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  try {
    const model = getLanguageModel(baseURL, actionHeaders, headerMetadata);

    const result = await streamUI({
      model,
      initial: <TypingIndicator />,
      maxRetries: 1,
      messages: requestMessages as never,
      temperature: undefined,
      text: async ({ content, done, delta }) => {
        fullContent = content;
        if (!textStream) {
          textStream = createStreamableValue('');
          textNode = (
            <ChatMessage
              id={nanoid()}
              role="assistant"
              content={textStream.value as string}
            />
          );
        }

        if (done) {
          const previousState = aiState.get();
          const newState: AIState = {
            ...previousState,
            messages: [
              ...previousState.messages,
              {
                id: nanoid(),
                role: 'assistant',
                content,
                provider: headerMetadata.provider as string,
                model: headerMetadata.model as string,
              },
            ],
          };

          aiState.done(newState);
        } else {
          textStream.update(delta);
        }

        return textNode;
      },
      onFinish() {
        try {
          textStream?.done();
        } catch {
          // ignore
        }
      },
    });

    return {
      success: true,
      id: nanoid(),
      display: result.value,
      content: fullContent,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        errorMessage: error.message,
      };
    }

    return {
      success: false,
      errorMessage: `Unknown error: ${error}`,
    };
  }
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

async function clearHistory() {
  'use server';

  const aiState = getMutableAIState<typeof AI>();

  const newState = {
    ...aiState.get(),
    messages: [],
  };
  aiState.update(newState);
  aiState.done(newState);
}

export type AIState = {
  messages: Message[];
};

export type UIState = {
  id: string;
  content: string;
  display: React.ReactNode;
}[];

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    clearHistory,
  },
  initialUIState: [],
  initialAIState: { messages: [] },
  onGetUIState: async () => {
    'use server';
    const aiState = getAIState() as Chat;
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState);
      return uiState;
    }

    return;
  },
});

export type Message = CoreMessage & {
  id: string;
  provider?: string;
  model?: string;
};

export interface Chat {
  messages: Message[];
}

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      id: message.id,
      content: message.content as string,
      display:
        message.role === 'user' ? (
          <ChatMessage
            id={message.id}
            role="user"
            content={message.content as string}
          />
        ) : (
          <ChatMessage
            id={message.id}
            role="assistant"
            content={message.content as string}
          />
        ),
    }));
};
