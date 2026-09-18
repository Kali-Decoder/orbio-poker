/** 1 NIGHT = 1_000_000 Stars (ledger base units). */
export const STARS_PER_NIGHT = 1_000_000n;

/** Claim fee taken for treasury (500 bps = 5%). */
export const TREASURY_FEE_BPS = 500n;
export const BPS_DENOMINATOR = 10_000n;

export type PoolMarketPreset = {
  id: string;
  label: string;
  /** Entry buy-in in whole NIGHT (not Stars). */
  entryNight: bigint;
  /** Chips credited off-chain per 1 NIGHT deposited. */
  chipMultiplier: bigint;
};

/** Example markets — deploy one Compact contract per preset. */
export const POOL_MARKET_PRESETS: PoolMarketPreset[] = [
  {
    id: 'micro',
    label: 'Micro (10 NIGHT → 100 chips)',
    entryNight: 10n,
    chipMultiplier: 10n,
  },
  {
    id: 'low',
    label: 'Low (100 NIGHT → 1,000 chips)',
    entryNight: 100n,
    chipMultiplier: 10n,
  },
  {
    id: 'mid',
    label: 'Mid (500 NIGHT → 5,000 chips)',
    entryNight: 500n,
    chipMultiplier: 10n,
  },
  {
    id: 'high',
    label: 'High (1,000 NIGHT → 10,000 chips)',
    entryNight: 1000n,
    chipMultiplier: 10n,
  },
];

export function nightToStars(night: bigint): bigint {
  return night * STARS_PER_NIGHT;
}

export function starsToNight(stars: bigint): bigint {
  return stars / STARS_PER_NIGHT;
}

/** Off-chain chip credit after a successful on-chain deposit. */
export function chipsFromDeposit(entryNight: bigint, chipMultiplier: bigint): bigint {
  return entryNight * chipMultiplier;
}

export function chipsFromStars(entryStars: bigint, chipMultiplier: bigint): bigint {
  return starsToNight(entryStars) * chipMultiplier;
}

/** Convert final chip stack back to NIGHT Stars for house settle/claim. */
export function starsFromChips(chips: bigint, chipMultiplier: bigint): bigint {
  if (chipMultiplier <= 0n) throw new Error('chipMultiplier must be positive');
  return (chips / chipMultiplier) * STARS_PER_NIGHT;
}

/** Split a claim: 5% treasury, 95% player (floor fee via integer bps). */
export function splitClaim(
  amountStars: bigint,
  feeBps: bigint = TREASURY_FEE_BPS
): { toPlayer: bigint; toTreasury: bigint } {
  if (amountStars < 0n) throw new Error('amount must be non-negative');
  const toTreasury = (amountStars * feeBps) / BPS_DENOMINATOR;
  return {
    toTreasury,
    toPlayer: amountStars - toTreasury,
  };
}
