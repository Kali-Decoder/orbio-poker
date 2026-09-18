'use client';

import React, { useMemo } from 'react';

import type { PublicGameView } from '~/lib/api';

import { ShuffleOverlay } from './shuffle';
import { WaitingOverlay } from './waiting';

interface GameOverlayProps {
  gameId: string;
  view: PublicGameView;
}

export const GameOverlay = ({ gameId, view }: GameOverlayProps) => {
  const stage = useMemo(() => {
    if (!view.gameStarted || view.status === 'waiting') {
      return 'waiting' as const;
    }
    if (view.status === 'shuffling' || view.totalShuffles !== view.totalPlayers) {
      return 'shuffle' as const;
    }
    if (view.round !== 'End' && !view.gameEnded) {
      return 'started' as const;
    }
    if (!view.winnerId) {
      return 'choose-cards' as const;
    }
    return 'ended' as const;
  }, [view]);

  if (stage === 'waiting') {
    return <WaitingOverlay gameId={gameId} view={view} />;
  }
  if (stage === 'shuffle') {
    return <ShuffleOverlay gameId={gameId} view={view} />;
  }
  return null;
};
