import mongoose, { Schema } from 'mongoose';
import type { GameState } from 'game-engine';

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, required: true },
    chips: { type: Number, default: 10000 },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const SessionModel = mongoose.model('Session', sessionSchema);

/** Full game snapshot + denormalized lobby/status fields for querying. */
const gameSchema = new Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['waiting', 'shuffling', 'playing', 'ended'],
      required: true,
      index: true,
    },
    round: {
      type: String,
      enum: ['Ante', 'PreFlop', 'Flop', 'Turn', 'River', 'End'],
      required: true,
      index: true,
    },
    totalPlayers: { type: Number, required: true, default: 0 },
    pot: { type: Number, required: true, default: 0 },
    winnerId: { type: String, default: null },
    playerIds: { type: [String], default: [], index: true },
    playerNicknames: { type: [String], default: [] },
    /** Full authoritative game state (including deck — server only). */
    state: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

gameSchema.index({ status: 1, updatedAt: -1 });
gameSchema.index({ createdAt: -1 });

export type GameDoc = {
  gameId: string;
  status: string;
  round: string;
  totalPlayers: number;
  pot: number;
  winnerId: string | null;
  playerIds: string[];
  playerNicknames: string[];
  state: GameState;
  createdAt?: Date;
  updatedAt?: Date;
};

export const GameModel = mongoose.model<GameDoc>('Game', gameSchema);

/** Append-only status / action log for each lobby. */
const gameEventSchema = new Schema(
  {
    gameId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    actorId: { type: String, default: null },
    status: { type: String, required: true },
    round: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

gameEventSchema.index({ gameId: 1, createdAt: -1 });

export const GameEventModel = mongoose.model('GameEvent', gameEventSchema);

/** AI poker agents owned by a session (Orbio model + prompt). */
const agentSchema = new Schema(
  {
    agentId: { type: String, required: true, unique: true, index: true },
    ownerSessionId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    model: { type: String, required: true },
    systemPrompt: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

agentSchema.index({ ownerSessionId: 1, createdAt: -1 });

export type AgentDoc = {
  agentId: string;
  ownerSessionId: string;
  name: string;
  model: string;
  systemPrompt: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export const AgentModel = mongoose.model<AgentDoc>('Agent', agentSchema);

function withDbName(uri: string, dbName?: string) {
  if (!dbName) return uri;
  try {
    const url = new URL(uri);
    url.pathname = `/${dbName}`;
    return url.toString();
  } catch {
    return uri;
  }
}

export async function connectMongo(uri: string, dbName?: string) {
  let connectionUri = uri;
  if (uri === 'memory' || uri === 'mongodb-memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    connectionUri = mongod.getUri(dbName || 'poker');
    console.log('Using in-memory MongoDB');
  } else {
    connectionUri = withDbName(uri, dbName);
  }
  await mongoose.connect(connectionUri);
  console.log(`MongoDB connected${dbName ? ` (db: ${dbName})` : ''}`);
}
