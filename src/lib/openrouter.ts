export interface ModelConfig {
  id: string;
  label: string;
  promptTokenCost: number;  // $ per 1k tokens
  completionTokenCost: number;
}

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'openai/gpt-4o',
    label: 'ChatGPT',
    promptTokenCost: 0.005,
    completionTokenCost: 0.015,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini',
    promptTokenCost: 0.000075,
    completionTokenCost: 0.0003,
  },
  {
    id: 'perplexity/sonar-pro',
    label: 'Perplexity',
    promptTokenCost: 0.003,
    completionTokenCost: 0.015,
  },
];

export interface OpenRouterResponse {
  rawText: string;
  promptTokens: number;
  completionTokens: number;
  spendUsd: number;
}

export async function callOpenRouter(
  apiKey: string,
  modelId: string,
  prompt: string,
  temperature = 0.1,
  maxTokens = 4000,
): Promise<OpenRouterResponse> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://source-map-builder.local',
      'X-Title': 'Source Map Builder',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new OpenRouterError(res.status, body);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  const rawText = data.choices?.[0]?.message?.content ?? '';
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;

  const model = DEFAULT_MODELS.find((m) => m.id === modelId);
  const spendUsd = model
    ? (promptTokens / 1000) * model.promptTokenCost +
      (completionTokens / 1000) * model.completionTokenCost
    : 0;

  return { rawText, promptTokens, completionTokens, spendUsd };
}

export class OpenRouterError extends Error {
  constructor(public status: number, public body: string) {
    super(`OpenRouter ${status}: ${body.slice(0, 200)}`);
  }
}
