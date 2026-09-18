'use client';

import { useRouter } from 'next/navigation';

import React, { useEffect, useState } from 'react';

import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { api, type OrbioModelOption } from '~/lib/api';
import { errorHandler } from '~/lib/utils';
import { useSession } from '~/providers/session-provider';

const DEFAULT_PROMPT = `You are a No-Limit Texas Hold'em agent.
Reply with JSON only: {"action":"fold"|"check"|"call"|"bet"|"raise"|"all-in","amount"?:number}.
Never explain. Never invent chip movements outside the action schema.`;

export default function CreateAgentPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { user } = useSession();
  const [models, setModels] = useState<OrbioModelOption[]>([]);
  const [name, setName] = useState('');
  const [model, setModel] = useState('anthropic/claude-fable-5.1');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api
      .listModels()
      .then((res) => {
        setModels(res.models);
        if (res.models[0]?.id) setModel(res.models[0].id);
      })
      .catch(() => undefined);
  }, []);

  const onSubmit = async () => {
    if (!user) {
      toast.error('Connect wallet and set session first');
      return;
    }
    setPending(true);
    try {
      const agent = await api.createAgent({
        name: name.trim(),
        model,
        systemPrompt: systemPrompt.trim(),
      });
      toast.success(`Created ${agent.name}`);
      router.push('/profile');
    } catch (error) {
      toast.error(errorHandler(error));
    } finally {
      setPending(false);
    }
  };

  if (ready && !authenticated) {
    return (
      <div className='mx-auto max-w-lg px-4 pb-16 pt-24'>
        <h1 className='text-3xl font-semibold tracking-tight'>Create agent</h1>
        <p className='mt-2 text-neutral-600'>Connect your wallet to continue.</p>
        <Button
          className='mt-6 rounded-full bg-neutral-950 text-white'
          onClick={() => login()}
        >
          Connect wallet
        </Button>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-lg px-4 pb-20 pt-24'>
      <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
        Agents
      </p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight text-neutral-950'>
        Create agent
      </h1>
      <p className='mt-2 text-neutral-600'>
        Choose an Orbio model. Inference stays on the server — API keys never
        reach the browser.
      </p>

      <div className='mt-8 space-y-5'>
        <div className='space-y-2'>
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            className='rounded-full'
            placeholder='River Shark'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label>Orbio model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className='rounded-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(models.length
                ? models
                : [
                    {
                      id: 'anthropic/claude-fable-5.1',
                      label: 'Claude Fable 5.1',
                      provider: 'anthropic',
                    },
                  ]
              ).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='prompt'>System prompt</Label>
          <textarea
            id='prompt'
            rows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className='w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400'
          />
        </div>
        <Button
          className='w-full rounded-full bg-neutral-950 text-white'
          disabled={pending || name.trim().length < 2}
          onClick={onSubmit}
        >
          {pending ? 'Creating…' : 'Create agent'}
        </Button>
      </div>
    </div>
  );
}
