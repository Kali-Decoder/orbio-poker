'use client';

import React, { useState } from 'react';

import { getCardBackImage, getPokerCardImage } from '~/lib/helpers';
import { cn } from '~/lib/utils';

interface SleekCardProps {
  cardId: number;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
  /** Optional seed for a stable face-down back; random per mount if omitted. */
  backSeed?: number;
}

const sizes = {
  sm: 'h-12 w-[2.15rem]',
  md: 'h-[4.6rem] w-[3.25rem]',
  lg: 'h-[5.5rem] w-[3.9rem]',
};

export const SleekCard = ({
  cardId,
  className,
  style,
  size = 'md',
  backSeed,
}: SleekCardProps) => {
  const [randomBack] = useState(() => getCardBackImage(backSeed));
  const faceDown = cardId < 0;
  const src = faceDown ? randomBack : getPokerCardImage(cardId);

  return (
    <img
      alt={faceDown ? 'card back' : 'card'}
      className={cn(
        sizes[size],
        'rounded-[0.3rem] border border-neutral-200/90 object-cover shadow-[0_4px_14px_rgba(0,0,0,0.06)]',
        className
      )}
      src={src}
      style={style}
    />
  );
};
