import config from '$lib/config';
import type { 
  CreateLobbyRequest, 
  CreateLobbyResponse,
  JoinLobbyRequest,
  JoinLobbyResponse,
  StartGameRequest,
  StartGameResponse,
  UpdateMafiaCountRequest,
  UpdateMafiaCountResponse,
  ApiError as ApiErrorType
} from '$lib/types/game';

export class ApiError extends Error {
  constructor(
    message: string, 
    public status: number, 
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      let errorData: ApiErrorType;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Network error' };
      }
      
      throw new ApiError(
        errorData.message || 'Unknown error',
        response.status,
        (errorData as any).error
      );
    }

    return response.json();
  }

  async createLobby(data: CreateLobbyRequest = {}): Promise<CreateLobbyResponse> {
    return this.request<CreateLobbyResponse>('/api/lobby/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinLobby(data: JoinLobbyRequest): Promise<JoinLobbyResponse> {
    return this.request<JoinLobbyResponse>('/api/lobby/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startGame(data: StartGameRequest): Promise<StartGameResponse> {
    return this.request<StartGameResponse>('/api/lobby/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMafiaCount(data: UpdateMafiaCountRequest): Promise<UpdateMafiaCountResponse> {
    return this.request<UpdateMafiaCountResponse>('/api/lobby/mafia-count', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance
export const apiService = new ApiService();
