'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SleekTable,
} from '~/app/game/[id]/_components/sleek-table';
import type { LocalTableAction } from '~/app/game/[id]/_components/action-bar';
import { Button } from '~/components/ui/button';
import type { PublicGameView } from '~/lib/api';
import { truncate } from '~/lib/utils';

const ME = 'player_you';
const OPP = 'player_opp';
const START_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

type Street = 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown';

type SeatState = {
  id: string;
  nickname: string;
  seat: number;
  stack: number;
  chipsInPot: number;
  folded: boolean;
  holeCards: number[];
  actedThisStreet: boolean;
};

type HandState = {
  street: Street;
  community: number[];
  pot: number;
  highestBet: number;
  nextId: string;
  deck: number[];
  winnerId: string | null;
  handOver: boolean;
  seats: [SeatState, SeatState];
};

function shuffleDeck(): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return deck;
}

function draw(deck: number[], n: number): { cards: number[]; deck: number[] } {
  return { cards: deck.slice(0, n), deck: deck.slice(n) };
}

function seatOf(state: HandState, id: string): SeatState {
  return state.seats.find((s) => s.id === id)!;
}

function otherId(id: string): string {
  return id === ME ? OPP : ME;
}

function patchSeat(
  state: HandState,
  id: string,
  patch: Partial<SeatState>
): HandState {
  return {
    ...state,
    seats: state.seats.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    ) as [SeatState, SeatState],
  };
}

function putChips(state: HandState, id: string, toAmount: number): HandState {
  const seat = seatOf(state, id);
  const target = Math.min(toAmount, seat.stack + seat.chipsInPot);
  const delta = Math.max(0, target - seat.chipsInPot);
  if (delta === 0 && toAmount === 0) {
    return patchSeat(state, id, { actedThisStreet: true });
  }
  return {
    ...patchSeat(state, id, {
      stack: seat.stack - delta,
      chipsInPot: seat.chipsInPot + delta,
      actedThisStreet: true,
    }),
    pot: state.pot + delta,
    highestBet: Math.max(state.highestBet, seat.chipsInPot + delta),
  };
}

function bothMatched(state: HandState): boolean {
  const [a, b] = state.seats;
  if (a.folded || b.folded) return true;
  const matched = a.chipsInPot === b.chipsInPot;
  const bothActed = a.actedThisStreet && b.actedThisStreet;
  const allIn = a.stack === 0 || b.stack === 0;
  return matched && (bothActed || allIn);
}

function resetStreetFlags(state: HandState): HandState {
  return {
    ...state,
    highestBet: 0,
    seats: state.seats.map((s) => ({
      ...s,
      chipsInPot: 0,
      actedThisStreet: false,
    })) as [SeatState, SeatState],
  };
}

function dealBoard(state: HandState, n: number): HandState {
  const { cards, deck } = draw(state.deck, n);
  return {
    ...state,
    deck,
    community: [...state.community, ...cards],
  };
}

function runOutBoard(state: HandState): HandState {
  let next = resetStreetFlags(state);
  while (next.community.length < 5) {
    const need = next.community.length === 0 ? 3 : 1;
    next = dealBoard(next, need);
  }
  return showdown({ ...next, street: 'River' });
}

function advanceStreet(state: HandState): HandState {
  if (state.handOver) return state;
  if (state.seats.some((s) => s.folded)) {
    const winner = state.seats.find((s) => !s.folded)!;
    return awardPot(state, winner.id);
  }
  if (!bothMatched(state)) return state;

  // All-in: deal remaining board and showdown
  if (state.seats.some((s) => s.stack === 0 && !s.folded)) {
    return runOutBoard(state);
  }

  let next = resetStreetFlags(state);
  if (next.street === 'Preflop') {
    return { ...dealBoard(next, 3), street: 'Flop', nextId: ME };
  }
  if (next.street === 'Flop') {
    return { ...dealBoard(next, 1), street: 'Turn', nextId: ME };
  }
  if (next.street === 'Turn') {
    return { ...dealBoard(next, 1), street: 'River', nextId: ME };
  }
  return showdown(next);
}

/** Dummy strength: high-card sum of hole + board (good enough for UI play). */
function handScore(seat: SeatState, community: number[]): number {
  const cards = [...seat.holeCards, ...community].filter((c) => c >= 0);
  return cards.reduce((sum, c) => sum + (c % 13), 0);
}

function showdown(state: HandState): HandState {
  const [a, b] = state.seats;
  if (a.folded) return awardPot(state, b.id);
  if (b.folded) return awardPot(state, a.id);
  const sa = handScore(a, state.community);
  const sb = handScore(b, state.community);
  if (sa === sb) {
    // Split
    const half = Math.floor(state.pot / 2);
    return {
      ...state,
      street: 'Showdown',
      handOver: true,
      winnerId: null,
      pot: 0,
      seats: [
        { ...a, stack: a.stack + half, holeCards: a.holeCards },
        { ...b, stack: b.stack + (state.pot - half), holeCards: b.holeCards },
      ],
    };
  }
  return awardPot(
    { ...state, street: 'Showdown' },
    sa > sb ? a.id : b.id
  );
}

function awardPot(state: HandState, winnerId: string): HandState {
  return {
    ...state,
    handOver: true,
    winnerId,
    pot: 0,
    seats: state.seats.map((s) =>
      s.id === winnerId ? { ...s, stack: s.stack + state.pot } : s
    ) as [SeatState, SeatState],
  };
}

function applyAction(
  state: HandState,
  actorId: string,
  action: LocalTableAction
): HandState {
  if (state.handOver || state.nextId !== actorId) return state;
  let next = state;

  if (action.type === 'fold') {
    next = patchSeat(next, actorId, { folded: true, actedThisStreet: true });
    next = awardPot(next, otherId(actorId));
    return next;
  }

  // Check — already matched the street bet
  if (action.amount === 0) {
    const seat = seatOf(next, actorId);
    if (seat.chipsInPot < next.highestBet) return state;
    next = patchSeat(next, actorId, { actedThisStreet: true });
  } else {
    next = putChips(next, actorId, action.amount);
  }

  next = { ...next, nextId: otherId(actorId) };

  if (bothMatched(next)) {
    next = advanceStreet(next);
  }
  return next;
}

function newHand(prevStacks?: { you: number; opp: number }): HandState {
  let deck = shuffleDeck();
  const youDraw = draw(deck, 2);
  deck = youDraw.deck;
  const oppDraw = draw(deck, 2);
  deck = oppDraw.deck;

  const youStack = prevStacks?.you ?? START_STACK;
  const oppStack = prevStacks?.opp ?? START_STACK;

  let state: HandState = {
    street: 'Preflop',
    community: [],
    pot: 0,
    highestBet: 0,
    nextId: ME,
    deck,
    winnerId: null,
    handOver: false,
    seats: [
      {
        id: ME,
        nickname: 'You',
        seat: 0,
        stack: youStack,
        chipsInPot: 0,
        folded: false,
        holeCards: youDraw.cards,
        actedThisStreet: false,
      },
      {
        id: OPP,
        nickname: 'Opponent',
        seat: 1,
        stack: oppStack,
        chipsInPot: 0,
        folded: false,
        holeCards: oppDraw.cards,
        actedThisStreet: false,
      },
    ],
  };

  // Post blinds
  state = putChips(state, ME, SMALL_BLIND);
  state = putChips(state, OPP, BIG_BLIND);
  state = {
    ...state,
    seats: state.seats.map((s) => ({
      ...s,
      actedThisStreet: false,
    })) as [SeatState, SeatState],
    nextId: ME,
  };
  return state;
}

function toView(state: HandState): PublicGameView {
  const me = seatOf(state, ME);
  const showOppCards = state.handOver && !me.folded;
  return {
    gameId: 'game_dummy_play',
    name: 'Dummy Practice Table',
    joinCode: 'DUMMY',
    minChips: 0,
    maxPlayers: 2,
    status: state.handOver ? 'finished' : 'playing',
    round: state.street,
    roundLabel: state.handOver
      ? 'Showdown'
      : state.street === 'Preflop'
        ? 'Pre-Flop'
        : state.street,
    players: state.seats.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      seat: s.seat,
      chipsInPot: s.chipsInPot,
      folded: s.folded,
      shuffled: true,
      holeCards:
        s.id === ME
          ? s.holeCards
          : showOppCards
            ? s.holeCards
            : s.holeCards.map(() => -1),
      chosenCommunity: [],
      weight: 0,
    })),
    communityCards: [
      ...state.community,
      ...Array.from({ length: Math.max(0, 5 - state.community.length) }, () => -1),
    ],
    pot: state.pot,
    highestBet: state.highestBet,
    nextSeat: seatOf(state, state.nextId).seat,
    nextPlayerId: state.handOver ? null : state.nextId,
    nextPlayerNickname: state.handOver
      ? null
      : seatOf(state, state.nextId).nickname,
    winnerId: state.winnerId,
    winnerNickname: state.winnerId
      ? seatOf(state, state.winnerId).nickname
      : state.handOver && !state.winnerId
        ? 'Split'
        : null,
    totalPlayers: 2,
    totalShuffles: 2,
    gameStarted: true,
    gameEnded: state.handOver,
    myPlayerId: ME,
    isMyTurn: !state.handOver && state.nextId === ME,
  };
}

function pickOppAction(state: HandState): LocalTableAction {
  const opp = seatOf(state, OPP);
  const toCall = Math.max(0, state.highestBet - opp.chipsInPot);
  const roll = Math.random();

  if (toCall === 0) {
    if (roll < 0.65) return { type: 'bet', amount: 0 };
    const bet = Math.min(
      opp.stack + opp.chipsInPot,
      Math.max(BIG_BLIND, Math.round((opp.stack + opp.chipsInPot) * 0.35))
    );
    return { type: 'bet', amount: bet };
  }

  if (roll < 0.22) return { type: 'fold' };
  if (roll < 0.8 || opp.stack <= toCall) {
    return { type: 'bet', amount: state.highestBet };
  }
  const raiseTo = Math.min(
    opp.stack + opp.chipsInPot,
    state.highestBet + Math.max(BIG_BLIND, Math.round(state.pot * 0.6))
  );
  return { type: 'bet', amount: Math.max(raiseTo, state.highestBet + 1) };
}

/** Full-screen playable dummy table — you vs auto-opponent, no wallet. */
export default function DummyTablePage() {
  const [hand, setHand] = useState<HandState>(() => newHand());
  const handRef = useRef(hand);
  handRef.current = hand;

  const view = useMemo(() => toView(hand), [hand]);
  const stacksByPlayerId = useMemo(
    () => ({
      [ME]: seatOf(hand, ME).stack,
      [OPP]: seatOf(hand, OPP).stack,
    }),
    [hand]
  );

  const onLocalAction = useCallback((action: LocalTableAction) => {
    setHand((prev) => applyAction(prev, ME, action));
  }, []);

  // Opponent auto-play
  useEffect(() => {
    if (hand.handOver || hand.nextId !== OPP) return;
    const t = window.setTimeout(() => {
      const current = handRef.current;
      if (current.handOver || current.nextId !== OPP) return;
      const action = pickOppAction(current);
      setHand(applyAction(current, OPP, action));
    }, 700 + Math.random() * 500);
    return () => window.clearTimeout(t);
  }, [hand.handOver, hand.nextId, hand.highestBet, hand.street, hand.pot]);

  const dealNext = () => {
    const you = seatOf(hand, ME).stack;
    const opp = seatOf(hand, OPP).stack;
    if (you <= 0 || opp <= 0) {
      setHand(newHand());
      return;
    }
    setHand(newHand({ you, opp }));
  };

  return (
    <div className='relative'>
      <SleekTable
        gameId={view.gameId}
        view={view}
        stacksByPlayerId={stacksByPlayerId}
        onLocalAction={onLocalAction}
      />

      <div className='pointer-events-none absolute left-4 top-20 z-30 max-w-[70vw] text-xs text-neutral-500'>
        <p className='truncate font-medium text-neutral-700'>{view.name}</p>
        <p className='mt-0.5 font-mono'>
          {view.joinCode} · {truncate(view.gameId, 14)} · blinds {SMALL_BLIND}/
          {BIG_BLIND}
        </p>
      </div>

      <div className='absolute right-4 top-20 z-30 flex items-center gap-2'>
        <span className='rounded-full bg-neutral-950/80 px-3 py-1 text-[11px] font-medium text-white'>
          Dummy play
        </span>
        {hand.handOver ? (
          <Button
            type='button'
            size='sm'
            className='pointer-events-auto rounded-full bg-[#1D9BF0] text-white hover:bg-[#1a8cd8]'
            onClick={dealNext}
          >
            Next hand
          </Button>
        ) : null}
      </div>
    </div>
  );
}
