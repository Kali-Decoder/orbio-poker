'use client';

import Link from 'next/link';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { cn, errorHandler } from '~/lib/utils';
import { useSession } from '~/providers/session-provider';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function nicknameFromAddress(address: string) {
  return `0x${address.slice(2, 8)}`;
}

export const ConnectButton = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { user: sessionUser, setNickname } = useSession();
  const [pending, setPending] = useState(false);
  const syncedWallet = useRef<string | null>(null);

  const walletAddress = useMemo(() => {
    return wallets[0]?.address ?? user?.wallet?.address ?? null;
  }, [wallets, user]);

  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    if (sessionUser?.nickname) return;
    if (syncedWallet.current === walletAddress) return;
    syncedWallet.current = walletAddress;

    void (async () => {
      try {
        await setNickname(nicknameFromAddress(walletAddress));
      } catch (error) {
        syncedWallet.current = null;
        console.warn(errorHandler(error));
      }
    })();
  }, [authenticated, walletAddress, sessionUser?.nickname, setNickname]);

  const onConnect = () => {
    setPending(true);
    try {
      login();
    } catch (error) {
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
      await logout();
      syncedWallet.current = null;
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

  if (authenticated && walletAddress) {
    return (
      <div className='flex max-w-[50vw] items-center gap-1 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-1 sm:max-w-none sm:pr-1.5'>
        <Link
          href='/profile'
          className='flex min-w-0 items-center gap-1 rounded-full pr-1'
        >
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D9BF0] text-xs font-semibold text-white'>
            {walletAddress.slice(2, 3).toUpperCase()}
          </div>
          <div className='min-w-0 px-1'>
            <p className='truncate text-sm font-medium text-neutral-900'>
              {shortAddress(walletAddress)}
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
      disabled={pending}
      onClick={onConnect}
    >
      {pending ? 'Connecting…' : 'Connect wallet'}
    </Button>
  );
};
