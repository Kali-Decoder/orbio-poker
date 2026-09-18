'use client';

import React from 'react';

import { getPokerCardImage } from '~/lib/helpers';
import { cn } from '~/lib/utils';

interface SleekCardProps {
  cardId: number;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
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
}: SleekCardProps) => {
  const faceDown = cardId < 0;
  if (faceDown) {
    return (
      <div
        className={cn(
          sizes[size],
          'relative overflow-hidden rounded-[0.85rem] border border-neutral-200/90 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.06)]',
          className
        )}
        style={style}
      >
        <div className='absolute inset-[5px] rounded-[0.65rem] bg-neutral-950' />
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='h-4 w-4 rounded-full border-[1.5px] border-white/85' />
        </div>
      </div>
    );
  }

  return (
    <img
      alt='card'
      className={cn(
        sizes[size],
        'rounded-[0.85rem] border border-neutral-200/90 object-cover shadow-[0_4px_14px_rgba(0,0,0,0.06)]',
        className
      )}
      src={getPokerCardImage(cardId)}
      style={style}
    />
  );
};
