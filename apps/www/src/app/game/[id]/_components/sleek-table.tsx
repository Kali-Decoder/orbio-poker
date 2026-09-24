'use client';

import React, { useMemo } from 'react';

import type { PublicGameView } from '~/lib/api';
import { ChipAmount } from '~/components/currency-amount';
import { useSession } from '~/providers/session-provider';

import { ActionBar } from './action-bar';
import { PlayerSeat, seatPositions } from './player-seat';
import { SleekCard } from './sleek-card';

interface SleekTableProps {
  gameId: string;
  view: PublicGameView;
}

export const SleekTable = ({ gameId, view }: SleekTableProps) => {
  const { user } = useSession();
  const stack = user?.chips ?? 10000;

  const ordered = useMemo(() => {
    const players = [...view.players].sort((a, b) => a.seat - b.seat);
    const myIndex = players.findIndex((p) => p.id === view.myPlayerId);
    if (myIndex <= 0) return players;
    return [...players.slice(myIndex), ...players.slice(0, myIndex)];
  }, [view.players, view.myPlayerId]);

  const positions = seatPositions(Math.max(ordered.length, 2));
  const board = view.communityCards.filter((c) => c >= 0);

  return (
    <div className='flex h-[100dvh] w-full flex-col bg-[#F7F7F8] pt-16'>
      <div className='relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4'>
        <div className='relative aspect-[1.75/1] w-full max-h-[min(64vh,580px)]'>
          <div className='absolute inset-[7%] rounded-[999px] border-[3px] border-neutral-950 bg-[#C8E6C9] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]' />
          <div className='absolute inset-[11%] rounded-[999px] border border-black/10' />

          <div className='absolute left-1/2 top-1/2 z-10 flex w-full -translate-x-1/2 -translate-y-[55%] flex-col items-center gap-3'>
            <div className='flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-[13px] font-medium text-neutral-500 shadow-sm backdrop-blur'>
              Pot
              <ChipAmount
                value={view.pot}
                size='sm'
                className='text-[13px] text-neutral-900'
                iconClassName='h-4 w-4'
              />
              <span className='mx-1 text-neutral-300'>·</span>
              <span className='font-semibold text-neutral-800'>
                {view.roundLabel}
              </span>
            </div>

            <div className='flex min-h-[4.75rem] items-center gap-2'>
              {board.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-neutral-300/80 px-5 py-4 text-xs text-neutral-400'>
                  Board deals after ante
                </div>
              ) : (
                <>
                  {board.map((cardId, i) => (
                    <SleekCard
                      key={`board-${i}-${cardId}`}
                      cardId={cardId}
                      size='md'
                    />
                  ))}
                  {board.length < 5
                    ? Array.from({ length: 5 - board.length }).map((_, i) => (
                        <SleekCard key={`pad-${i}`} cardId={-1} size='md' />
                      ))
                    : null}
                </>
              )}
            </div>

            {view.gameEnded && view.winnerNickname ? (
              <div className='rounded-full bg-neutral-950 px-4 py-1.5 text-sm font-semibold text-white shadow-lg'>
                Winner · {view.winnerNickname}
              </div>
            ) : null}
          </div>

          {ordered.map((player, index) => {
            const pos = positions[index] ?? { left: '50%', top: '50%' };
            const isMe = player.id === view.myPlayerId;
            return (
              <PlayerSeat
                key={player.id}
                isDealer={player.seat === 0}
                isMe={isMe}
                isTurn={
                  player.id === view.nextPlayerId && view.status === 'playing'
                }
                player={player}
                stack={stack}
                avatarUrl={isMe ? user?.avatar : null}
                style={{ left: pos.left, top: pos.top }}
              />
            );
          })}
        </div>
      </div>

      {view.status === 'playing' && view.round !== 'End' ? (
        <ActionBar
          gameId={gameId}
          highestBet={view.highestBet}
          isMyTurn={view.isMyTurn}
          myChipsInPot={
            view.players.find((p) => p.id === view.myPlayerId)?.chipsInPot ?? 0
          }
          stack={stack}
        />
      ) : (
        <div className='h-28' />
      )}
    </div>
  );
};
