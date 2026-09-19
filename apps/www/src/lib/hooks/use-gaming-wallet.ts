'use client';

import { useCallback, useMemo, useState } from 'react';

import { api, type SessionUser } from '~/lib/api';
import {
  CHIPS_PER_NIGHT,
  chipsFromNight,
  nightFromChips,
  quoteWithdrawNight,
} from '~/lib/treasury';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

/**
 * Off-chain gaming wallet (MongoDB session chips).
 * Play poker with `chips`; deposit/withdraw sync via treasury APIs.
 */
export function useGamingWallet() {
  const { user, loading, refresh, setNickname } = useSession();
  const {
    isConnected,
    isConnecting,
    connect,
    walletStatus,
    address,
  } = useMidnightWallet();

  const chips = user?.chips ?? 0;
  const nightBalance = useMemo(() => nightFromChips(chips), [chips]);

  const ensureSession = useCallback(async (): Promise<SessionUser> => {
    if (user) return user;

    if (!isConnected) {
      if (walletStatus === 'not-found') {
        throw new Error(
          'No Midnight wallet found. Install 1AM or Lace, then refresh.'
        );
      }
      await connect();
    }

    const nickname =
      address && address.length > 8
        ? `mn_${address.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`
        : `player_${Date.now().toString(36).slice(-6)}`;

    await setNickname(nickname);
    await refresh();
    const me = await api.me();
    return me;
  }, [
    user,
    isConnected,
    walletStatus,
    connect,
    address,
    setNickname,
    refresh,
  ]);

  return {
    user,
    loading,
    chips,
    nightBalance,
    chipsPerNight: CHIPS_PER_NIGHT,
    isConnected,
    isConnecting,
    walletStatus,
    address,
    refresh,
    ensureSession,
    connect,
    chipsFromNight,
    nightFromChips,
  };
}

export type DepositResult = Awaited<ReturnType<typeof api.treasuryDeposit>>;

/** Credit MongoDB chips after (or alongside) on-chain deposit. */
export function useDeposit() {
  const gaming = useGamingWallet();
  const { ensureSession, refresh } = gaming;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useCallback((nightAmount: number) => {
    if (!Number.isFinite(nightAmount) || nightAmount <= 0) {
      return { chipsAdded: 0, nightAmount: 0 };
    }
    return {
      nightAmount,
      chipsAdded: chipsFromNight(nightAmount),
    };
  }, []);

  const deposit = useCallback(
    async (nightAmount: number): Promise<DepositResult> => {
      if (!Number.isFinite(nightAmount) || nightAmount <= 0) {
        throw new Error('Enter a positive NIGHT amount');
      }
      setPending(true);
      setError(null);
      try {
        await ensureSession();
        // TODO: call Compact deposit() with connected wallet, then credit DB
        const result = await api.treasuryDeposit(nightAmount);
        await refresh();
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Deposit failed';
        setError(message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [ensureSession, refresh]
  );

  return {
    user: gaming.user,
    loading: gaming.loading,
    chips: gaming.chips,
    nightBalance: gaming.nightBalance,
    chipsPerNight: gaming.chipsPerNight,
    isConnected: gaming.isConnected,
    isConnecting: gaming.isConnecting,
    walletStatus: gaming.walletStatus,
    address: gaming.address,
    refresh: gaming.refresh,
    ensureSession: gaming.ensureSession,
    connect: gaming.connect,
    chipsFromNight: gaming.chipsFromNight,
    nightFromChips: gaming.nightFromChips,
    pending,
    error,
    preview,
    deposit,
  };
}

export type WithdrawResult = Awaited<ReturnType<typeof api.treasuryWithdraw>>;

/** Debit MongoDB chips and settle NIGHT on-chain (operator withdraw). */
export function useWithdraw() {
  const gaming = useGamingWallet();
  const { ensureSession, refresh, chips } = gaming;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useCallback(
    (nightAmount: number) => {
      if (!Number.isFinite(nightAmount) || nightAmount <= 0) {
        return null;
      }
      const quote = quoteWithdrawNight(nightAmount);
      const chipsRequired = chipsFromNight(nightAmount);
      return {
        ...quote,
        chipsRequired,
        canAfford: chipsRequired <= chips,
      };
    },
    [chips]
  );

  const withdraw = useCallback(
    async (nightAmount: number): Promise<WithdrawResult> => {
      if (!Number.isFinite(nightAmount) || nightAmount <= 0) {
        throw new Error('Enter a positive NIGHT amount');
      }
      const chipsRequired = chipsFromNight(nightAmount);
      if (chipsRequired > chips) {
        throw new Error(
          `Insufficient chips. Need ${chipsRequired}, have ${chips}.`
        );
      }
      setPending(true);
      setError(null);
      try {
        await ensureSession();
        // TODO: backend operator calls Compact withdraw(), then debit DB
        const result = await api.treasuryWithdraw(nightAmount);
        await refresh();
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Withdraw failed';
        setError(message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [ensureSession, refresh, chips]
  );

  return {
    user: gaming.user,
    loading: gaming.loading,
    chips: gaming.chips,
    nightBalance: gaming.nightBalance,
    chipsPerNight: gaming.chipsPerNight,
    isConnected: gaming.isConnected,
    isConnecting: gaming.isConnecting,
    walletStatus: gaming.walletStatus,
    address: gaming.address,
    refresh: gaming.refresh,
    ensureSession: gaming.ensureSession,
    connect: gaming.connect,
    chipsFromNight: gaming.chipsFromNight,
    nightFromChips: gaming.nightFromChips,
    pending,
    error,
    preview,
    withdraw,
  };
}
