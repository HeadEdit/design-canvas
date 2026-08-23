import type { AiSettings, ChatMessage } from '../domain/model';
import { getAiErrorMessage } from './error-messages';

export type AiErrorKind =
  | 'network-or-cors'
  | 'auth'
  | 'rate-limit'
  | 'server'
  | 'invalid-response'
  | 'stopped';

export class AiClientError extends Error {
  readonly kind: AiErrorKind;
  readonly retryable: boolean;

  constructor(kind: AiErrorKind, retryable: boolean) {
    super(getAiErrorMessage(kind));
    this.name = 'AiClientError';
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface AiRequestOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export interface AiClient {
  complete(messages: ChatMessage[], options?: AiRequestOptions): Promise<string>;
}

export interface AiClientDependencies {
  fetch?: typeof fetch;
}

function createError(kind: AiErrorKind): AiClientError {
  return new AiClientError(
    kind,
    kind === 'network-or-cors' || kind === 'rate-limit' || kind === 'server',
  );
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return undefined;
  }

  const { name } = error;
  return typeof name === 'string' ? name : undefined;
}

function classifyFetchError(error: unknown, signal?: AbortSignal): AiClientError {
  if (signal?.aborted || errorName(error) === 'AbortError') {
    return createError('stopped');
  }

  if (error instanceof TypeError || errorName(error) === 'TypeError') {
    return createError('network-or-cors');
  }

  return createError('invalid-response');
}

function classifyStatus(status: number): AiClientError {
  if (status === 401 || status === 403) {
    return createError('auth');
  }
  if (status === 429) {
    return createError('rate-limit');
  }
  if (status >= 500 && status <= 599) {
    return createError('server');
  }
  return createError('invalid-response');
}

function isLocalHttpHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function createEndpoint(baseUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return undefined;
  }

  const isAllowedProtocol =
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && isLocalHttpHost(url.hostname));
  if (
    !isAllowedProtocol ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return undefined;
  }

  url.pathname = `${url.pathname.replace(/\/+$/, '')}/chat/completions`;
  return url.toString();
}

function getContent(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('choices' in payload)) {
    return undefined;
  }

  const { choices } = payload;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }

  const firstChoice = choices[0];
  if (
    typeof firstChoice !== 'object' ||
    firstChoice === null ||
    !('message' in firstChoice)
  ) {
    return undefined;
  }

  const { message } = firstChoice;
  if (typeof message !== 'object' || message === null || !('content' in message)) {
    return undefined;
  }

  const { content } = message;
  if (typeof content !== 'string') {
    return undefined;
  }
  return content.trim().length > 0 ? content : undefined;
}

export function createAiClient(
  settings: AiSettings,
  dependencies: AiClientDependencies = {},
): AiClient {
  const requestFetch = dependencies.fetch ?? fetch;

  return {
    async complete(messages, options = {}) {
      const baseUrl = settings.baseUrl.trim();
      const apiKey = settings.apiKey.trim();
      const model = settings.model.trim();

      if (
        !baseUrl ||
        !apiKey ||
        !model ||
        (options.temperature !== undefined && !Number.isFinite(options.temperature))
        || (options.maxTokens !== undefined
          && (!Number.isFinite(options.maxTokens) || options.maxTokens < 1))
      ) {
        throw createError('invalid-response');
      }

      const url = createEndpoint(baseUrl);
      if (!url) {
        throw createError('invalid-response');
      }

      const body = {
        model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        ...(model.toLowerCase().startsWith('deepseek-')
          ? { thinking: { type: settings.thinkingEnabled ? 'enabled' : 'disabled' } }
          : {}),
        ...(options.temperature === undefined
          ? {}
          : { temperature: options.temperature }),
        ...(options.maxTokens === undefined
          ? {}
          : { max_tokens: Math.floor(options.maxTokens) }),
      };

      let response: Response;
      try {
        response = await requestFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: options.signal,
        });
      } catch (error) {
        throw classifyFetchError(error, options.signal);
      }

      if (!response.ok) {
        throw classifyStatus(response.status);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw classifyFetchError(error, options.signal);
      }

      const content = getContent(payload);
      if (content === undefined) {
        throw createError('invalid-response');
      }

      return content;
    },
  };
}
