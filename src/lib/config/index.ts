import { browser } from '$app/environment';

interface AppConfig {
  API_BASE_URL: string;
  SOCKET_URL: string;
  MIN_PLAYERS: number;
  MAX_PLAYERS: number;
  LOBBY_CODE_LENGTH: number;
}

// Environment-based configuration
const config: AppConfig = {
  API_BASE_URL: browser ? 
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') : 
    'http://localhost:3000',
  SOCKET_URL: browser ? 
    (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000') : 
    'http://localhost:3000',
  MIN_PLAYERS: 5,
  MAX_PLAYERS: 10,
  LOBBY_CODE_LENGTH: 6
};

export default config;
