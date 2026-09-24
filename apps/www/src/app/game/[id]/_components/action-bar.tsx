'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { ChipAmount } from '~/components/currency-amount';
import { playSound } from '~/lib/sounds';
import { useSocket } from '~/providers/socket-provider';
import { cn, errorHandler } from '~/lib/utils';

import { toast } from 'sonner';

const PRESETS = [25, 33, 75, 133] as const;

interface ActionBarProps {
  gameId: string;
  isMyTurn: boolean;
  highestBet: number;
  myChipsInPot: number;
  stack: number;
  disabled?: boolean;
}

export const ActionBar = ({
  gameId,
  isMyTurn,
  highestBet,
  myChipsInPot: _myChipsInPot,
  stack,
  disabled,
}: ActionBarProps) => {
  const { socket } = useSocket();
  const canCheck = highestBet <= 0;
  const callAmount = Math.max(highestBet, 0);
  const minRaise = Math.max(highestBet + 1, 1);
  const sliderMin = canCheck ? 1 : minRaise;
  const sliderMax = Math.max(stack, callAmount, minRaise, 100);
  const [amount, setAmount] = useState(
    canCheck ? Math.max(Math.round(stack * 0.75), 1) : minRaise
  );
  const [preset, setPreset] = useState<number | null>(canCheck ? 75 : null);

  useEffect(() => {
    if (canCheck) {
      setAmount(Math.max(Math.round(stack * 0.75), 1));
      setPreset(75);
    } else {
      setAmount(minRaise);
      setPreset(null);
    }
  }, [canCheck, highestBet, minRaise, stack]);

  const applyPreset = (pct: number) => {
    setPreset(pct);
    const next = Math.max(sliderMin, Math.round((stack * pct) / 100));
    setAmount(Math.min(next, sliderMax));
  };

  const canAct = isMyTurn && !disabled && Boolean(socket);

  const emit = (event: string, payload: Record<string, unknown>) => {
    try {
      if (!socket) throw new Error('Not connected.');
      if (!isMyTurn) throw new Error('Not your turn.');
      socket.emit(event, payload);
    } catch (error) {
      toast.error(errorHandler(error));
    }
  };

  const onFold = () => {
    playSound('paajiLose');
    emit('game:fold', { gameId });
  };
  const onCheck = () => {
    playSound('bet');
    emit('game:bet', { gameId, amount: 0 });
  };
  const onCall = () => {
    playSound(callAmount >= stack ? 'bomb' : 'bet');
    emit('game:bet', { gameId, amount: callAmount });
  };
  const onBetOrRaise = () => {
    if (amount < sliderMin) {
      toast.error(
        canCheck
          ? 'Bet must be at least 1.'
          : 'Raise must be higher than the current bet.'
      );
      return;
    }
    playSound(amount >= stack ? 'bomb' : 'bet');
    emit('game:bet', { gameId, amount });
  };

  const clamped = Math.min(Math.max(amount, sliderMin), sliderMax);
  const fillPct = useMemo(() => {
    if (sliderMax <= sliderMin) return 100;
    return ((clamped - sliderMin) / (sliderMax - sliderMin)) * 100;
  }, [clamped, sliderMin, sliderMax]);

  const primaryLabel = canCheck ? 'Bet' : 'Raise';

  return (
    <div className='pointer-events-auto mx-auto w-full max-w-xl px-4 pb-6 pt-2'>
      <div className='flex flex-col items-center gap-2.5'>
        {/* Sizing bar */}
        <div className='flex w-full items-center gap-3 rounded-full border border-neutral-200/90 bg-white px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.05)] sm:gap-4 sm:px-4'>
          <div className='flex shrink-0 items-center gap-0.5'>
            {PRESETS.map((p) => (
              <button
                key={p}
                type='button'
                className={cn(
                  'rounded-full px-2 py-1 text-[12px] font-semibold tabular-nums transition-colors sm:px-2.5',
                  preset === p
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-700'
                )}
                disabled={!canAct}
                onClick={() => applyPreset(p)}
              >
                {p}%
              </button>
            ))}
          </div>

          <div className='relative mx-1 min-w-0 flex-1'>
            <div className='pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-neutral-200'>
              <div
                className='h-full rounded-full bg-[#1D9BF0]'
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <input
              aria-label='Bet amount'
              className={cn(
                'relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-40',
                '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent',
                '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.18)] [&::-webkit-slider-thumb]:-mt-[5px]',
                '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent',
                '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.18)]'
              )}
              disabled={!canAct}
              max={sliderMax}
              min={sliderMin}
              step={1}
              type='range'
              value={clamped}
              onChange={(e) => {
                setPreset(null);
                setAmount(Number(e.target.value));
              }}
            />
          </div>

          <div className='shrink-0 whitespace-nowrap sm:text-sm'>
            <ChipAmount
              value={clamped}
              size='sm'
              className='text-[13px] sm:text-sm'
              iconClassName='h-4 w-4'
            />
          </div>
        </div>

        {/* Action bar */}
        <div className='flex w-full max-w-md items-center justify-between gap-2 rounded-full border border-neutral-200/90 bg-white px-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.05)] sm:px-2.5'>
          <button
            type='button'
            className='min-w-[4.5rem] rounded-full px-4 py-2.5 text-[13px] font-semibold text-neutral-500 transition hover:text-neutral-800 disabled:opacity-35'
            disabled={!canAct}
            onClick={onFold}
          >
            Fold
          </button>

          {canCheck ? (
            <button
              type='button'
              className='min-w-[7rem] flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-[13px] font-semibold text-neutral-900 transition hover:bg-neutral-200/80 active:scale-[0.98] disabled:opacity-35'
              disabled={!canAct}
              onClick={onCheck}
            >
              Check
            </button>
          ) : (
            <button
              type='button'
              className='min-w-[7rem] flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-[13px] font-semibold text-neutral-900 transition hover:bg-neutral-200/80 active:scale-[0.98] disabled:opacity-35'
              disabled={!canAct}
              onClick={onCall}
            >
              Call <ChipAmount value={callAmount} size='sm' className='inline-flex text-[13px]' iconClassName='h-3.5 w-3.5' />
            </button>
          )}

          <button
            type='button'
            className='min-w-[7.5rem] flex-1 rounded-full bg-neutral-950 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-35'
            disabled={!canAct}
            onClick={onBetOrRaise}
          >
            {primaryLabel}{' '}
            <ChipAmount
              value={clamped}
              size='sm'
              className='inline-flex text-[13px] text-white'
              iconClassName='h-3.5 w-3.5'
            />
          </button>
        </div>

        {!isMyTurn ? (
          <p className='text-[12px] text-neutral-400'>Waiting for other players…</p>
        ) : null}
      </div>
    </div>
  );
};
