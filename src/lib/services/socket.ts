import { io, Socket } from 'socket.io-client';
import config from '$lib/config';
import type { ClientToServerEvents, ServerToClientEvents } from '$lib/types/game';

export class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isConnected = false;

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(config.SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): boolean {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return false;
    }

    (this.socket as any).emit(event, ...args);
    return true;
  }

  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      (this.socket as any).on(event, listener);
    }
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      (this.socket as any).off(event, listener);
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && !!this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();
