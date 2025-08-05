<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiService, SessionService, socketService, ApiError } from '$lib/services';
  import type { Player } from '$lib/types/game';
  
  let lobbyCode = '';
  let isHost = false;
  let playerName = '';
  let playerId = '';
  let players: Player[] = [];
  let customMafiaCount = 0;
  let maxMafia = 0;
  let isStarting = false;
  let errorMessage = '';
  let gameStarted = false;

  // Reactive statements
  $: lobbyCode = $page.params.code || '';
  $: canStart = isHost && players.length >= 5 && !gameStarted;
  $: recommendedMafia = Math.max(1, Math.round((players.length - 2) / 3));

  onMount(async () => {
    // Get stored player session
    const session = SessionService.getPlayerSession();
    
    if (!session || !session.playerName) {
      goto('/');
      return;
    }

    isHost = session.isHost;
    playerName = session.playerName;
    playerId = session.playerId;

    // Connect to socket
    connectSocket();

    // If host, join the lobby
    if (isHost) {
      await joinLobby();
    }
  });

  onDestroy(() => {
    socketService.disconnect();
  });

  function connectSocket() {
    const socket = socketService.connect();
    
    socket.on('connect', () => {
      socketService.emit('join_room', lobbyCode);
    });

    socket.on('lobby_state', (data: { players: Player[], locked: boolean }) => {
      // Update the local state with the current lobby state
      players = data.players;
      gameStarted = data.locked;
    });

    socket.on('player_join', (data: Player) => {
      // Add player to local list if not already there
      if (!players.some(p => p.id === data.id)) {
        players = [...players, data];
      }
    });

    socket.on('game_start', (data: { roles: Record<string, any> }) => {
      gameStarted = true;
      SessionService.updatePlayerSession({ lobbyCode });
      if (typeof window !== 'undefined') {
        // Use sessionStorage with playerId to avoid conflicts between browser tabs
        const playerRoleData = {
          playerId: playerId,
          playerName: playerName, // Store the player name with the role
          role: data.roles[playerId],
          lobbyCode: lobbyCode,
          allRoles: data.roles // For debugging, but each player should only see their own
        };
        sessionStorage.setItem(`gameRole_${playerId}`, JSON.stringify(playerRoleData));
        console.log('🎭 Storing role for player:', playerId, 'Name:', playerName, 'Role:', data.roles[playerId]);
      }
      goto(`/role`);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  async function joinLobby() {
    if (!isHost) return; // Non-hosts already joined via landing page
    
    try {
      const response = await apiService.joinLobby({ 
        code: lobbyCode, 
        name: playerName 
      });
      
      playerId = response.playerId;
      players = response.players;
      SessionService.updatePlayerSession({ playerId });
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to join lobby';
      }
    }
  }

  async function updateMafiaCount() {
    if (!isHost) return;
    
    // If customMafiaCount is 0 or empty, don't validate - it means auto-assign
    if (!customMafiaCount || customMafiaCount === 0) {
      errorMessage = 'Please enter a number or leave empty for auto-assign';
      return;
    }
    
    // Client-side validation for actual values
    if (customMafiaCount < 1) {
      errorMessage = 'Mafia count must be at least 1';
      return;
    }
    
    // Calculate villagers after assigning roles: total - mafia - doctor - police
    const villagerCount = players.length - customMafiaCount - 2; // 2 = doctor + police
    
    if (customMafiaCount >= villagerCount) {
      errorMessage = `Mafia (${customMafiaCount}) cannot equal or exceed villagers (${villagerCount}). Mafia must remain minority!`;
      return;
    }
    
    const maxAllowed = Math.floor((players.length - 2) / 2); // Max mafia = half of remaining players (excluding doctor+police)
    if (customMafiaCount > maxAllowed) {
      errorMessage = `Too many mafia! Maximum ${maxAllowed} for ${players.length} players to keep mafia as minority`;
      return;
    }
    
    try {
      const response = await apiService.updateMafiaCount({ 
        code: lobbyCode, 
        mafiaCount: customMafiaCount 
      });
      
      customMafiaCount = response.mafiaCount;
      maxMafia = response.maxMafia;
      errorMessage = ''; // Clear any previous errors
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to update mafia count';
      }
    }
  }

  async function startGame() {
    if (!canStart || isStarting) return;
    isStarting = true;
    errorMessage = '';
    
    try {
      const response = await apiService.startGame({ code: lobbyCode });
      
      gameStarted = true;
      if (typeof window !== 'undefined') {
        // Use sessionStorage with playerId to avoid conflicts between browser tabs
        const playerRoleData = {
          playerId: playerId,
          playerName: playerName, // Store the player name with the role
          role: response.roles[playerId],
          lobbyCode: lobbyCode,
          allRoles: response.roles // For debugging, but each player should only see their own
        };
        sessionStorage.setItem(`gameRole_${playerId}`, JSON.stringify(playerRoleData));
        console.log('🎭 Storing role for player:', playerId, 'Name:', playerName, 'Role:', response.roles[playerId]);
      }
      goto(`/role`);
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to start game';
      }
    } finally {
      isStarting = false;
    }
  }

  function copyLobbyCode() {
    navigator.clipboard.writeText(lobbyCode);
  }

  function leaveLobby() {
    SessionService.clearPlayerSession();
    goto('/');
  }
</script>

<svelte:head>
  <title>🎭 Lobby {lobbyCode} - Mafia Game</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>🎭 Lobby {lobbyCode}</h1>
    <div class="lobby-info">
      <button class="copy-btn" on:click={copyLobbyCode}>
        📋 Copy Code
      </button>
      <span class="player-count">{players.length}/10 Players</span>
    </div>
  </div>

  <div class="content">
    <div class="players-section">
      <h2>Players ({players.length})</h2>
      <div class="players-grid">
        {#each players as player}
          <div class="player-card" class:is-you={player.id === playerId}>
            <div class="player-avatar">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div class="player-info">
              <span class="player-name">{player.name}</span>
              {#if player.id === playerId}
                <span class="you-badge">You</span>
              {/if}
              {#if isHost && player.name === 'Host'}
                <span class="host-badge">Host</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if players.length < 5}
        <div class="waiting-message">
          <p>⏳ Waiting for more players...</p>
          <p>Need at least 5 players to start the game</p>
          <p>Share the code <strong>{lobbyCode}</strong> with your friends!</p>
        </div>
      {/if}
    </div>

    <div class="settings-section">
      <h2>Game Settings</h2>
      
      <div class="role-preview">
        <h3>Role Distribution</h3>
        <div class="roles-grid">
          <div class="role-item">
            <span class="role-icon">🔪</span>
            <span class="role-name">Mafia</span>
            <span class="role-count">{customMafiaCount || recommendedMafia}</span>
          </div>
          <div class="role-item">
            <span class="role-icon">⚕️</span>
            <span class="role-name">Doctor</span>
            <span class="role-count">1</span>
          </div>
          <div class="role-item">
            <span class="role-icon">👮</span>
            <span class="role-name">Police</span>
            <span class="role-count">1</span>
          </div>
          <div class="role-item">
            <span class="role-icon">👤</span>
            <span class="role-name">Villager</span>
            <span class="role-count">{Math.max(0, players.length - (customMafiaCount || recommendedMafia) - 2)}</span>
          </div>
        </div>
      </div>

      {#if isHost}
        <div class="mafia-selector">
          <label for="mafiaCount">Custom Mafia Count</label>
          <div class="input-group">
            <input
              id="mafiaCount"
              type="number"
              bind:value={customMafiaCount}
              min="1"
              max={Math.floor((players.length - 2) / 2)}
              placeholder="Auto"
              on:input={() => errorMessage = ''}
            />
            <button class="update-btn" on:click={updateMafiaCount}>
              Update
            </button>
          </div>
          <p class="help-text">
            Leave empty for auto-assign ({recommendedMafia} recommended for {players.length} players)
          </p>
          <p class="validation-text">
            Max {Math.floor((players.length - 2) / 2)} mafia (must be less than {Math.max(0, players.length - (customMafiaCount || recommendedMafia) - 2)} villagers)
          </p>
        </div>
      {:else}
        <div class="readonly-info">
          <p>Only the host can change game settings</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="actions">
    {#if isHost}
      <button 
        class="start-btn" 
        class:disabled={!canStart}
        on:click={startGame} 
        disabled={!canStart || isStarting}
      >
        {#if isStarting}
          Starting Game...
        {:else if players.length < 5}
          Need {5 - players.length} More Players
        {:else}
          Start Game
        {/if}
      </button>
    {:else}
      <div class="waiting-host">
        <p>⏳ Waiting for host to start the game...</p>
      </div>
    {/if}

    <button class="leave-btn" on:click={leaveLobby}>
      Leave Lobby
    </button>
  </div>

  {#if errorMessage}
    <div class="error">
      {errorMessage}
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
  }

  .header h1 {
    margin: 0 0 15px 0;
    font-size: 2.5rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  }

  .lobby-info {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .copy-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .player-count {
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 500;
  }

  .content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .players-section, .settings-section {
    background: rgba(255, 255, 255, 0.1);
    padding: 25px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .players-section h2, .settings-section h2 {
    margin: 0 0 20px 0;
    font-size: 1.5rem;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .player-card.is-you {
    border-color: #4ecdc4;
    background: rgba(78, 205, 196, 0.2);
  }

  .player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .player-info {
    flex: 1;
  }

  .player-name {
    display: block;
    font-weight: 500;
  }

  .you-badge, .host-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-top: 4px;
  }

  .host-badge {
    background: rgba(255, 107, 107, 0.5);
  }

  .waiting-message {
    text-align: center;
    margin-top: 30px;
    opacity: 0.8;
  }

  .waiting-message p {
    margin: 8px 0;
  }

  .role-preview h3 {
    margin: 0 0 15px 0;
    font-size: 1.2rem;
  }

  .roles-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 25px;
  }

  .role-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 6px;
  }

  .role-icon {
    font-size: 1.2rem;
  }

  .role-name {
    flex: 1;
    font-weight: 500;
  }

  .role-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: bold;
    min-width: 24px;
    text-align: center;
  }

  .mafia-selector label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .input-group input {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
  }

  .update-btn {
    background: #4ecdc4;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }

  .update-btn:hover {
    background: #26d0ce;
  }

  .help-text {
    font-size: 0.9rem;
    opacity: 0.8;
  }
  
  .validation-text {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-top: 3px;
    color: #f1c40f;
  }

  .readonly-info {
    text-align: center;
    opacity: 0.7;
    font-style: italic;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 30px;
    flex-wrap: wrap;
  }

  .start-btn {
    background: #ff6b6b;
    border: none;
    color: white;
    padding: 15px 40px;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .start-btn:hover:not(.disabled) {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  }

  .start-btn.disabled {
    background: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }

  .leave-btn {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    padding: 13px 30px;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .leave-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
  }

  .waiting-host {
    text-align: center;
    opacity: 0.8;
  }

  .error {
    background: rgba(255, 0, 0, 0.2);
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin-top: 20px;
    border: 1px solid rgba(255, 0, 0, 0.3);
    text-align: center;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 768px) {
    .content {
      grid-template-columns: 1fr;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }

    .roles-grid {
      grid-template-columns: 1fr;
    }

    .actions {
      flex-direction: column;
      align-items: center;
    }

    .start-btn, .leave-btn {
      width: 200px;
    }
  }
</style>
