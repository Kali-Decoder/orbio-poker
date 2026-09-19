/** 1 NIGHT = 1_000_000 Stars (ledger base units). */
export const STARS_PER_NIGHT = 1_000_000n;

/** Withdrawal fee (500 bps = 5%), retained in treasury. */
export const WITHDRAW_FEE_BPS = 500n;
export const BPS_DENOMINATOR = 10_000n;

/**
 * Off-chain chips credited per 1 NIGHT deposited.
 * Example: deposit 100 NIGHT → 1_000 chips.
 */
export const CHIPS_PER_NIGHT = 10n;

export type PoolMarketPreset = {
  id: string;
  label: string;
  /** Suggested deposit in whole NIGHT (UX presets — on-chain amount is free). */
  entryNight: bigint;
  chipMultiplier: bigint;
};

/** Suggested buy-in sizes for the UI (treasury accepts any amount). */
export const POOL_MARKET_PRESETS: PoolMarketPreset[] = [
  {
    id: 'micro',
    label: 'Micro (10 NIGHT → 100 chips)',
    entryNight: 10n,
    chipMultiplier: CHIPS_PER_NIGHT,
  },
  {
    id: 'low',
    label: 'Low (100 NIGHT → 1,000 chips)',
    entryNight: 100n,
    chipMultiplier: CHIPS_PER_NIGHT,
  },
  {
    id: 'mid',
    label: 'Mid (500 NIGHT → 5,000 chips)',
    entryNight: 500n,
    chipMultiplier: CHIPS_PER_NIGHT,
  },
  {
    id: 'high',
    label: 'High (1,000 NIGHT → 10,000 chips)',
    entryNight: 1000n,
    chipMultiplier: CHIPS_PER_NIGHT,
  },
];

export function nightToStars(night: bigint): bigint {
  return night * STARS_PER_NIGHT;
}

export function starsToNight(stars: bigint): bigint {
  return stars / STARS_PER_NIGHT;
}

/** Off-chain chip credit after a confirmed on-chain deposit. */
export function chipsFromDeposit(
  entryNight: bigint,
  chipMultiplier: bigint = CHIPS_PER_NIGHT
): bigint {
  return entryNight * chipMultiplier;
}

export function chipsFromStars(
  entryStars: bigint,
  chipMultiplier: bigint = CHIPS_PER_NIGHT
): bigint {
  return starsToNight(entryStars) * chipMultiplier;
}

/** Convert chip stack back to NIGHT Stars for withdrawal gross amount. */
export function starsFromChips(
  chips: bigint,
  chipMultiplier: bigint = CHIPS_PER_NIGHT
): bigint {
  if (chipMultiplier <= 0n) throw new Error('chipMultiplier must be positive');
  return (chips / chipMultiplier) * STARS_PER_NIGHT;
}

/**
 * quoteWithdraw — fee retained in treasury, user receives net.
 * Same math as Solidity NLITreasury.quoteWithdraw.
 */
export function quoteWithdraw(
  amountStars: bigint,
  feeBps: bigint = WITHDRAW_FEE_BPS
): { feeAmount: bigint; netAmount: bigint; grossAmount: bigint } {
  if (amountStars < 0n) throw new Error('amount must be non-negative');
  const feeAmount = (amountStars * feeBps) / BPS_DENOMINATOR;
  return {
    grossAmount: amountStars,
    feeAmount,
    netAmount: amountStars - feeAmount,
  };
}

/** @deprecated use quoteWithdraw */
export function splitClaim(
  amountStars: bigint,
  feeBps: bigint = WITHDRAW_FEE_BPS
): { toPlayer: bigint; toTreasury: bigint } {
  const q = quoteWithdraw(amountStars, feeBps);
  return { toPlayer: q.netAmount, toTreasury: q.feeAmount };
}

/** Alias matching docs. */
export const TREASURY_FEE_BPS = WITHDRAW_FEE_BPS;
