/** Off-chain chip credit rate: 1 NIGHT → 10 chips. */
export const CHIPS_PER_NIGHT = 10;

export function chipsFromNight(night: number): number {
  return Math.floor(night * CHIPS_PER_NIGHT);
}

export function nightFromChips(chips: number): number {
  return chips / CHIPS_PER_NIGHT;
}

/** 5% fee retained in treasury; user receives net. */
export function quoteWithdrawNight(nightAmount: number) {
  const feeNight = Math.floor(nightAmount * 0.05 * 1_000_000) / 1_000_000;
  const netNight = Math.round((nightAmount - feeNight) * 1_000_000) / 1_000_000;
  return {
    grossNight: nightAmount,
    feeNight,
    netNight,
  };
}
