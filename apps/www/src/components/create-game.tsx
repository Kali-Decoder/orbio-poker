'use client';

import { useRouter } from 'next/navigation';

import React, { useState } from 'react';

import { api } from '~/lib/api';
import { errorHandler } from '~/lib/utils';
import { useMidnightWallet } from '~/providers/midnight-wallet-provider';
import { useSession } from '~/providers/session-provider';

import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';

import { Button } from './ui/button';
import { Input } from './ui/input';

export const CreateGame = () => {
  const { user } = useSession();
  const { isConnected } = useMidnightWallet();
  const router = useRouter();
  const [gameId, setGameId] = useState<string>('');

  const requirePlayer = () => {
    if (!isConnected) throw new Error('Connect your Midnight wallet first.');
    if (!user) throw new Error('Wallet session not ready — try reconnecting.');
  };

  const onCreate = async () => {
    const id = toast.loading('Creating game…');
    try {
      requirePlayer();
      const game = await api.createGame();
      toast.success('Game created', { description: game.gameId, id });
      router.push(`/game/${game.gameId}`);
    } catch (error) {
      toast.error(errorHandler(error), { id });
    }
  };

  const onJoin = async () => {
    const id = toast.loading('Joining…');
    try {
      requirePlayer();
      if (!gameId.trim()) throw new Error('Enter a game ID.');
      const game = await api.joinGame(gameId.trim());
      toast.success('Joined', { id });
      router.push(`/game/${game.gameId}`);
    } catch (error) {
      toast.error(errorHandler(error), { id });
    }
  };

  return (
    <Dialog>
      <DialogTrigger className='whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 sm:px-3 sm:text-sm'>
        Create / Join
      </DialogTrigger>
      <DialogContent className='max-w-md rounded-3xl border-neutral-200 bg-white p-6'>
        <DialogTitle className='font-poker text-2xl tracking-wide text-neutral-900'>
          Create or join
        </DialogTitle>
        <div className='mt-4 flex flex-col gap-3'>
          <Button
            className='h-11 rounded-full bg-neutral-950 text-white'
            onClick={onCreate}
          >
            Create game
          </Button>
          <div className='text-center text-xs text-neutral-400'>or</div>
          <div className='flex gap-2'>
            <Input
              className='rounded-full border-neutral-200'
              placeholder='Game ID'
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <Button className='rounded-full' variant='outline' onClick={onJoin}>
              Join
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
