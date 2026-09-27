'use client';

import React, { useMemo } from 'react';

import type { PublicGameView } from '~/lib/api';
import { ChipAmount } from '~/components/currency-amount';
import { cn } from '~/lib/utils';
import { useSession } from '~/providers/session-provider';

import { ActionBar, type LocalTableAction } from './action-bar';
import { PlayerSeat, seatPositions } from './player-seat';
import { SleekCard } from './sleek-card';

interface SleekTableProps {
  gameId: string;
  view: PublicGameView;
  /** Fixed stack for seats (preview / offline UI). */
  stackOverride?: number;
  /** Per-seat stacks when stacks differ (dummy play). */
  stacksByPlayerId?: Record<string, number>;
  /** Hide live action bar — for dual-player UI previews. */
  preview?: boolean;
  /** Compact layout for side-by-side testing. */
  compact?: boolean;
  /** Offline / dummy table actions. */
  onLocalAction?: (action: LocalTableAction) => void;
}

export const SleekTable = ({
  gameId,
  view,
  stackOverride,
  stacksByPlayerId,
  preview = false,
  compact = false,
  onLocalAction,
}: SleekTableProps) => {
  const { user } = useSession();
  const seatStacks = stacksByPlayerId ?? view.stacksByPlayerId;
  const defaultStack = stackOverride ?? user?.chips ?? 10000;
  const myStack =
    (view.myPlayerId && seatStacks?.[view.myPlayerId]) ?? defaultStack;
  const dealerSeat = view.dealerSeat ?? 0;

  const ordered = useMemo(() => {
    const players = [...view.players].sort((a, b) => a.seat - b.seat);
    const myIndex = players.findIndex((p) => p.id === view.myPlayerId);
    if (myIndex <= 0) return players;
    return [...players.slice(myIndex), ...players.slice(0, myIndex)];
  }, [view.players, view.myPlayerId]);

  const positions = seatPositions(Math.max(ordered.length, 2));
  const board = view.communityCards.filter((c) => c >= 0);

  return (
    <div
      className={cn(
        'flex w-full flex-col overflow-hidden bg-[#F7F7F8]',
        compact ? 'h-full min-h-[28rem] pt-2' : 'h-[100dvh] pt-16'
      )}
    >
      <div className='relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center px-2 sm:px-4 lg:max-w-7xl xl:max-w-[84rem]'>
        <div
          className={cn(
            'relative aspect-[1.75/1] w-full',
            compact
              ? 'max-h-[min(42vh,360px)]'
              : 'max-h-[min(calc(100dvh-13.5rem),560px)] lg:max-h-[min(calc(100dvh-13.5rem),640px)] xl:max-h-[min(calc(100dvh-13.5rem),700px)]'
          )}
        >
          <div className='absolute inset-[7%] rounded-[999px] border-[3px] border-neutral-950 bg-[#C8E6C9] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] lg:border-[4px]' />
          <div className='absolute inset-[11%] rounded-[999px] border border-black/10' />

          <div className='absolute left-1/2 top-1/2 z-10 flex w-full -translate-x-1/2 -translate-y-[55%] flex-col items-center gap-3 lg:gap-3.5'>
            <div className='flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-[13px] font-medium text-neutral-500 shadow-sm backdrop-blur lg:px-5 lg:py-2 lg:text-sm'>
              Pot
              <ChipAmount
                value={view.pot}
                size='sm'
                className='text-[13px] text-neutral-900 lg:text-sm'
                iconClassName='h-4 w-4'
              />
              <span className='mx-1 text-neutral-300'>·</span>
              <span className='font-semibold text-neutral-800'>
                {view.roundLabel}
              </span>
            </div>

            <div className='flex min-h-[4.75rem] items-center gap-2 lg:min-h-[5.5rem] lg:gap-2.5 xl:min-h-[6rem]'>
              {board.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-neutral-300/80 px-5 py-4 text-xs text-neutral-400 lg:px-6 lg:text-sm'>
                  Waiting for flop
                </div>
              ) : (
                <>
                  {board.map((cardId, i) => (
                    <SleekCard
                      key={`board-${i}-${cardId}`}
                      cardId={cardId}
                      className='hover:-translate-y-0.5'
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
                isDealer={player.seat === dealerSeat}
                isMe={isMe}
                isTurn={
                  player.id === view.nextPlayerId && view.status === 'playing'
                }
                player={player}
                stack={seatStacks?.[player.id] ?? defaultStack}
                avatarUrl={isMe ? user?.avatar : null}
                style={{ left: pos.left, top: pos.top }}
              />
            );
          })}
        </div>
      </div>

      {!preview &&
      view.status === 'playing' &&
      view.round !== 'End' &&
      !view.gameEnded ? (
        <div className='shrink-0'>
          <ActionBar
            gameId={gameId}
            highestBet={view.highestBet}
            minRaiseIncrement={view.minRaise ?? 1}
            isMyTurn={view.isMyTurn}
            myChipsInPot={
              view.players.find((p) => p.id === view.myPlayerId)?.chipsInPot ?? 0
            }
            stack={myStack}
            onLocalAction={onLocalAction}
          />
        </div>
      ) : (
        <div className={cn('shrink-0', compact ? 'h-6' : 'h-24')} />
      )}
    </div>
  );
};
