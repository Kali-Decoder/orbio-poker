import {
  chooseCards,
  createGame,
  declareWinner,
  fold,
  joinGame,
  listLobbySummary,
  placeBet,
  playerShuffle,
  startGame,
  toPublicView,
  type GameState,
  type PublicGameView,
} from 'game-engine';

import { GameEventModel, GameModel } from './db.js';

/** Short-lived cache; MongoDB is the source of truth. */
const memory = new Map<string, GameState>();

function lobbyFields(state: GameState) {
  return {
    gameId: state.gameId,
    status: state.status,
    round: state.round,
    totalPlayers: state.players.length,
    pot: state.pot,
    winnerId: state.winnerId,
    playerIds: state.players.map((p) => p.id),
    playerNicknames: state.players.map((p) => p.nickname),
    state,
  };
}

async function persistEvent(
  state: GameState,
  type: string,
  actorId: string | null = null,
  payload: Record<string, unknown> = {}
) {
  await GameEventModel.create({
    gameId: state.gameId,
    type,
    actorId,
    status: state.status,
    round: state.round,
    payload,
  });
}

async function save(
  state: GameState,
  event?: { type: string; actorId?: string | null; payload?: Record<string, unknown> }
) {
  memory.set(state.gameId, state);
  await GameModel.findOneAndUpdate(
    { gameId: state.gameId },
    lobbyFields(state),
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (event) {
    await persistEvent(
      state,
      event.type,
      event.actorId ?? null,
      event.payload ?? {}
    );
  }
  return state;
}

async function load(gameId: string): Promise<GameState | null> {
  // Always prefer fresh Mongo document so multi-instance / restart stays consistent
  const doc = await GameModel.findOne({ gameId }).lean();
  if (!doc) {
    memory.delete(gameId);
    return null;
  }
  memory.set(gameId, doc.state);
  return doc.state;
}

export async function hydrateGamesFromDb() {
  const docs = await GameModel.find({}).lean();
  memory.clear();
  for (const doc of docs) {
    memory.set(doc.gameId, doc.state);
  }
  console.log(`Hydrated ${docs.length} games from MongoDB`);
}

export async function createNewGame(player: {
  id: string;
  nickname: string;
}) {
  const state = createGame(player);
  await save(state, {
    type: 'lobby:create',
    actorId: player.id,
    payload: { nickname: player.nickname },
  });
  return state;
}

export async function joinExistingGame(
  gameId: string,
  player: { id: string; nickname: string }
) {
  const state = await load(gameId);
  if (!state) throw new Error('GameNotFound');
  const next = joinGame(state, player);
  await save(next, {
    type: 'lobby:join',
    actorId: player.id,
    payload: { nickname: player.nickname },
  });
  return next;
}

export async function getGame(gameId: string) {
  return load(gameId);
}

export type ListGamesFilter = {
  status?: string | string[];
  includeEnded?: boolean;
};

/** Always reads lobbies + status from MongoDB. */
export async function listGames(filter: ListGamesFilter = {}) {
  const query: Record<string, unknown> = {};

  if (filter.status) {
    query.status = Array.isArray(filter.status)
      ? { $in: filter.status }
      : filter.status;
  } else if (!filter.includeEnded) {
    // Default lobby: active tables (open + in progress)
    query.status = { $in: ['waiting', 'shuffling', 'playing'] };
  }

  const docs = await GameModel.find(query)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  return docs.map((d) => {
    const summary = listLobbySummary(d.state);
    return {
      ...summary,
      // Prefer denormalized Mongo fields when present
      status: d.status ?? summary.status,
      round: d.round ?? summary.round,
      totalPlayers: d.totalPlayers ?? summary.totalPlayers,
      pot: d.pot ?? summary.pot,
      winnerId: d.winnerId ?? summary.winnerId,
      mongoUpdatedAt: d.updatedAt,
      mongoCreatedAt: d.createdAt,
    };
  });
}

export async function getGameEvents(gameId: string, limit = 50) {
  return GameEventModel.find({ gameId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getPublicState(
  gameId: string,
  viewerId: string | null
): Promise<PublicGameView | null> {
  const state = await load(gameId);
  if (!state) return null;
  return toPublicView(state, viewerId);
}

type Mutator = (state: GameState) => GameState;

async function mutate(
  gameId: string,
  fn: Mutator,
  event: { type: string; actorId?: string | null; payload?: Record<string, unknown> }
) {
  const state = await load(gameId);
  if (!state) throw new Error('GameNotFound');
  const next = fn(state);
  await save(next, event);
  return next;
}

export async function actionStart(gameId: string, actorId?: string) {
  return mutate(gameId, startGame, { type: 'game:start', actorId });
}

export async function actionShuffle(gameId: string, playerId: string) {
  return mutate(gameId, (s) => playerShuffle(s, playerId), {
    type: 'game:shuffle',
    actorId: playerId,
  });
}

export async function actionBet(
  gameId: string,
  playerId: string,
  amount: number
) {
  return mutate(gameId, (s) => placeBet(s, playerId, amount), {
    type: 'game:bet',
    actorId: playerId,
    payload: { amount },
  });
}

export async function actionFold(gameId: string, playerId: string) {
  return mutate(gameId, (s) => fold(s, playerId), {
    type: 'game:fold',
    actorId: playerId,
  });
}

export async function actionChooseCards(
  gameId: string,
  playerId: string,
  cards: [number, number, number]
) {
  return mutate(gameId, (s) => chooseCards(s, playerId, cards), {
    type: 'game:chooseCards',
    actorId: playerId,
    payload: { cards },
  });
}

export async function actionDeclareWinner(gameId: string, actorId?: string) {
  return mutate(gameId, declareWinner, {
    type: 'game:declareWinner',
    actorId,
  });
}
