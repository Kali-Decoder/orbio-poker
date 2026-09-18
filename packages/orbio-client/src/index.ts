import OpenAI from 'openai';
import { z } from 'zod';

/**
 * Isolated Orbio OpenAI-compatible client.
 * Server-side only — never expose API keys to the browser.
 *
 * Official endpoints (from Orbio setup guide):
 * - OpenAI-compatible: https://api.orbio.so/api/v1
 * - Anthropic-compatible: https://api.orbio.so/api  (ANTHROPIC_BASE_URL)
 */

export const ORBIO_OPENAI_BASE_URL = 'https://api.orbio.so/api/v1';
export const ORBIO_ANTHROPIC_BASE_URL = 'https://api.orbio.so/api';

/** Example model ids from Orbio docs — pass through as-is to the API. */
export const ORBIO_MODELS = {
  claudeFable: 'anthropic/claude-fable-5.1',
  gptAstra: 'openai/gpt-6-astra',
} as const;

export const AgentActionSchema = z.object({
  action: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']),
  amount: z.number().int().nonnegative().optional(),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

export interface OrbioClientConfig {
  apiKey: string;
  /** Defaults to Orbio OpenAI-compatible base URL. */
  baseURL?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

export function createOrbioClient(config: OrbioClientConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error('ORBIO_API_KEY missing (or OPENAI_API_KEY)');
  }
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL ?? ORBIO_OPENAI_BASE_URL,
  });
}

/**
 * Resolve credentials from env.
 * Supports both Orbio-named vars and OpenAI drop-in aliases:
 *   ORBIO_API_KEY / ORBIO_BASE_URL
 *   OPENAI_API_KEY / OPENAI_BASE_URL
 */
export function resolveOrbioEnv(env: NodeJS.ProcessEnv = process.env): {
  apiKey: string;
  baseURL: string;
} {
  const apiKey =
    env.ORBIO_API_KEY ||
    env.OPENAI_API_KEY ||
    env.ANTHROPIC_AUTH_TOKEN ||
    '';
  const baseURL =
    env.ORBIO_BASE_URL ||
    env.OPENAI_BASE_URL ||
    ORBIO_OPENAI_BASE_URL;

  return { apiKey, baseURL };
}

export function orbioFromEnv(env: NodeJS.ProcessEnv = process.env): OpenAI {
  const { apiKey, baseURL } = resolveOrbioEnv(env);
  return createOrbioClient({ apiKey, baseURL });
}

export interface InferenceRequest {
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
}

/**
 * Ask Orbio for a structured poker action (non-streaming).
 * Validates JSON against AgentActionSchema. Does not move tokens.
 */
export async function requestAgentAction(
  client: OpenAI,
  req: InferenceRequest
): Promise<{ action: AgentAction; raw: string; latencyMs: number }> {
  const started = Date.now();
  const timeoutMs = req.timeoutMs ?? 15_000;

  const completionPromise = client.chat.completions.create({
    model: req.model,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const completion = await Promise.race([
    completionPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('InferenceTimeout')), timeoutMs)
    ),
  ]);

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('InvalidJsonFromModel');
  }

  const action = AgentActionSchema.parse(parsed);
  return { action, raw, latencyMs: Date.now() - started };
}

/** Safe fallback when inference fails — never invent aggressive sizes. */
export function fallbackAction(canCheck: boolean): AgentAction {
  return canCheck ? { action: 'check' } : { action: 'fold' };
}
