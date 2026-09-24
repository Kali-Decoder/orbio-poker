'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import { env } from '~/env';
import { selectWallet, waitForWallet } from '~/lib/midnight/select-wallet';
import { sumBalances } from '~/lib/midnight/balances';

export type MidnightNetworkId =
  | 'undeployed'
  | 'preview'
  | 'preprod'
  | 'mainnet';

export type WalletBalances = {
  unshieldedStars: bigint;
  shieldedStars: bigint;
  dustBalance: bigint;
  dustCap: bigint;
};

type WalletStatus = 'checking' | 'detected' | 'not-found';

type MidnightWalletContextValue = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  ready: boolean;
  walletStatus: WalletStatus;
  walletName: string | null;
  networkId: MidnightNetworkId;
  api: ConnectedAPI | null;
  balances: WalletBalances | null;
  balancesLoading: boolean;
  connect: (network?: MidnightNetworkId) => Promise<string | null>;
  disconnect: () => void;
  refreshBalances: () => Promise<WalletBalances | null>;
};

const MidnightWalletContext =
  createContext<MidnightWalletContextValue | null>(null);

const DEFAULT_NETWORK =
  (env.NEXT_PUBLIC_MIDNIGHT_NETWORK as MidnightNetworkId) ?? 'preview';

const EMPTY_BALANCES: WalletBalances = {
  unshieldedStars: 0n,
  shieldedStars: 0n,
  dustBalance: 0n,
  dustCap: 0n,
};

async function readBalances(api: ConnectedAPI): Promise<WalletBalances> {
  const [unshielded, shielded, dust] = await Promise.all([
    api.getUnshieldedBalances(),
    api.getShieldedBalances(),
    api.getDustBalance(),
  ]);
  return {
    unshieldedStars: sumBalances(unshielded),
    shieldedStars: sumBalances(shielded),
    dustBalance: dust.balance,
    dustCap: dust.cap,
  };
}

export function MidnightWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [walletName, setWalletName] = useState<string | null>(null);
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [networkId, setNetworkId] =
    useState<MidnightNetworkId>(DEFAULT_NETWORK);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const connectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const wallet = await waitForWallet();
      if (cancelled) return;
      if (wallet) {
        setWalletStatus('detected');
        setWalletName(wallet.name ?? 'Midnight wallet');
      } else {
        setWalletStatus('not-found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!api) {
      setBalances(null);
      return null;
    }
    setBalancesLoading(true);
    try {
      const next = await readBalances(api);
      setBalances(next);
      return next;
    } catch (error) {
      console.warn('Failed to load wallet balances', error);
      setBalances(EMPTY_BALANCES);
      return EMPTY_BALANCES;
    } finally {
      setBalancesLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!api || !isConnected) {
      setBalances(null);
      return;
    }
    void refreshBalances();
  }, [api, isConnected, refreshBalances]);

  const connect = useCallback(async (network: MidnightNetworkId = DEFAULT_NETWORK) => {
    if (connectingRef.current) return null;
    connectingRef.current = true;
    setIsConnecting(true);
    try {
      const wallet = selectWallet();
      setWalletName(wallet.name ?? 'Midnight wallet');
      setWalletStatus('detected');

      const connectedApi = await wallet.connect(network);
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      const status = await connectedApi.getConnectionStatus();

      if (status.status !== 'connected') {
        throw new Error('Wallet connection was not authorized.');
      }

      setApi(connectedApi);
      setAddress(unshieldedAddress);
      setIsConnected(true);
      setNetworkId(network);

      try {
        setBalancesLoading(true);
        setBalances(await readBalances(connectedApi));
      } catch (error) {
        console.warn('Failed to load wallet balances', error);
        setBalances(EMPTY_BALANCES);
      } finally {
        setBalancesLoading(false);
      }

      return unshieldedAddress;
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setApi(null);
    setBalances(null);
  }, []);

  const value = useMemo(
    () => ({
      address,
      isConnected,
      isConnecting,
      ready: walletStatus !== 'checking',
      walletStatus,
      walletName,
      networkId,
      api,
      balances,
      balancesLoading,
      connect,
      disconnect,
      refreshBalances,
    }),
    [
      address,
      isConnected,
      isConnecting,
      walletStatus,
      walletName,
      networkId,
      api,
      balances,
      balancesLoading,
      connect,
      disconnect,
      refreshBalances,
    ]
  );

  return (
    <MidnightWalletContext.Provider value={value}>
      {children}
    </MidnightWalletContext.Provider>
  );
}

export function useMidnightWallet(): MidnightWalletContextValue {
  const ctx = useContext(MidnightWalletContext);
  if (!ctx) {
    throw new Error('useMidnightWallet must be used within MidnightWalletProvider');
  }
  return ctx;
}
