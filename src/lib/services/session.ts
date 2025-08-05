import type { PlayerSession } from '$lib/types/game';

export class SessionService {
  private static readonly PLAYER_SESSION_KEY = 'player_session';

  static savePlayerSession(session: PlayerSession): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.PLAYER_SESSION_KEY, JSON.stringify(session));
    }
  }

  static getPlayerSession(): PlayerSession | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const sessionData = localStorage.getItem(this.PLAYER_SESSION_KEY);
    if (!sessionData) {
      return null;
    }

    try {
      return JSON.parse(sessionData) as PlayerSession;
    } catch {
      // Clear invalid session data
      this.clearPlayerSession();
      return null;
    }
  }

  static clearPlayerSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.PLAYER_SESSION_KEY);
    }
  }

  static updatePlayerSession(updates: Partial<PlayerSession>): void {
    const currentSession = this.getPlayerSession();
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      this.savePlayerSession(updatedSession);
    }
  }

  static hasValidSession(): boolean {
    const session = this.getPlayerSession();
    return !!(session?.playerId && session?.playerName);
  }
}
