// Master test runner for all Mafia game tests
import { TestSuite, apiCall, sleep, log } from './utils/test-helpers.js';

async function runAllTests() {
  log('🎭 Starting Mafia Game Test Suite', 'MASTER');
  const allResults = [];

  // API Tests
  try {
    log('Running API tests...', 'MASTER');
    const apiResults = await runApiTests();
    allResults.push({ suite: 'API', ...apiResults });
  } catch (error) {
    log(`API tests failed: ${error.message}`, 'MASTER');
    allResults.push({ suite: 'API', total: 0, passed: 0, failed: 1, error: error.message });
  }

  // Role Assignment Tests  
  try {
    log('Running role assignment tests...', 'MASTER');
    const roleResults = await runRoleTests();
    allResults.push({ suite: 'ROLES', ...roleResults });
  } catch (error) {
    log(`Role tests failed: ${error.message}`, 'MASTER');
    allResults.push({ suite: 'ROLES', total: 0, passed: 0, failed: 1, error: error.message });
  }

  // Socket Integration Tests
  try {
    log('Running socket integration tests...', 'MASTER');
    const socketResults = await runSocketTests();
    allResults.push({ suite: 'SOCKETS', ...socketResults });
  } catch (error) {
    log(`Socket tests failed: ${error.message}`, 'MASTER');
    allResults.push({ suite: 'SOCKETS', total: 0, passed: 0, failed: 1, error: error.message });
  }

  // Print final summary
  printFinalSummary(allResults);
  
  const totalFailed = allResults.reduce((sum, result) => sum + result.failed, 0);
  return totalFailed === 0;
}

async function runApiTests() {
  const suite = new TestSuite('API');

  await suite.test('Create Lobby', async () => {
    const result = await apiCall('/api/lobby/create');
    if (!result.code || result.code.length !== 6) {
      throw new Error('Invalid lobby code format');
    }
    log(`Lobby created with code: ${result.code}`);
  });

  await suite.test('Join and Start Game', async () => {
    const lobby = await apiCall('/api/lobby/create');
    
    // Add 5 players
    for (let i = 1; i <= 5; i++) {
      await apiCall('/api/lobby/join', {
        code: lobby.code,
        name: `Player${i}`
      });
    }
    
    const result = await apiCall('/api/lobby/start', { code: lobby.code });
    if (!result.roles || Object.keys(result.roles).length !== 5) {
      throw new Error('Invalid role assignment');
    }
  });

  await suite.test('Custom Mafia Count', async () => {
    const lobby = await apiCall('/api/lobby/create');
    
    // Add 6 players
    for (let i = 1; i <= 6; i++) {
      await apiCall('/api/lobby/join', {
        code: lobby.code,
        name: `Player${i}`
      });
    }
    
    // Set custom mafia count
    await apiCall('/api/lobby/mafia-count', {
      code: lobby.code,
      mafiaCount: 2
    });
    
    const gameResult = await apiCall('/api/lobby/start', { code: lobby.code });
    const mafiaCount = Object.values(gameResult.roles).filter(r => r === 'mafia').length;
    
    if (mafiaCount !== 2) {
      throw new Error(`Expected 2 mafia, got ${mafiaCount}`);
    }
  });

  return suite.summary();
}

async function runRoleTests() {
  const suite = new TestSuite('ROLES');

  const testCases = [
    { players: 5, expectedMafia: 1, expectedDoctor: 1, expectedPolice: 1, expectedVillager: 2 },
    { players: 6, expectedMafia: 1, expectedDoctor: 1, expectedPolice: 1, expectedVillager: 3 },
    { players: 8, expectedMafia: 2, expectedDoctor: 1, expectedPolice: 1, expectedVillager: 4 },
    { players: 10, expectedMafia: 2, expectedDoctor: 1, expectedPolice: 1, expectedVillager: 6 }
  ];

  for (const testCase of testCases) {
    await suite.test(`${testCase.players} Players Role Distribution`, async () => {
      const lobby = await apiCall('/api/lobby/create');
      
      // Add players
      for (let i = 1; i <= testCase.players; i++) {
        await apiCall('/api/lobby/join', {
          code: lobby.code,
          name: `Player${i}`
        });
      }
      
      const gameResult = await apiCall('/api/lobby/start', { code: lobby.code });
      const roles = Object.values(gameResult.roles);
      
      const roleCount = {
        mafia: roles.filter(r => r === 'mafia').length,
        doctor: roles.filter(r => r === 'doctor').length,
        police: roles.filter(r => r === 'police').length,
        villager: roles.filter(r => r === 'villager').length
      };
      
      if (roleCount.mafia !== testCase.expectedMafia ||
          roleCount.doctor !== testCase.expectedDoctor ||
          roleCount.police !== testCase.expectedPolice ||
          roleCount.villager !== testCase.expectedVillager) {
        throw new Error(`Invalid distribution for ${testCase.players} players: ${JSON.stringify(roleCount)}`);
      }
      
      log(`${testCase.players} players: ${JSON.stringify(roleCount)} ✓`);
    });
  }

  return suite.summary();
}

async function runSocketTests() {
  const suite = new TestSuite('SOCKETS');

  await suite.test('Basic Socket Connection', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 5000);

      try {
        const socket = io('http://localhost:3000');
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.disconnect();
          log('Socket connection successful');
          resolve();
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Socket connection failed: ${error.message}`));
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });

  await suite.test('Socket Room Join and Lobby State', async () => {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket test timeout'));
      }, 10000);

      try {
        // Create lobby and add a player
        const lobby = await apiCall('/api/lobby/create');
        await apiCall('/api/lobby/join', {
          code: lobby.code,
          name: 'TestPlayer'
        });

        const socket = io('http://localhost:3000');
        let receivedLobbyState = false;

        socket.on('connect', () => {
          socket.emit('join_room', lobby.code);
        });

        socket.on('lobby_state', (data) => {
          if (data.players && data.players.length === 1) {
            receivedLobbyState = true;
            clearTimeout(timeout);
            socket.disconnect();
            log('Socket lobby state sync working');
            resolve();
          }
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Socket error: ${error.message}`));
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });

  return suite.summary();
}

function printFinalSummary(results) {
  log('\n📊 FINAL TEST SUMMARY', 'SUMMARY');
  log('═══════════════════════════════════', 'SUMMARY');
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  results.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    log(`${status} ${result.suite}: ${result.passed}/${result.total} passed`, 'SUMMARY');
    
    totalTests += result.total;
    totalPassed += result.passed;
    totalFailed += result.failed;
  });
  
  log('───────────────────────────────────', 'SUMMARY');
  log(`🎯 OVERALL: ${totalPassed}/${totalTests} tests passed`, 'SUMMARY');
  
  if (totalFailed === 0) {
    log('🎉 ALL TESTS PASSED! Game is ready.', 'SUMMARY');
  } else {
    log(`⚠️  ${totalFailed} tests failed. Check logs above.`, 'SUMMARY');
  }
}

// Import socket.io for socket tests
import { io } from 'socket.io-client';

// Run all tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { runAllTests };
