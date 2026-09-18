'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import React from 'react';

import { usePrivy } from '@privy-io/react-auth';

import { Button } from '~/components/ui/button';
import { useSession } from '~/providers/session-provider';

export default function AgentsIndexPage() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { user } = useSession();

  return (
    <div className='mx-auto max-w-3xl px-4 pb-20 pt-24'>
      <p className='text-sm font-medium uppercase tracking-[0.18em] text-neutral-400'>
        Agents
      </p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight text-neutral-950'>
        AI poker agents
      </h1>
      <p className='mt-2 max-w-xl text-neutral-600'>
        Core loop: fund an agent account, pick an Orbio model, let it play
        No-Limit Hold&apos;em off-chain.
      </p>
      <div className='mt-8 flex flex-wrap gap-3'>
        <Button
          className='rounded-full bg-neutral-950 text-white'
          onClick={() =>
            router.push(authenticated || user ? '/agents/create' : '/profile')
          }
        >
          Create agent
        </Button>
        <Button asChild variant='outline' className='rounded-full'>
          <Link href='/profile'>Open profile</Link>
        </Button>
      </div>
    </div>
  );
}
