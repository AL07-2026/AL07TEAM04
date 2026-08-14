import { GoogleGenAI } from '@google/genai';

export const GEMINI_FLASH_MODEL = 'gemini-3.6-flash';
const GEMINI_TEST_PROMPT = "다음 문장에 정확히 '연결 성공'이라는 의미로 짧게 답해줘.";

export class GeminiClientError extends Error {
  constructor(status, code, message, cause) {
    super(message);
    this.name = 'GeminiClientError';
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
}

export function createGeminiClient() {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new GeminiClientError(500, 'missing_api_key', 'Gemini API key is not configured.');
  }

  return new GoogleGenAI({ apiKey });
}

function getErrorStatus(error) {
  if (!error || typeof error !== 'object') return undefined;
  return error.status ?? error.statusCode ?? error.code;
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown Gemini API error.';
}

export function mapGeminiError(error) {
  const status = Number(getErrorStatus(error));
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (status === 401 || status === 403 || lowerMessage.includes('api key')) {
    return new GeminiClientError(502, 'authentication_failed', 'Gemini API authentication failed.', error);
  }

  if (status === 429 || lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || lowerMessage.includes('rate-limit')) {
    return new GeminiClientError(429, 'rate_limited', 'Gemini API rate limit exceeded.', error);
  }

  if (status === 400 || status === 404 || lowerMessage.includes('model')) {
    return new GeminiClientError(502, 'model_unavailable', 'Gemini model is unavailable or invalid.', error);
  }

  if (
    error instanceof TypeError ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnreset') ||
    lowerMessage.includes('etimedout')
  ) {
    return new GeminiClientError(503, 'network_error', 'Gemini API network request failed.', error);
  }

  return new GeminiClientError(502, 'gemini_api_error', 'Gemini API request failed.', error);
}

export async function generateGeminiConnectionTest() {
  let client;

  try {
    client = createGeminiClient();
  } catch (error) {
    if (error instanceof GeminiClientError) throw error;
    throw new GeminiClientError(500, 'gemini_client_error', 'Failed to initialize Gemini client.', error);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: GEMINI_TEST_PROMPT,
      config: {
        temperature: 0,
        maxOutputTokens: 32,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new GeminiClientError(502, 'empty_response', 'Gemini API returned an empty response.');
    }

    return text;
  } catch (error) {
    if (error instanceof GeminiClientError) throw error;
    throw mapGeminiError(error);
  }
}

export function getGeminiLogDetails(error) {
  const cause = error instanceof GeminiClientError ? error.cause : error;

  return {
    code: error instanceof GeminiClientError ? error.code : 'unexpected_error',
    status: error instanceof GeminiClientError ? error.status : undefined,
    causeName: cause instanceof Error ? cause.name : undefined,
    causeMessage: getErrorMessage(cause),
    causeStatus: getErrorStatus(cause),
  };
}
