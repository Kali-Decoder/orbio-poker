import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

import type { Ledger } from './managed/poker-pool/contract/index.js';

export type PokerPoolPrivateState = {
  houseSecretKey: Uint8Array;
};

export const witnesses = {
  houseKey: ({
    privateState,
  }: WitnessContext<Ledger, PokerPoolPrivateState>): [
    PokerPoolPrivateState,
    Uint8Array,
  ] => [privateState, privateState.houseSecretKey],
};

export function createHousePrivateState(
  houseSecretKey: Uint8Array
): PokerPoolPrivateState {
  if (houseSecretKey.length !== 32) {
    throw new Error('houseSecretKey must be 32 bytes');
  }
  return { houseSecretKey };
}
