import Link from 'next/link';

import React from 'react';

import { CreateGame } from '../create-game';
import { ConnectButton } from './connect-button';

export const Navbar = () => {
  return (
    <div className='absolute top-0 z-40 h-16 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur'>
      <div className='mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8'>
        <Link
          className='shrink-0 text-base font-semibold tracking-tight text-neutral-900 sm:text-lg'
          href='/'
        >
          Texas Hold&lsquo;em
        </Link>
        <div className='flex min-w-0 flex-row items-center gap-2 text-sm font-medium text-neutral-700 sm:gap-4'>
          <Link
            className='hidden hover:text-neutral-950 sm:inline'
            href='/game'
          >
            Games
          </Link>
          <Link
            className='hidden hover:text-neutral-950 sm:inline'
            href='/leaderboard'
          >
            Leaderboard
          </Link>
          <Link
            className='hidden hover:text-neutral-950 sm:inline'
            href='/profile'
          >
            Profile
          </Link>
          <CreateGame />
          <ConnectButton />
        </div>
      </div>
    </div>
  );
};
