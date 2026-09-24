'use client';

import React, { useEffect, useState } from 'react';

import { api, type PublicGameView } from '~/lib/api';
import { useSocket } from '~/providers/socket-provider';
import { truncate } from '~/lib/utils';

import { toast } from 'sonner';

import { GameOverlay } from '~/components/overlays';

import { ChooseCards } from './_components/choose-cards';
import { DeclareResult } from './_components/declare-result';
import { Results } from './_components/results';
import { SleekTable } from './_components/sleek-table';

const GamePage = ({ params }: { params: { id: string } }) => {
  const gameId = params.id;
  const { socket } = useSocket();
  const [view, setView] = useState<PublicGameView | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        let next = await api.getGame(gameId);
        const seated =
          next.myPlayerId != null &&
          next.players.some((p) => p.id === next.myPlayerId);
        if (next.status === 'waiting' && next.myPlayerId && !seated) {
          next = await api.joinGame(gameId);
        }
        setView(next);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [gameId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('game:joinRoom', { gameId });
    const onState = (next: PublicGameView) => setView(next);
    const onError = (payload: { error: string }) => {
      toast.error(payload.error);
    };
    socket.on('game:state', onState);
    socket.on('game:error', onError);
    return () => {
      socket.off('game:state', onState);
      socket.off('game:error', onError);
    };
  }, [socket, gameId]);

  if (!view) {
    return (
      <div className='flex h-screen items-center justify-center bg-[#FAFAFA] text-neutral-500'>
        Loading table…
      </div>
    );
  }

  return (
    <div className='relative'>
      <GameOverlay gameId={gameId} view={view} />
      <SleekTable gameId={gameId} view={view} />

      {view.roundLabel === 'End' && !view.gameEnded ? (
        <>
          <ChooseCards cards={view.communityCards} gameId={gameId} />
          <DeclareResult gameId={gameId} />
        </>
      ) : null}
      {view.gameEnded ? <Results view={view} /> : null}

      <div className='pointer-events-none absolute left-4 top-20 z-30 text-xs text-neutral-400'>
        {truncate(gameId, 18)}
      </div>
    </div>
  );
};

export default GamePage;
