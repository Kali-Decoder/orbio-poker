import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { SESSION_COOKIE, getSession } from './auth.js';
import { AgentModel } from './db.js';

export const agentsRouter = Router();

const ALLOWED_MODELS = new Set([
  'anthropic/claude-fable-5.1',
  'openai/gpt-6-astra',
]);

const DEFAULT_SYSTEM_PROMPT = `You are a No-Limit Texas Hold'em agent.
Reply with JSON only: {"action":"fold"|"check"|"call"|"bet"|"raise"|"all-in","amount"?:number}.
Never explain. Never invent chip movements outside the action schema.`;

async function requireSession(req: { cookies?: Record<string, string> }) {
  const session = await getSession(req.cookies?.[SESSION_COOKIE]);
  if (!session) throw new Error('NotAuthenticated');
  return session;
}

function serialize(agent: {
  agentId: string;
  name: string;
  model: string;
  systemPrompt?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    agentId: agent.agentId,
    name: agent.name,
    model: agent.model,
    systemPrompt: agent.systemPrompt ?? '',
    isActive: agent.isActive,
    createdAt: agent.createdAt?.toISOString() ?? null,
    updatedAt: agent.updatedAt?.toISOString() ?? null,
  };
}

agentsRouter.get('/models', (_req, res) => {
  res.json({
    models: [
      {
        id: 'anthropic/claude-fable-5.1',
        label: 'Claude Fable 5.1',
        provider: 'anthropic',
      },
      {
        id: 'openai/gpt-6-astra',
        label: 'GPT-6 Astra',
        provider: 'openai',
      },
    ],
  });
});

agentsRouter.get('/', async (req, res) => {
  try {
    const session = await requireSession(req);
    const agents = await AgentModel.find({
      ownerSessionId: session.sessionId,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ agents: agents.map(serialize) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res
      .status(message === 'NotAuthenticated' ? 401 : 500)
      .json({ error: message });
  }
});

agentsRouter.post('/', async (req, res) => {
  try {
    const session = await requireSession(req);
    const name = String(req.body?.name ?? '').trim();
    const model = String(req.body?.model ?? '').trim();
    const systemPrompt = String(
      req.body?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
    ).trim();

    if (name.length < 2 || name.length > 40) {
      res.status(400).json({ error: 'Name must be 2-40 characters.' });
      return;
    }
    if (!ALLOWED_MODELS.has(model)) {
      res.status(400).json({ error: 'Unsupported Orbio model.' });
      return;
    }
    if (systemPrompt.length > 4000) {
      res.status(400).json({ error: 'System prompt too long.' });
      return;
    }

    const agent = await AgentModel.create({
      agentId: `agent_${uuidv4().slice(0, 8)}`,
      ownerSessionId: session.sessionId,
      name,
      model,
      systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      isActive: true,
    });

    res.status(201).json(serialize(agent));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res
      .status(message === 'NotAuthenticated' ? 401 : 400)
      .json({ error: message });
  }
});

agentsRouter.patch('/:id', async (req, res) => {
  try {
    const session = await requireSession(req);
    const agent = await AgentModel.findOne({
      agentId: req.params.id,
      ownerSessionId: session.sessionId,
    });
    if (!agent) {
      res.status(404).json({ error: 'AgentNotFound' });
      return;
    }

    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim();
      if (name.length < 2 || name.length > 40) {
        res.status(400).json({ error: 'Name must be 2-40 characters.' });
        return;
      }
      agent.name = name;
    }
    if (typeof req.body?.isActive === 'boolean') {
      agent.isActive = req.body.isActive;
    }
    if (typeof req.body?.systemPrompt === 'string') {
      const systemPrompt = req.body.systemPrompt.trim();
      if (systemPrompt.length > 4000) {
        res.status(400).json({ error: 'System prompt too long.' });
        return;
      }
      agent.systemPrompt = systemPrompt;
    }

    await agent.save();
    res.json(serialize(agent));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res
      .status(message === 'NotAuthenticated' ? 401 : 400)
      .json({ error: message });
  }
});

agentsRouter.delete('/:id', async (req, res) => {
  try {
    const session = await requireSession(req);
    const result = await AgentModel.deleteOne({
      agentId: req.params.id,
      ownerSessionId: session.sessionId,
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'AgentNotFound' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res
      .status(message === 'NotAuthenticated' ? 401 : 400)
      .json({ error: message });
  }
});
