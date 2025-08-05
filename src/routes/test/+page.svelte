<script lang="ts">
  import { onDestroy } from 'svelte';
  import { io, type Socket } from 'socket.io-client';

  const API_BASE = 'http://localhost:3000';
  
  let socket: Socket | null = null;
  let code = '';
  let playerName = '';
  let playerId = '';
  let currentLobby: any = null;
  let events: any[] = [];
  let players: any[] = [];
  let roles: Record<string, string> = {};
  let gameStarted = false;
  let customMafiaCount = 0;
  let maxMafia = 0;

  // API calls
  async function createLobby() {
    try {
      const response = await fetch(`${API_BASE}/api/lobby/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mafiaCount: customMafiaCount || undefined })
      });
      const data = await response.json();
      code = data.code;
      events = [...events, { type: 'lobby_created', code: data.code }];
    } catch (error) {
      events = [...events, { type: 'error', message: 'Failed to create lobby' }];
    }
  }

  async function updateMafiaCount() {
    if (!code) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/lobby/mafia-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mafiaCount: customMafiaCount })
      });
      const data = await response.json();
      
      if (response.ok) {
        customMafiaCount = data.mafiaCount;
        maxMafia = data.maxMafia;
        events = [...events, { type: 'mafia_count_updated', mafiaCount: data.mafiaCount, maxMafia: data.maxMafia }];
      } else {
        events = [...events, { type: 'error', message: data.error }];
      }
    } catch (error) {
      events = [...events, { type: 'error', message: 'Failed to update mafia count' }];
    }
  }

  async function joinLobby() {
    if (!code || !playerName) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: playerName })
      });
      const data = await response.json();
      
      if (response.ok) {
        playerId = data.playerId;
        players = data.players;
        connectSocket();
        events = [...events, { type: 'joined_lobby', playerId: data.playerId }];
      } else {
        events = [...events, { type: 'error', message: data.error }];
      }
    } catch (error) {
      events = [...events, { type: 'error', message: 'Failed to join lobby' }];
    }
  }

  async function startGame() {
    if (!code) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/lobby/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      
      if (response.ok) {
        roles = data.roles;
        gameStarted = true;
        events = [...events, { type: 'game_started', roles: data.roles }];
      } else {
        events = [...events, { type: 'error', message: data.error }];
      }
    } catch (error) {
      events = [...events, { type: 'error', message: 'Failed to start game' }];
    }
  }

  function connectSocket() {
    if (!code) return;
    
    socket = io(API_BASE);
    
    socket.on('connect', () => {
      events = [...events, { type: 'socket_connected' }];
      socket?.emit('join_room', code);
    });

    socket.on('player_join', (data) => {
      events = [...events, { type: 'player_join', data }];
      // Add player to local list if not already there
      if (!players.some(p => p.id === data.id)) {
        players = [...players, data];
      }
    });

    socket.on('game_start', (data) => {
      events = [...events, { type: 'game_start', data }];
      roles = data.roles;
      gameStarted = true;
    });

    socket.on('disconnect', () => {
      events = [...events, { type: 'socket_disconnected' }];
    });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
    playerId = '';
    players = [];
    roles = {};
    gameStarted = false;
    customMafiaCount = 0;
    maxMafia = 0;
  }

  onDestroy(() => {
    socket?.disconnect();
  });

  function clearEvents() {
    events = [];
  }

  // Get player's role
  $: myRole = playerId && roles[playerId] ? roles[playerId] : null;
</script>

<div class="container">
  <h1>🎭 Mafia Game - Fastify + Socket.IO</h1>

  <div class="section">
    <h2>Lobby Management</h2>
    
    <div class="controls">
      <div class="mafia-count-section">
        <label>
          Custom Mafia Count (0 = auto):
          <input type="number" bind:value={customMafiaCount} min="0" max="10" />
        </label>
        {#if maxMafia > 0}
          <span class="mafia-info">Max mafia for current players: {maxMafia}</span>
        {/if}
      </div>

      <button on:click={createLobby}>Create New Lobby</button>
      
      <div class="input-group">
        <label>
          Lobby Code:
          <input bind:value={code} placeholder="Enter lobby code" maxlength="6" />
        </label>
        
        <label>
          Your Name:
          <input bind:value={playerName} placeholder="Enter your name" />
        </label>
        
        <button on:click={joinLobby} disabled={!code || !playerName}>
          Join Lobby
        </button>
      </div>

      {#if playerId}
        <button on:click={updateMafiaCount} disabled={gameStarted}>
          Update Mafia Count
        </button>
        <button on:click={startGame}>Start Game</button>
        <button on:click={disconnect}>Leave Lobby</button>
      {/if}
    </div>
  </div>

  {#if code}
    <div class="section">
      <h2>Current Lobby: {code}</h2>
      
      {#if playerId}
        <p>You joined as: <strong>{playerName}</strong> (ID: {playerId})</p>
        {#if customMafiaCount > 0}
          <p>Custom mafia count: <strong>{customMafiaCount}</strong></p>
        {:else}
          <p>Mafia count: <strong>Auto (based on player count)</strong></p>
        {/if}
      {/if}

      {#if players.length > 0}
        <div class="players">
          <h3>Players ({players.length}):</h3>
          <ul>
            {#each players as player}
              <li>
                {player.name} 
                {#if player.id === playerId}(You){/if}
                {#if gameStarted && roles[player.id]}
                  - <span class="role role-{roles[player.id]}">{roles[player.id]}</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if gameStarted && myRole}
        <div class="my-role">
          <h3>Your Role: <span class="role role-{myRole}">{myRole}</span></h3>
        </div>
      {/if}
    </div>
  {/if}

  <div class="section">
    <div class="events-header">
      <h2>Events Log</h2>
      <button on:click={clearEvents}>Clear</button>
    </div>
    <pre class="events">{JSON.stringify(events, null, 2)}</pre>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .mafia-count-section {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
  }

  .mafia-info {
    color: #6c757d;
    font-size: 12px;
    margin-top: 5px;
    display: block;
  }

  .input-group {
    display: flex;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  button:hover {
    background: #0056b3;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .players ul {
    list-style: none;
    padding: 0;
  }

  .players li {
    padding: 5px 0;
    border-bottom: 1px solid #eee;
  }

  .role {
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    text-transform: uppercase;
  }

  .role-mafia { background: #ff4444; color: white; }
  .role-doctor { background: #44ff44; color: black; }
  .role-police { background: #4444ff; color: white; }
  .role-villager { background: #ffaa44; color: black; }

  .my-role {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-top: 15px;
  }

  .events-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .events {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    max-height: 300px;
    overflow-y: auto;
    font-size: 12px;
  }
</style>