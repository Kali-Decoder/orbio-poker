# @nli/orbio-client

Server-only wrapper for [Orbio](https://api.orbio.so) — OpenAI-compatible chat completions.

**Never expose API keys to the browser.**

## Official setup (from Orbio guide)

### cURL

```bash
export ORBIO_API_KEY=sk-orbio-…

curl https://api.orbio.so/api/v1/chat/completions \
  -H "Authorization: Bearer $ORBIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-fable-5.1",
    "messages": [{ "role": "user", "content": "Say hello in five words." }]
  }'
```

### OpenAI SDK (preferred in this package)

```ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.ORBIO_API_KEY,
  baseURL: 'https://api.orbio.so/api/v1',
})

const res = await client.chat.completions.create({
  model: 'anthropic/claude-fable-5.1',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
})
```

### OpenAI drop-in env aliases

```bash
# Same two variables your OpenAI-compatible client already reads
OPENAI_BASE_URL=https://api.orbio.so/api/v1
OPENAI_API_KEY=sk-orbio-…
```

### Anthropic CLI / SDK (optional)

```bash
export ANTHROPIC_BASE_URL=https://api.orbio.so/api
export ANTHROPIC_AUTH_TOKEN=sk-orbio-…
export ANTHROPIC_API_KEY=
```

Note: Anthropic base is `/api` (no `/v1`); OpenAI-compatible base is `/api/v1`.

### Vercel AI SDK

```ts
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const orbio = createOpenAI({
  apiKey: process.env.ORBIO_API_KEY,
  baseURL: 'https://api.orbio.so/api/v1',
})

const { textStream } = streamText({
  model: orbio.chat('openai/gpt-6-astra'),
  prompt: 'Hello',
})
```

## Env (this monorepo)

```bash
ORBIO_API_KEY=sk-orbio-…
ORBIO_BASE_URL=https://api.orbio.so/api/v1
# optional aliases also work:
# OPENAI_API_KEY / OPENAI_BASE_URL
```

## Agent usage

```ts
import {
  orbioFromEnv,
  requestAgentAction,
  fallbackAction,
  ORBIO_MODELS,
} from '@nli/orbio-client';

const client = orbioFromEnv();
try {
  const { action } = await requestAgentAction(client, {
    model: ORBIO_MODELS.claudeFable,
    system: 'You are a No-Limit Hold\'em agent. Reply with JSON only.',
    user: JSON.stringify(agentContext),
  });
} catch {
  const action = fallbackAction(canCheck);
}
```

LLM output is Zod-validated and **never** settles on-chain tokens.
