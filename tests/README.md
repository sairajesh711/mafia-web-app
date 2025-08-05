# Test Suite Documentation

## 📁 Test Structure

```
tests/
├── utils/
│   └── test-helpers.ts     # Common test utilities and helpers
├── api/
│   └── api.test.js         # API endpoint tests
├── e2e/
│   └── game-flow.test.js   # End-to-end game flow tests
├── unit/                   # Unit tests (future)
├── integration/            # Integration tests (future)
└── run-all-tests.js        # Master test runner
```

## 🧪 Current Test Coverage

### ✅ API Tests (`tests/api/api.test.js`)
- ✅ Lobby creation with valid codes
- ✅ Player joining lobbies  
- ✅ Multiple players joining same lobby
- ✅ Game starting with role assignment
- ✅ Custom mafia count functionality
- ✅ Locked lobby protection

### ✅ Role Assignment Tests (in `run-all-tests.js`)
- ✅ 5 players: 1 mafia, 1 doctor, 1 police, 2 villagers
- ✅ 6 players: 1 mafia, 1 doctor, 1 police, 3 villagers  
- ✅ 8 players: 2 mafia, 1 doctor, 1 police, 4 villagers
- ✅ 10 players: 2 mafia, 1 doctor, 1 police, 6 villagers

### ✅ Socket.IO Tests (in `run-all-tests.js`)
- ✅ Basic socket connection
- ✅ Room joining and lobby state synchronization
- ✅ Player join event broadcasting
- ✅ Game start event distribution

## 🚀 Running Tests

### Run All Tests
```bash
# Make sure both servers are running first
pnpm run dev:all

# In another terminal:
node tests/run-all-tests.js
```

### Run Individual Test Suites
```bash
# API tests only
node tests/api/api.test.js

# E2E tests only  
node tests/e2e/game-flow.test.js
```

## 📋 Test Results Analysis

### What Tests Cover
1. **Server API Functionality**: All REST endpoints work correctly
2. **Role Distribution Logic**: Proper game balance across player counts
3. **Socket.IO Communication**: Real-time features work as expected
4. **Error Handling**: Proper validation and error responses
5. **Game State Management**: Lobby locking, player tracking, etc.

### What's NOT Tested (Future Work)
1. **Frontend Components**: Svelte component unit tests
2. **Service Layer**: Tests for the refactored service classes
3. **UI Interactions**: Automated browser testing
4. **Performance**: Load testing with many concurrent players
5. **Error Edge Cases**: Network failures, malformed requests
6. **Security**: Input validation, CORS policy testing

## 🔧 Test Infrastructure

### Test Helpers (`tests/utils/test-helpers.ts`)
- **TestSuite class**: Organized test execution with timing and results
- **apiCall()**: Standardized API request helper with error handling
- **createSocketConnection()**: Socket.IO client setup
- **sleep()**: Async delays for timing-sensitive tests
- **log()**: Consistent test logging with timestamps

### Key Features
- ✅ **Type Safety**: TypeScript support for better test reliability
- ✅ **Error Handling**: Proper error catching and reporting
- ✅ **Timing Control**: Built-in delays for async operations
- ✅ **Result Aggregation**: Comprehensive test result summaries
- ✅ **Isolated Tests**: Each test creates its own lobby/game state

## 🎯 Test Status After Refactoring

### ✅ Updated for New Architecture
- All tests now work with the refactored service layer
- Tests use proper TypeScript types where applicable
- Socket.IO synchronization issues are specifically tested
- CORS functionality is validated

### ❌ Removed Outdated Tests
- Deleted old `test-*.js` files from root directory
- Removed hardcoded API URLs
- Eliminated duplicate/redundant test scenarios
- Cleaned up inconsistent test patterns

## 📊 Current Test Results
The test suite validates that:

1. **Game Creation & Joining Works**: Players can create and join lobbies
2. **Role Assignment is Balanced**: Proper mafia/villager ratios
3. **Socket Synchronization is Fixed**: Joining players see current game state  
4. **Custom Game Settings Work**: Host can adjust mafia count
5. **Game State Protection Works**: Can't join locked/started games

All tests are designed to work with the current server running on `localhost:3000` and validate the functionality you've been testing manually in the browser.

## 🔮 Next Steps

1. **Add Service Layer Tests**: Unit tests for the new TypeScript services
2. **Frontend Component Tests**: Svelte component testing with testing-library
3. **Browser Automation**: Playwright/Cypress for full UI testing  
4. **Performance Testing**: Load testing with multiple concurrent games
5. **Security Testing**: Input validation and security boundary testing
