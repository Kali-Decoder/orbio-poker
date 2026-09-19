'use client';

import React, { useMemo, useState } from 'react';

import { ArrowDownToLine } from 'lucide-react';
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
import { chipsFromNight } from '~/lib/treasury';
import { errorHandler } from '~/lib/utils';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DepositModal({ open, onOpenChange }: Props) {
  const { isConnected, connect, walletStatus, isConnecting } =
    useMidnightWallet();
  const { user, refresh } = useSession();
  const [nightAmount, setNightAmount] = useState('100');
  const [pending, setPending] = useState(false);

  const night = Number(nightAmount);
  const chips = useMemo(
    () => (Number.isFinite(night) && night > 0 ? chipsFromNight(night) : 0),
    [night]
  );

  const onDeposit = async () => {
    if (!Number.isFinite(night) || night <= 0) {
      toast.error('Enter a positive NIGHT amount');
      return;
    }
    setPending(true);
    try {
      if (!isConnected) {
        if (walletStatus === 'not-found') {
          throw new Error('No Midnight wallet found.');
        }
        await connect();
      }
      if (!user) {
        await api.setNickname(`player_${Date.now().toString(36).slice(-6)}`);
        await refresh();
      }
      const result = await api.treasuryDeposit(night);
      await refresh();
      toast.success(
        `Deposited ${night} NIGHT → +${result.chipsAdded.toLocaleString()} chips`
      );
      onOpenChange(false);
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
            <span className='flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700'>
              <ArrowDownToLine className='h-4 w-4' />
            </span>
            Deposit NIGHT
          </DialogTitle>
          <DialogDescription className='text-neutral-600'>
            Lock NIGHT in the treasury. Your table stack is credited at{' '}
            <span className='font-medium text-neutral-900'>10 chips per NIGHT</span>
            . Poker stays off-chain.
          </DialogDescription>
        </DialogHeader>

        <div className='mt-2 space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='deposit-night'>Amount (NIGHT)</Label>
            <Input
              id='deposit-night'
              type='number'
              min={0}
              step='any'
              inputMode='decimal'
              className='rounded-full'
              value={nightAmount}
              onChange={(e) => setNightAmount(e.target.value)}
              placeholder='100'
            />
          </div>

          <div className='rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600'>
            <div className='flex justify-between'>
              <span>You deposit</span>
              <span className='font-medium text-neutral-950'>
                {Number.isFinite(night) && night > 0 ? night : '—'} NIGHT
              </span>
            </div>
            <div className='mt-2 flex justify-between'>
              <span>Table chips credited</span>
              <span className='font-medium text-neutral-950'>
                {chips > 0 ? chips.toLocaleString() : '—'}
              </span>
            </div>
            {user ? (
              <div className='mt-2 flex justify-between border-t border-neutral-200 pt-2'>
                <span>Current stack</span>
                <span className='font-medium text-neutral-950'>
                  {user.chips.toLocaleString()}
                </span>
              </div>
            ) : null}
          </div>

          <Button
            className='h-11 w-full rounded-full bg-neutral-950 text-white hover:bg-neutral-800'
            disabled={pending || isConnecting || chips <= 0}
            onClick={onDeposit}
          >
            {pending
              ? 'Depositing…'
              : isConnected
                ? 'Deposit'
                : 'Connect & deposit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
