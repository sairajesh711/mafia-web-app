<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiService, SessionService, ApiError } from '$lib/services';
  import { nanoid } from 'nanoid';
  
  let joinCode = '';
  let playerName = '';
  let hostName = '';
  let isCreating = false;
  let isJoining = false;
  let errorMessage = '';
  let showHostNameInput = false;

  async function createLobby() {
    if (isCreating) return;
    
    if (!hostName.trim()) {
      showHostNameInput = true;
      return;
    }
    
    isCreating = true;
    errorMessage = '';
    
    try {
      const response = await apiService.createLobby();
      
      // Create host session
      const hostSession = {
        playerId: nanoid(),
        playerName: hostName.trim(),
        isHost: true,
        lobbyCode: response.code
      };
      
      SessionService.savePlayerSession(hostSession);
      goto(`/lobby/${response.code}`);
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to create lobby';
      }
    } finally {
      isCreating = false;
    }
  }

  async function joinLobby() {
    if (isJoining || !joinCode.trim() || !playerName.trim()) return;
    isJoining = true;
    errorMessage = '';
    
    try {
      const response = await apiService.joinLobby({
        code: joinCode.toUpperCase(),
        name: playerName.trim()
      });
      
      // Create player session
      const playerSession = {
        playerId: response.playerId,
        playerName: playerName.trim(),
        isHost: false,
        lobbyCode: joinCode.toUpperCase()
      };
      
      SessionService.savePlayerSession(playerSession);
      goto(`/lobby/${joinCode.toUpperCase()}`);
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.code === 'locked' ? 'Game already started' : error.message;
      } else {
        errorMessage = 'Failed to join lobby';
      }
    } finally {
      isJoining = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      joinLobby();
    }
  }
</script>

<svelte:head>
  <title>🎭 Mafia Game</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>🎭 Mafia Game</h1>
    <p>The classic social deduction game</p>
  </div>

  <div class="actions">
    <div class="create-section">
      <h2>Host a Game</h2>
      
      {#if showHostNameInput}
        <div class="form-group">
          <label for="hostName">Your Name (Host)</label>
          <input
            id="hostName"
            type="text"
            bind:value={hostName}
            placeholder="Enter your name"
            maxlength="20"
            on:keypress={handleKeyPress}
          />
        </div>
      {/if}
      
      <button 
        class="primary-btn" 
        on:click={createLobby} 
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : showHostNameInput ? 'Create Lobby' : 'Host Game'}
      </button>
      
      {#if !showHostNameInput}
        <p class="help-text">Create a new game and invite your friends</p>
      {:else}
        <p class="help-text">Enter your name to create the lobby</p>
      {/if}
    </div>

    <div class="divider">
      <span>or</span>
    </div>

    <div class="join-section">
      <h2>Join a Game</h2>
      <div class="form-group">
        <label for="joinCode">Lobby Code</label>
        <input
          id="joinCode"
          type="text"
          bind:value={joinCode}
          placeholder="Enter 6-character code"
          maxlength="6"
          on:keypress={handleKeyPress}
          style="text-transform: uppercase;"
        />
      </div>
      
      <div class="form-group">
        <label for="playerName">Your Name</label>
        <input
          id="playerName"
          type="text"
          bind:value={playerName}
          placeholder="Enter your name"
          maxlength="20"
          on:keypress={handleKeyPress}
        />
      </div>

      <button 
        class="secondary-btn" 
        on:click={joinLobby} 
        disabled={isJoining || !joinCode.trim() || !playerName.trim()}
      >
        {isJoining ? 'Joining...' : 'Join Lobby'}
      </button>
      
      <p class="help-text">Join an existing game with a lobby code</p>
    </div>
  </div>

  {#if errorMessage}
    <div class="error">
      {errorMessage}
    </div>
  {/if}

  <div class="footer">
    <p>Need at least 5 players to start a game</p>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: system-ui, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
  }

  .header h1 {
    font-size: 3rem;
    margin: 0 0 10px 0;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  }

  .header p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 40px;
    align-items: flex-start;
    max-width: 800px;
    width: 100%;
  }

  .create-section, .join-section {
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    padding: 30px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .create-section h2, .join-section h2 {
    margin: 0 0 20px 0;
    font-size: 1.5rem;
    text-align: center;
  }

  .divider {
    display: flex;
    align-items: center;
    margin-top: 60px;
  }

  .divider span {
    background: rgba(255, 255, 255, 0.1);
    padding: 10px 15px;
    border-radius: 20px;
    font-weight: 500;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    background: white;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }

  .primary-btn, .secondary-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn {
    background: #ff6b6b;
    color: white;
  }

  .primary-btn:hover:not(:disabled) {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  }

  .secondary-btn {
    background: #4ecdc4;
    color: white;
  }

  .secondary-btn:hover:not(:disabled) {
    background: #26d0ce;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
  }

  .primary-btn:disabled, .secondary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .help-text {
    margin-top: 15px;
    text-align: center;
    opacity: 0.8;
    font-size: 0.9rem;
  }

  .error {
    background: rgba(255, 0, 0, 0.2);
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin-top: 20px;
    border: 1px solid rgba(255, 0, 0, 0.3);
    text-align: center;
  }

  .footer {
    margin-top: 40px;
    text-align: center;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .actions {
      flex-direction: column;
      gap: 20px;
    }

    .divider {
      margin-top: 0;
      align-self: center;
    }

    .header h1 {
      font-size: 2rem;
    }
  }
</style>
