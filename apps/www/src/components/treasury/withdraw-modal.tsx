'use client';

import React, { useMemo, useState } from 'react';

import { ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { api } from '~/lib/api';
import { chipsFromNight, nightFromChips, quoteWithdrawNight } from '~/lib/treasury';
import { errorHandler } from '~/lib/utils';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WithdrawModal({ open, onOpenChange }: Props) {
  const { isConnected, connect, walletStatus, isConnecting } =
    useMidnightWallet();
  const { user, refresh } = useSession();
  const maxNight = user ? nightFromChips(user.chips) : 0;
  const [nightAmount, setNightAmount] = useState('');
  const [pending, setPending] = useState(false);

  const night = Number(nightAmount);
  const quote = useMemo(
    () =>
      Number.isFinite(night) && night > 0 ? quoteWithdrawNight(night) : null,
    [night]
  );
  const chipsRequired =
    Number.isFinite(night) && night > 0 ? chipsFromNight(night) : 0;

  const onWithdraw = async () => {
    if (!Number.isFinite(night) || night <= 0) {
      toast.error('Enter a positive NIGHT amount');
      return;
    }
    if (!isConnected) {
      try {
        if (walletStatus === 'not-found') {
          throw new Error('No Midnight wallet found.');
        }
        await connect();
      } catch (error) {
        toast.error(errorHandler(error));
        return;
      }
    }
    if (!user) {
      toast.error('Connect wallet and create a session first');
      return;
    }
    if (chipsRequired > user.chips) {
      toast.error('Not enough chips for this withdrawal');
      return;
    }

    setPending(true);
    try {
      const result = await api.treasuryWithdraw(night);
      await refresh();
      toast.success(
        `Withdrawn — you receive ${result.netNight} NIGHT (5% fee retained)`
      );
      onOpenChange(false);
      setNightAmount('');
    } catch (error) {
      toast.error(errorHandler(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md rounded-3xl border-neutral-200 bg-white p-6'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-semibold text-neutral-950'>
            <span className='flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700'>
              <ArrowUpFromLine className='h-4 w-4' />
            </span>
            Withdraw NIGHT
          </DialogTitle>
          <DialogDescription className='text-neutral-600'>
            Cash out table chips to NIGHT. A fixed{' '}
            <span className='font-medium text-neutral-900'>5% fee</span> stays
            in the treasury; you receive 95%.
          </DialogDescription>
        </DialogHeader>

        <div className='mt-2 space-y-4'>
          <div className='flex items-center justify-between text-sm text-neutral-500'>
            <span>Available</span>
            <button
              type='button'
              className='font-medium text-neutral-900 underline-offset-2 hover:underline'
              onClick={() => setNightAmount(String(maxNight || ''))}
            >
              {maxNight.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              NIGHT ({(user?.chips ?? 0).toLocaleString()} chips)
            </button>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='withdraw-night'>Amount (NIGHT)</Label>
            <Input
              id='withdraw-night'
              type='number'
              min={0}
              step='any'
              inputMode='decimal'
              className='rounded-full'
              value={nightAmount}
              onChange={(e) => setNightAmount(e.target.value)}
              placeholder='50'
            />
          </div>

          <div className='rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
            <div className='flex justify-between'>
              <span>Gross</span>
              <span className='font-medium text-neutral-950'>
                {quote ? `${quote.grossNight} NIGHT` : '—'}
              </span>
            </div>
            <div className='mt-2 flex justify-between'>
              <span>Fee (5%)</span>
              <span className='font-medium text-neutral-950'>
                {quote ? `${quote.feeNight} NIGHT` : '—'}
              </span>
            </div>
            <div className='mt-2 flex justify-between border-t border-neutral-200 pt-2'>
              <span>You receive</span>
              <span className='font-semibold text-neutral-950'>
                {quote ? `${quote.netNight} NIGHT` : '—'}
              </span>
            </div>
            <div className='mt-2 flex justify-between text-xs text-neutral-400'>
              <span>Chips debited</span>
              <span>{chipsRequired > 0 ? chipsRequired.toLocaleString() : '—'}</span>
            </div>
          </div>

          <Button
            className='h-11 w-full rounded-full bg-neutral-950 text-white hover:bg-neutral-800'
            disabled={
              pending ||
              isConnecting ||
              !quote ||
              chipsRequired <= 0 ||
              chipsRequired > (user?.chips ?? 0)
            }
            onClick={onWithdraw}
          >
            {pending
              ? 'Withdrawing…'
              : isConnected
                ? 'Withdraw'
                : 'Connect & withdraw'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
