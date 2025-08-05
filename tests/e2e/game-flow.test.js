// End-to-end test for the complete Mafia game flow
import { TestSuite, apiCall, createSocketConnection, sleep, log } from '../utils/test-helpers.js';

async function runE2ETests() {
  const suite = new TestSuite('E2E');

  await suite.test('Complete Game Flow with Socket.IO', async () => {
    log('Setting up complete game flow test...');
    
    // Step 1: Create lobby
    const lobby = await apiCall('/api/lobby/create');
    const lobbyCode = lobby.code;
    log(`Created lobby: ${lobbyCode}`);
    
    // Step 2: Create socket connections for multiple players
    const sockets = [];
    const socketEvents = []; // Will store arrays of events for each socket
    
    for (let i = 0; i < 3; i++) {
      const socket = createSocketConnection();
      sockets.push(socket);
      const events = []; // Create a new array for each socket's events
      socketEvents.push(events);
      
      // Track events for this socket
      const eventIndex = i;
      socket.on('connect', () => {
        events.push('connected');
        socket.emit('join_room', lobbyCode);
      });
      
      socket.on('lobby_state', (data) => {
        events.push(`lobby_state: ${data.players.length} players`);
      });
      
      socket.on('player_join', (data) => {
        events.push(`player_join: ${data.name}`);
      });
      
      socket.on('game_start', (data) => {
        events.push('game_start');
      });
    }
    
    // Wait for socket connections
    await sleep(1000);
    
    // Step 3: Add players via HTTP
    const players = [];
    for (let i = 0; i < 3; i++) {
      const result = await apiCall('/api/lobby/join', {
        code: lobbyCode,
        name: `Player${i + 1}`
      });
      players.push(result);
      await sleep(200); // Small delay between joins
    }
    
    // Add 2 more players to reach minimum game size
    for (let i = 3; i < 5; i++) {
      await apiCall('/api/lobby/join', {
        code: lobbyCode,
        name: `Player${i + 1}`
      });
      await sleep(200);
    }
    
    log(`Added ${players.length + 2} players to lobby`);
    
    // Step 4: Start the game
    const gameResult = await apiCall('/api/lobby/start', { code: lobbyCode });
    log('Game started, roles assigned');
    
    // Wait for socket events to propagate
    await sleep(1000);
    
    // Step 5: Verify socket events were received
    for (let i = 0; i < 3; i++) {
      const events = socketEvents[i];
      log(`Socket ${i + 1} events: ${events.join(', ')}`);
      
      if (!events.includes('connected')) {
        throw new Error(`Socket ${i + 1} did not connect`);
      }
      
      if (!events.some(e => e.includes('lobby_state'))) {
        throw new Error(`Socket ${i + 1} did not receive lobby_state`);
      }
      
      if (!events.includes('game_start')) {
        throw new Error(`Socket ${i + 1} did not receive game_start`);
      }
    }
    
    // Step 6: Verify role assignments
    const roles = Object.values(gameResult.roles);
    const roleCount = {
      mafia: roles.filter(r => r === 'mafia').length,
      doctor: roles.filter(r => r === 'doctor').length,
      police: roles.filter(r => r === 'police').length,
      villager: roles.filter(r => r === 'villager').length
    };
    
    log(`Final role distribution: ${JSON.stringify(roleCount)}`);
    
    // Validate proper role distribution for 5 players
    if (roleCount.mafia !== 1 || roleCount.doctor !== 1 || roleCount.police !== 1 || roleCount.villager !== 2) {
      throw new Error(`Invalid role distribution for 5 players: ${JSON.stringify(roleCount)}`);
    }
    
    // Cleanup
    sockets.forEach(socket => socket.disconnect());
    log('E2E test completed successfully');
  });

  await suite.test('Socket Synchronization Fix', async () => {
    log('Testing socket synchronization fix...');
    
    // Create lobby
    const lobby = await apiCall('/api/lobby/create');
    
    // Create host socket
    const hostSocket = createSocketConnection();
    const hostEvents = [];
    
    hostSocket.on('connect', () => {
      hostEvents.push('connected');
      hostSocket.emit('join_room', lobby.code);
    });
    
    hostSocket.on('lobby_state', (data) => {
      hostEvents.push(`lobby_state: ${data.players.length} players`);
    });
    
    hostSocket.on('player_join', (data) => {
      hostEvents.push(`player_join: ${data.name}`);
    });
    
    // Wait for host connection
    await sleep(500);
    
    // Host joins lobby
    await apiCall('/api/lobby/join', {
      code: lobby.code,
      name: 'Host'
    });
    
    // Create joining player socket AFTER HTTP join
    const playerSocket = createSocketConnection();
    const playerEvents = [];
    
    playerSocket.on('connect', () => {
      playerEvents.push('connected');
      playerSocket.emit('join_room', lobby.code);
    });
    
    playerSocket.on('lobby_state', (data) => {
      playerEvents.push(`lobby_state: ${data.players.length} players`);
    });
    
    playerSocket.on('player_join', (data) => {
      playerEvents.push(`player_join: ${data.name}`);
    });
    
    // Player joins lobby via HTTP
    await apiCall('/api/lobby/join', {
      code: lobby.code,
      name: 'JoiningPlayer'
    });
    
    // Wait for socket connection and events
    await sleep(1000);
    
    log(`Host events: ${hostEvents.join(', ')}`);
    log(`Player events: ${playerEvents.join(', ')}`);
    
    // Verify both sockets received the lobby state
    if (!hostEvents.some(e => e.includes('lobby_state'))) {
      throw new Error('Host did not receive lobby_state');
    }
    
    if (!playerEvents.some(e => e.includes('lobby_state'))) {
      throw new Error('Joining player did not receive lobby_state');
    }
    
    // Verify joining player sees the current lobby state (2 players)
    const playerLobbyState = playerEvents.find(e => e.includes('lobby_state'));
    if (!playerLobbyState.includes('2 players')) {
      throw new Error('Joining player did not see correct lobby state');
    }
    
    // Cleanup
    hostSocket.disconnect();
    playerSocket.disconnect();
    
    log('Socket synchronization test passed');
  });

  return suite.summary();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2ETests()
    .then(summary => {
      console.log('\n🎮 E2E Tests Complete!');
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ E2E test suite failed:', error);
      process.exit(1);
    });
}

export { runE2ETests };
