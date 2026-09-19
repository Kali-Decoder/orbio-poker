'use client';

import Link from 'next/link';

import React, { useEffect, useRef, useState } from 'react';

import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import {
  nicknameFromAddress,
  shortAddress,
} from '~/lib/midnight/address';
import { cn, errorHandler } from '~/lib/utils';
import { playSound } from '~/lib/sounds';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

export const ConnectButton = () => {
  const {
    ready,
    isConnected,
    isConnecting,
    address,
    walletStatus,
    connect,
    disconnect,
  } = useMidnightWallet();
  const { user: sessionUser, setNickname } = useSession();
  const [pending, setPending] = useState(false);
  const syncedWallet = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (sessionUser?.nickname) return;
    if (syncedWallet.current === address) return;
    syncedWallet.current = address;

    void (async () => {
      try {
        await setNickname(nicknameFromAddress(address));
      } catch (error) {
        syncedWallet.current = null;
        console.warn(errorHandler(error));
      }
    })();
  }, [isConnected, address, sessionUser?.nickname, setNickname]);

  const onConnect = async () => {
    setPending(true);
    try {
      if (walletStatus === 'not-found') {
        toast.error(
          'No Midnight wallet found. Install 1AM or Lace, then refresh.'
        );
        return;
      }
      await connect();
      playSound('gems');
      toast.success('Midnight wallet connected');
    } catch (error) {
      playSound('paajiLose');
      toast.error(errorHandler(error));
    } finally {
      setPending(false);
    }
  };

  const onDisconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    try {
      disconnect();
      syncedWallet.current = null;
      playSound('cashout');
      toast.success('Wallet disconnected');
    } catch (error) {
      toast.error(errorHandler(error));
    } finally {
      setPending(false);
    }
  };

  if (!ready) {
    return (
      <Button
        disabled
        className='rounded-full border border-neutral-200 bg-white px-4 text-neutral-400'
        variant='outline'
      >
        Loading…
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className='flex max-w-[50vw] items-center gap-1 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-1 sm:max-w-none sm:pr-1.5'>
        <Link
          href='/profile'
          className='flex min-w-0 items-center gap-1 rounded-full pr-1'
        >
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D9BF0] text-xs font-semibold text-white'>
            {address.slice(0, 1).toUpperCase()}
          </div>
          <div className='min-w-0 px-1'>
            <p className='truncate text-sm font-medium text-neutral-900'>
              {shortAddress(address)}
            </p>
          </div>
        </Link>
        <button
          type='button'
          aria-label='Disconnect wallet'
          disabled={pending}
          onClick={onDisconnect}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900',
            pending && 'opacity-50'
          )}
        >
          <LogOut className='h-3.5 w-3.5' />
        </button>
      </div>
    );
  }

  return (
    <Button
      className='rounded-full bg-neutral-950 px-4 text-white hover:bg-neutral-800'
      disabled={pending || isConnecting}
      onClick={onConnect}
    >
      {pending || isConnecting ? 'Connecting…' : 'Connect wallet'}
    </Button>
  );
};
