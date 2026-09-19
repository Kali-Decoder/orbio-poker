'use client';

import Link from 'next/link';

import React, { useState } from 'react';

import { api, type LobbyGame } from '~/lib/api';
import { formatTokens } from '~/lib/format';
import { cn } from '~/lib/utils';

import { useQuery } from '@tanstack/react-query';

import { Button } from './ui/button';

type Filter = 'active' | 'waiting' | 'playing' | 'ended' | 'all';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'waiting', label: 'Lobby' },
  { id: 'playing', label: 'In play' },
  { id: 'ended', label: 'Ended' },
  { id: 'all', label: 'All' },
];

const STATUS_STYLE: Record<string, string> = {
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  shuffling: 'bg-sky-50 text-sky-700 border-sky-200',
  playing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ended: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

interface GameCardProps {
  game: LobbyGame;
}

export const GameCard = ({ game }: GameCardProps) => {
  const statusClass =
    STATUS_STYLE[game.status] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200';

  return (
    <div className='flex h-full w-full min-w-0 flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5'>
      <div className='flex items-center justify-between gap-2'>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
            statusClass
          )}
        >
          {game.status}
        </span>
        <span className='shrink-0 text-xs text-neutral-400'>
          {game.currentRound}
        </span>
      </div>
      <div className='truncate font-mono text-xs text-neutral-800 sm:text-sm'>
        {game.gameId}
      </div>
      <div className='flex min-h-6 flex-wrap gap-1.5'>
        {(game.players ?? []).map((p) => (
          <span
            key={p.id}
            className='rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600'
          >
            {p.nickname}
          </span>
        ))}
      </div>
      <div className='mt-auto flex justify-between text-sm text-neutral-600'>
        <span>{game.totalPlayers} players</span>
        <span>Pot {formatTokens(game.pot ?? 0)}</span>
      </div>
      {game.winnerNickname ? (
        <div className='text-xs font-medium text-neutral-500'>
          Winner · {game.winnerNickname}
        </div>
      ) : null}
      <Link href={`/game/${game.gameId}`} className='block w-full'>
        <Button className='h-10 w-full rounded-full bg-neutral-950 text-white'>
          {game.status === 'waiting' ? 'Join table' : 'Open table'}
        </Button>
      </Link>
    </div>
  );
};

export const GamesList = () => {
  const [filter, setFilter] = useState<Filter>('active');

  const { data, isLoading } = useQuery({
    queryKey: ['games', filter],
    queryFn: async () => {
      if (filter === 'all' || filter === 'ended') {
        const res = await api.listGames({
          includeEnded: true,
          status: filter === 'ended' ? 'ended' : undefined,
        });
        return res.games;
      }
      if (filter === 'active') {
        const res = await api.listGames();
        return res.games;
      }
      if (filter === 'playing') {
        const res = await api.listGames({
          status: 'playing,shuffling',
        });
        return res.games;
      }
      const res = await api.listGames({ status: 'waiting' });
      return res.games;
    },
    refetchInterval: 3000,
  });

  return (
    <div className='min-h-screen w-full bg-[#F7F7F8]'>
      <div className='mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='font-poker text-3xl tracking-wide text-neutral-900 sm:text-4xl'>
              Tables
            </h1>
            <p className='mt-1 text-sm text-neutral-500'>
              Lobbies and live status from MongoDB
            </p>
          </div>
        </div>

        <div className='mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-8 sm:flex-wrap sm:overflow-visible sm:px-0'>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type='button'
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                filter === f.id
                  ? 'border-neutral-900 bg-neutral-950 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              )}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className='mt-6 sm:mt-8'>
          {isLoading ? (
            <div className='text-sm text-neutral-400'>Loading lobbies…</div>
          ) : (data?.length ?? 0) > 0 ? (
            <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {data!.map((game) => (
                <GameCard key={game.gameId} game={game} />
              ))}
            </div>
          ) : (
            <div className='rounded-3xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-500 sm:p-10 sm:text-base'>
              No tables in this filter. Create one from the nav.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
