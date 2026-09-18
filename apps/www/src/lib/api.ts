import { env } from '~/env';

export type SessionUser = {
  sessionId: string;
  nickname: string;
  chips: number;
};

export type LobbyGame = {
  gameId: string;
  totalPlayers: number;
  players?: Array<{ id: string; nickname: string; seat: number }>;
  currentRound: string;
  round?: string;
  status: string;
  pot?: number;
  winnerId?: string | null;
  winnerNickname?: string | null;
  gameStarted: boolean;
  gameEnded?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicGameView = {
  gameId: string;
  status: string;
  round: string;
  roundLabel: string;
  players: Array<{
    id: string;
    nickname: string;
    seat: number;
    chipsInPot: number;
    folded: boolean;
    shuffled: boolean;
    holeCards: number[];
    chosenCommunity: number[];
    weight: number;
  }>;
  communityCards: number[];
  pot: number;
  highestBet: number;
  nextSeat: number;
  nextPlayerId: string | null;
  nextPlayerNickname: string | null;
  winnerId: string | null;
  winnerNickname: string | null;
  totalPlayers: number;
  totalShuffles: number;
  gameStarted: boolean;
  gameEnded: boolean;
  myPlayerId: string | null;
  isMyTurn: boolean;
};

export type Agent = {
  agentId: string;
  name: string;
  model: string;
  systemPrompt: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrbioModelOption = {
  id: string;
  label: string;
  provider: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === 'object' && data && 'error' in data && data.error
        ? String(data.error)
        : `Request failed (${res.status})`
    );
  }
  return data;
}

export const api = {
  me: () => request<SessionUser>('/auth/me'),
  setNickname: (nickname: string) =>
    request<SessionUser>('/auth/nickname', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  listGames: (opts?: { status?: string; includeEnded?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.includeEnded) params.set('includeEnded', '1');
    const q = params.toString();
    return request<{ games: LobbyGame[] }>(`/games${q ? `?${q}` : ''}`);
  },
  getGame: (id: string) => request<PublicGameView>(`/games/${id}`),
  createGame: () =>
    request<PublicGameView>('/games', { method: 'POST', body: '{}' }),
  joinGame: (id: string) =>
    request<PublicGameView>(`/games/${id}/join`, {
      method: 'POST',
      body: '{}',
    }),
  listAgents: () => request<{ agents: Agent[] }>('/agents'),
  listModels: () => request<{ models: OrbioModelOption[] }>('/agents/models'),
  createAgent: (payload: {
    name: string;
    model: string;
    systemPrompt?: string;
  }) =>
    request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAgent: (
    id: string,
    payload: { name?: string; isActive?: boolean; systemPrompt?: string }
  ) =>
    request<Agent>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAgent: (id: string) =>
    request<{ ok: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
};
