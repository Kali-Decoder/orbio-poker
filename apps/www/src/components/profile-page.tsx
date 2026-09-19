'use client';

import Link from 'next/link';

import React from 'react';

import { RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { shortAddress } from '~/lib/midnight/address';
import { formatNightFromStars } from '~/lib/midnight/balances';
import { errorHandler } from '~/lib/utils';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

export const ProfilePage = () => {
  const {
    ready,
    isConnected,
    isConnecting,
    address,
    walletName,
    networkId,
    walletStatus,
    balances,
    balancesLoading,
    connect,
    refreshBalances,
  } = useMidnightWallet();
  const { user, loading: sessionLoading } = useSession();

  const onConnect = async () => {
    try {
      if (walletStatus === 'not-found') {
        toast.error(
          'No Midnight wallet found. Install 1AM or Lace, then refresh.'
        );
        return;
      }
      await connect();
      toast.success('Midnight wallet connected');
    } catch (error) {
      toast.error(errorHandler(error));
    }
  };

  const onRefreshBalances = async () => {
    try {
      await refreshBalances();
      toast.success('Balances updated');
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

  if (!isConnected || !address) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-start gap-4 px-4 pb-16 pt-24'>
        <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
          Profile
        </p>
        <h1 className='font-poker text-4xl tracking-wide text-neutral-950 sm:text-5xl'>
          Connect a Midnight wallet to play
        </h1>
        <p className='text-neutral-600'>
          Poker runs off-chain for speed. Your Midnight wallet is your table
          identity.
        </p>
        <Button
          className='rounded-full bg-neutral-950 px-5 text-white'
          disabled={isConnecting}
          onClick={onConnect}
        >
          {isConnecting ? 'Connecting…' : 'Connect wallet'}
        </Button>
      </div>
    );
  }

  const unshielded = balances
    ? formatNightFromStars(balances.unshieldedStars)
    : '—';
  const shielded = balances
    ? formatNightFromStars(balances.shieldedStars)
    : '—';
  const dust = balances ? balances.dustBalance.toString() : '—';

  return (
    <div className='mx-auto max-w-3xl px-4 pb-20 pt-24'>
      <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
        Profile
      </p>
      <h1 className='mt-2 font-poker text-4xl tracking-wide text-neutral-950 sm:text-5xl'>
        Your table
      </h1>
      <p className='mt-2 max-w-xl text-neutral-600'>
        Human No-Limit Hold&apos;em — connect, create or join a lobby, and play.
      </p>

      <section className='mt-8 flex flex-wrap items-center gap-4 border-y border-neutral-200 py-5'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9BF0] text-lg font-semibold text-white'>
          {(user?.nickname ?? address).slice(0, 1).toUpperCase()}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-lg font-semibold text-neutral-950'>
            {user?.nickname ?? 'Player'}
          </p>
          <p className='flex items-center gap-1.5 truncate text-sm text-neutral-500'>
            <Wallet className='h-3.5 w-3.5 shrink-0' />
            {shortAddress(address)}
          </p>
          <p className='mt-1 text-xs text-neutral-400'>
            {walletName ?? 'Midnight wallet'} · {networkId}
          </p>
        </div>
        <div className='text-right text-sm text-neutral-500'>
          <p>
            Table stack{' '}
            <span className='font-medium text-neutral-900'>
              {(user?.chips ?? 0).toLocaleString()}
            </span>
          </p>
        </div>
      </section>

      <section className='mt-8'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-neutral-950'>
            Wallet balance
          </h2>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full'
            disabled={balancesLoading}
            onClick={onRefreshBalances}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${balancesLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <div className='rounded-2xl border border-neutral-200 bg-white px-4 py-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-400'>
              Unshielded NIGHT
            </p>
            <p className='mt-2 text-2xl font-semibold tracking-tight text-neutral-950'>
              {balancesLoading && !balances ? '…' : unshielded}
            </p>
          </div>
          <div className='rounded-2xl border border-neutral-200 bg-white px-4 py-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-400'>
              Shielded NIGHT
            </p>
            <p className='mt-2 text-2xl font-semibold tracking-tight text-neutral-950'>
              {balancesLoading && !balances ? '…' : shielded}
            </p>
          </div>
          <div className='rounded-2xl border border-neutral-200 bg-white px-4 py-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-neutral-400'>
              DUST
            </p>
            <p className='mt-2 text-2xl font-semibold tracking-tight text-neutral-950'>
              {balancesLoading && !balances ? '…' : dust}
            </p>
            {balances ? (
              <p className='mt-1 text-xs text-neutral-400'>
                Cap {balances.dustCap.toString()}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className='mt-10 flex flex-wrap gap-3'>
        <Button asChild className='rounded-full bg-neutral-950 text-white'>
          <Link href='/game'>Browse games</Link>
        </Button>
        <Button asChild variant='outline' className='rounded-full'>
          <Link href='/'>Home</Link>
        </Button>
      </section>
    </div>
  );
};
