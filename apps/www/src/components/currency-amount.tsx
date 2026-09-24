'use client';

import React from 'react';

import { formatTokens } from '~/lib/format';
import { cn } from '~/lib/utils';

export const CHIP_ICON = '/icons/poker-chip.png';
export const NIGHT_ICON = '/cards/BACK-WHITE.png';

type Size = 'sm' | 'md' | 'lg';

const AVATAR_SIZE: Record<Size, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9 sm:h-10 sm:w-10',
};

const TEXT_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl sm:text-2xl',
};

type AmountProps = {
  value: number | string;
  size?: Size;
  className?: string;
  iconClassName?: string;
  /** When value is already formatted, skip formatTokens. */
  raw?: boolean;
};

function CurrencyAvatar({
  src,
  size,
  className,
}: {
  src: string;
  size: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full bg-neutral-950 ring-1 ring-black/10',
        AVATAR_SIZE[size],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=''
        className='h-full w-full object-cover'
        draggable={false}
      />
    </span>
  );
}

function displayValue(value: number | string, raw?: boolean) {
  if (raw || typeof value === 'string') return String(value);
  return formatTokens(value);
}

export function ChipAmount({
  value,
  size = 'md',
  className,
  iconClassName,
  raw,
}: AmountProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2 font-semibold tabular-nums text-neutral-950',
        TEXT_SIZE[size],
        className
      )}
    >
      <CurrencyAvatar
        src={CHIP_ICON}
        size={size}
        className={iconClassName}
      />
      <span className='truncate'>{displayValue(value, raw)}</span>
    </span>
  );
}

export function NightAmount({
  value,
  size = 'md',
  className,
  iconClassName,
  raw,
}: AmountProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2 font-semibold tabular-nums text-neutral-950',
        TEXT_SIZE[size],
        className
      )}
    >
      <CurrencyAvatar
        src={NIGHT_ICON}
        size={size}
        className={iconClassName}
      />
      <span className='truncate'>{displayValue(value, raw)}</span>
    </span>
  );
}
