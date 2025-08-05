<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { SessionService } from '$lib/services';
  import type { Role, RoleInfo } from '$lib/types/game';

  let playerId = '';
  let playerName = '';
  let myRole: Role = 'villager';
  let roles: Record<string, Role> = {};
  let isRevealed = false;

  const roleInfo: Record<Role, RoleInfo> = {
    mafia: {
      title: '🔪 Mafia',
      description: 'You are part of the mafia! Work with your fellow mafia members to eliminate the villagers.',
      color: '#e74c3c',
      bgColor: 'rgba(231, 76, 60, 0.1)',
      instructions: [
        'During the day, vote to eliminate villagers',
        'During the night, choose someone to eliminate',
        'Work with other mafia members',
        'Try to blend in with the villagers'
      ],
      winCondition: 'Eliminate all villagers or equal their numbers'
    },
    doctor: {
      title: '⚕️ Doctor', 
      description: 'You can save lives! Each night, choose someone to protect from the mafia.',
      color: '#27ae60',
      bgColor: 'rgba(39, 174, 96, 0.1)',
      instructions: [
        'Each night, choose someone to protect',
        'You can protect yourself once per game',
        'Try to identify and protect important villagers',
        'Work with the villagers to find the mafia'
      ],
      winCondition: 'Help eliminate all mafia members'
    },
    police: {
      title: '👮 Police',
      description: 'You can investigate players to discover if they are mafia or innocent.',
      color: '#3498db',
      bgColor: 'rgba(52, 152, 219, 0.1)', 
      instructions: [
        'Each night, investigate one player',
        'You will learn if they are mafia or innocent',
        'Share information carefully during the day',
        'Help the villagers identify the mafia'
      ],
      winCondition: 'Help eliminate all mafia members'
    },
    villager: {
      title: '👤 Villager',
      description: 'You are an innocent villager. Use your voice and vote to find and eliminate the mafia.',
      color: '#f39c12',
      bgColor: 'rgba(243, 156, 18, 0.1)',
      instructions: [
        'Pay attention to voting patterns',
        'Listen carefully to discussions',
        'Vote to eliminate suspicious players',
        'Work with other villagers to find the mafia'
      ],
      winCondition: 'Eliminate all mafia members'
    }
  };

  onMount(() => {
    // Get stored player session
    const session = SessionService.getPlayerSession();
    
    if (!session || !session.playerId || !session.playerName) {
      goto('/');
      return;
    }

    playerId = session.playerId;
    playerName = session.playerName;
    
    console.log('🎭 Debug - Player ID:', playerId);
    console.log('🎭 Debug - Player Name:', playerName);
    
    // Get game role from sessionStorage using unique player key
    if (typeof window !== 'undefined') {
      const roleKey = `gameRole_${playerId}`;
      const roleData = sessionStorage.getItem(roleKey);
      console.log('🎭 Debug - Looking for role key:', roleKey);
      console.log('🎭 Debug - Found role data:', roleData);
      
      if (roleData) {
        try {
          const playerRoleData = JSON.parse(roleData);
          console.log('🎭 Debug - Parsed role data:', playerRoleData);
          
          if (playerRoleData.role && ['mafia', 'doctor', 'police', 'villager'].includes(playerRoleData.role)) {
            myRole = playerRoleData.role as Role;
            console.log('🎭 Debug - Set myRole to:', myRole);
          } else {
            console.log('🎭 Debug - No valid role found in data');
          }
        } catch (error) {
          console.error('🎭 Failed to parse role data:', error);
          
          // Fallback: try old localStorage method
          const oldRolesData = localStorage.getItem('gameRoles');
          if (oldRolesData) {
            try {
              const allRoles = JSON.parse(oldRolesData);
              const roleValue = allRoles[playerId];
              if (roleValue && ['mafia', 'doctor', 'police', 'villager'].includes(roleValue)) {
                myRole = roleValue as Role;
                console.log('🎭 Debug - Using fallback role:', myRole);
              }
            } catch (fallbackError) {
              console.error('🎭 Fallback also failed:', fallbackError);
            }
          }
        }
      } else {
        console.log('🎭 Debug - No role data found for this player');
      }
    }

    if (!myRole) {
      console.log('🎭 Debug - No role assigned, redirecting to home');
      goto('/');
      return;
    }
  });

  function revealRole() {
    isRevealed = true;
  }

  function continueToGame() {
    // This will be the transition to the actual game phases
    // For now, just show a placeholder
    alert('Game phases will be implemented next!');
  }

  function getMafiaTeammates(): string[] {
    if (myRole !== 'mafia') return [];
    return Object.entries(roles)
      .filter(([id, role]) => role === 'mafia' && id !== playerId)
      .map(([id]) => id);
  }

  $: currentRoleInfo = roleInfo[myRole] || roleInfo.villager;
  $: mafiaTeammates = getMafiaTeammates();
</script>

<svelte:head>
  <title>🎭 Your Role - Mafia Game</title>
</svelte:head>

<div class="container">
  {#if !isRevealed}
    <div class="reveal-screen">
      <div class="card-back">
        <div class="card-icon">🎭</div>
        <h1>Your Role</h1>
        <p>Click to reveal your role for this game</p>
        <button class="reveal-btn" on:click={revealRole}>
          Reveal Role
        </button>
        <div class="warning">
          ⚠️ Make sure nobody else can see your screen!
        </div>
      </div>
    </div>
  {:else}
    <div class="role-screen" style="--role-color: {currentRoleInfo.color}; --role-bg: {currentRoleInfo.bgColor}">
      <div class="role-card">
        <div class="role-header">
          <h1>{currentRoleInfo.title}</h1>
          <div class="player-info">
            Playing as: <strong>{playerName}</strong>
          </div>
        </div>

        <div class="role-description">
          <p>{currentRoleInfo.description}</p>
        </div>

        {#if myRole === 'mafia' && mafiaTeammates.length > 0}
          <div class="teammates">
            <h3>Your Mafia Teammates:</h3>
            <div class="teammate-list">
              {#each mafiaTeammates as teammateId}
                <div class="teammate">
                  🔪 Player {teammateId.slice(0, 4)}...
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="instructions">
          <h3>Your Objectives:</h3>
          <ul>
            {#each currentRoleInfo.instructions as instruction}
              <li>{instruction}</li>
            {/each}
          </ul>
        </div>

        <div class="game-info">
          <div class="info-item">
            <span class="label">Win Condition:</span>
            <span class="value">
              {#if myRole === 'mafia'}
                Eliminate all villagers and special roles
              {:else}
                Eliminate all mafia members
              {/if}
            </span>
          </div>
        </div>

        <div class="actions">
          <button class="continue-btn" on:click={continueToGame}>
            Ready to Play
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .reveal-screen {
    color: white;
    text-align: center;
  }

  .card-back {
    background: linear-gradient(45deg, #8e44ad, #9b59b6);
    padding: 60px 40px;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    position: relative;
    overflow: hidden;
  }

  .card-back::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.1) 10px,
      rgba(255, 255, 255, 0.1) 20px
    );
    animation: shimmer 3s linear infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%) translateY(-100%); }
    100% { transform: translateX(100%) translateY(100%); }
  }

  .card-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .card-back h1 {
    font-size: 2.5rem;
    margin: 0 0 15px 0;
    position: relative;
    z-index: 1;
  }

  .card-back p {
    font-size: 1.2rem;
    margin-bottom: 30px;
    opacity: 0.9;
    position: relative;
    z-index: 1;
  }

  .reveal-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid white;
    color: white;
    padding: 15px 40px;
    border-radius: 50px;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    z-index: 1;
  }

  .reveal-btn:hover {
    background: white;
    color: #8e44ad;
    transform: scale(1.05);
  }

  .warning {
    margin-top: 30px;
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.5);
    padding: 15px;
    border-radius: 8px;
    font-size: 0.9rem;
    position: relative;
    z-index: 1;
  }

  .role-screen {
    color: white;
    width: 100%;
    max-width: 600px;
  }

  .role-card {
    background: var(--role-bg);
    border: 3px solid var(--role-color);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .role-header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid var(--role-color);
    padding-bottom: 20px;
  }

  .role-header h1 {
    font-size: 3rem;
    margin: 0 0 10px 0;
    color: var(--role-color);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .player-info {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .role-description {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 25px;
    border-left: 4px solid var(--role-color);
  }

  .role-description p {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .teammates {
    background: rgba(231, 76, 60, 0.2);
    border: 2px solid #e74c3c;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 25px;
  }

  .teammates h3 {
    margin: 0 0 15px 0;
    color: #e74c3c;
  }

  .teammate-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .teammate {
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 500;
  }

  .instructions {
    margin-bottom: 25px;
  }

  .instructions h3 {
    margin: 0 0 15px 0;
    color: var(--role-color);
    font-size: 1.3rem;
  }

  .instructions ul {
    margin: 0;
    padding-left: 20px;
  }

  .instructions li {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .game-info {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .info-item:last-child {
    margin-bottom: 0;
  }

  .label {
    font-weight: 500;
    opacity: 0.9;
  }

  .value {
    font-weight: 600;
    color: var(--role-color);
  }

  .actions {
    text-align: center;
  }

  .continue-btn {
    background: var(--role-color);
    border: none;
    color: white;
    padding: 15px 40px;
    border-radius: 50px;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .continue-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }

  @media (max-width: 768px) {
    .container {
      padding: 10px;
    }

    .role-card {
      padding: 25px;
    }

    .role-header h1 {
      font-size: 2.5rem;
    }

    .card-back {
      padding: 40px 25px;
    }

    .card-icon {
      font-size: 3rem;
    }
  }
</style>
