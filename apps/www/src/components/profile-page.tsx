'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Bot, Plus, Trash2, Wallet } from 'lucide-react';
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
import { api, type Agent, type OrbioModelOption } from '~/lib/api';
import { errorHandler } from '~/lib/utils';
import { useSession } from '~/providers/session-provider';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const DEFAULT_PROMPT = `You are a No-Limit Texas Hold'em agent.
Reply with JSON only: {"action":"fold"|"check"|"call"|"bet"|"raise"|"all-in","amount"?:number}.
Never explain. Never invent chip movements outside the action schema.`;

export const ProfilePage = () => {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { user, loading: sessionLoading } = useSession();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<OrbioModelOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [model, setModel] = useState('anthropic/claude-fable-5.1');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);

  const walletAddress = useMemo(
    () => wallets[0]?.address ?? null,
    [wallets]
  );

  const refreshAgents = useCallback(async () => {
    if (!user) {
      setAgents([]);
      setLoadingAgents(false);
      return;
    }
    setLoadingAgents(true);
    try {
      const [{ agents: list }, { models: modelList }] = await Promise.all([
        api.listAgents(),
        api.listModels(),
      ]);
      setAgents(list);
      setModels(modelList);
      if (modelList[0]?.id) setModel(modelList[0].id);
    } catch (error) {
      toast.error(errorHandler(error));
    } finally {
      setLoadingAgents(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  const onCreate = async () => {
    setCreating(true);
    try {
      const agent = await api.createAgent({
        name: name.trim(),
        model,
        systemPrompt: systemPrompt.trim(),
      });
      setAgents((prev) => [agent, ...prev]);
      setName('');
      setSystemPrompt(DEFAULT_PROMPT);
      setShowCreate(false);
      toast.success(`Agent “${agent.name}” created`);
    } catch (error) {
      toast.error(errorHandler(error));
    } finally {
      setCreating(false);
    }
  };

  const onToggle = async (agent: Agent) => {
    try {
      const updated = await api.updateAgent(agent.agentId, {
        isActive: !agent.isActive,
      });
      setAgents((prev) =>
        prev.map((a) => (a.agentId === updated.agentId ? updated : a))
      );
    } catch (error) {
      toast.error(errorHandler(error));
    }
  };

  const onDelete = async (agentId: string) => {
    try {
      await api.deleteAgent(agentId);
      setAgents((prev) => prev.filter((a) => a.agentId !== agentId));
      toast.success('Agent removed');
    } catch (error) {
      toast.error(errorHandler(error));
    }
  };

  if (!ready || sessionLoading) {
    return (
      <div className='mx-auto max-w-3xl px-4 pb-16 pt-24 text-sm text-neutral-500'>
        Loading profile…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-start gap-4 px-4 pb-16 pt-24'>
        <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
          Profile
        </p>
        <h1 className='text-3xl font-semibold tracking-tight text-neutral-950'>
          Connect a wallet to manage agents
        </h1>
        <p className='text-neutral-600'>
          No-Limit Inference agents play off-chain via Orbio. Your wallet
          identity owns the agents you create.
        </p>
        <Button
          className='rounded-full bg-neutral-950 px-5 text-white'
          onClick={() => login()}
        >
          Connect wallet
        </Button>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl px-4 pb-20 pt-24'>
      <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
        Profile
      </p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight text-neutral-950'>
        Your agents
      </h1>
      <p className='mt-2 max-w-xl text-neutral-600'>
        Create an AI agent, pick an Orbio model, then send it to the table.
        Poker runs off-chain; escrow stays on-chain.
      </p>

      <section className='mt-8 flex flex-wrap items-center gap-4 border-y border-neutral-200 py-5'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9BF0] text-lg font-semibold text-white'>
          {(user?.nickname ?? walletAddress ?? '?').slice(0, 1).toUpperCase()}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-lg font-semibold text-neutral-950'>
            {user?.nickname ?? 'Player'}
          </p>
          <p className='flex items-center gap-1.5 truncate text-sm text-neutral-500'>
            <Wallet className='h-3.5 w-3.5 shrink-0' />
            {walletAddress ? shortAddress(walletAddress) : 'Wallet connected'}
          </p>
        </div>
        <div className='text-right text-sm text-neutral-500'>
          <p>
            Stack{' '}
            <span className='font-medium text-neutral-900'>
              {(user?.chips ?? 0).toLocaleString()}
            </span>
          </p>
          <p>
            Agents{' '}
            <span className='font-medium text-neutral-900'>{agents.length}</span>
          </p>
        </div>
      </section>

      <section className='mt-10'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-neutral-950'>AI agents</h2>
          <Button
            className='rounded-full bg-neutral-950 px-4 text-white'
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className='mr-1.5 h-4 w-4' />
            {showCreate ? 'Cancel' : 'Create agent'}
          </Button>
        </div>

        {showCreate && (
          <div className='mt-5 space-y-4 rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-sm'>
            <div className='space-y-2'>
              <Label htmlFor='agent-name'>Name</Label>
              <Input
                id='agent-name'
                className='rounded-full'
                placeholder='Aggressive Ace'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Orbio model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className='rounded-full'>
                  <SelectValue placeholder='Select model' />
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
              <Label htmlFor='agent-prompt'>System prompt</Label>
              <textarea
                id='agent-prompt'
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className='w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-0 focus:border-neutral-400'
              />
            </div>
            <Button
              className='rounded-full bg-neutral-950 text-white'
              disabled={creating || name.trim().length < 2}
              onClick={onCreate}
            >
              {creating ? 'Creating…' : 'Save agent'}
            </Button>
          </div>
        )}

        <div className='mt-6 space-y-3'>
          {loadingAgents && (
            <p className='text-sm text-neutral-500'>Loading agents…</p>
          )}
          {!loadingAgents && agents.length === 0 && (
            <div className='rounded-[1.5rem] border border-dashed border-neutral-300 bg-white/60 px-5 py-10 text-center'>
              <Bot className='mx-auto h-8 w-8 text-neutral-400' />
              <p className='mt-3 text-sm font-medium text-neutral-900'>
                No agents yet
              </p>
              <p className='mt-1 text-sm text-neutral-500'>
                Create one to start AI-vs-AI or agent-backed tables.
              </p>
            </div>
          )}
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className='flex flex-col gap-3 rounded-[1.5rem] border border-neutral-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between'
            >
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='font-semibold text-neutral-950'>{agent.name}</p>
                  <span
                    className={
                      agent.isActive
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                        : 'rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500'
                    }
                  >
                    {agent.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className='mt-1 truncate text-sm text-neutral-500'>
                  {agent.model}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className='rounded-full'
                  onClick={() => onToggle(agent)}
                >
                  {agent.isActive ? 'Pause' : 'Activate'}
                </Button>
                <Button
                  variant='outline'
                  className='rounded-full'
                  onClick={() => router.push('/game')}
                >
                  Play
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='rounded-full text-neutral-500'
                  aria-label='Delete agent'
                  onClick={() => onDelete(agent.agentId)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-12 flex flex-wrap gap-3'>
        <Button asChild className='rounded-full bg-neutral-950 text-white'>
          <Link href='/agents/create'>Full create flow</Link>
        </Button>
        <Button asChild variant='outline' className='rounded-full'>
          <Link href='/game'>Browse games</Link>
        </Button>
      </section>
    </div>
  );
};
