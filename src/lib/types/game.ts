// Game-related types
export type Role = 'mafia' | 'doctor' | 'police' | 'villager';

export interface Player {
  id: string;
  name: string;
}

export interface Lobby {
  code: string;
  players: Player[];
  locked: boolean;
  roles: Record<string, Role>;
  mafiaCount?: number;
}

export interface GameState {
  phase: 'lobby' | 'night' | 'day' | 'ended';
  round: number;
  timeRemaining?: number;
}

// API request/response types
export interface CreateLobbyRequest {
  mafiaCount?: number;
}

export interface CreateLobbyResponse {
  code: string;
}

export interface JoinLobbyRequest {
  code: string;
  name: string;
}

export interface JoinLobbyResponse {
  playerId: string;
  players: Player[];
}

export interface StartGameRequest {
  code: string;
}

export interface StartGameResponse {
  roles: Record<string, Role>;
}

export interface UpdateMafiaCountRequest {
  code: string;
  mafiaCount: number;
}

export interface UpdateMafiaCountResponse {
  mafiaCount: number;
  maxMafia: number;
}

// Socket.IO event types
export interface ClientToServerEvents {
  join_room: (code: string) => void;
}

export interface ServerToClientEvents {
  player_join: (player: Player) => void;
  game_start: (data: { roles: Record<string, Role> }) => void;
  lobby_state: (data: { players: Player[], locked: boolean }) => void;
}

// Error types
export interface ApiError {
  error?: string;
  message: string;
}

// Role information
export interface RoleInfo {
  title: string;
  description: string;
  color: string;
  bgColor: string;
  instructions: string[];
  winCondition: string;
}

// Player session data
export interface PlayerSession {
  playerId: string;
  playerName: string;
  isHost: boolean;
  lobbyCode?: string;
}
