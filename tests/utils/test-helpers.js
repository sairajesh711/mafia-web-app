// Test utilities for the Mafia game tests
const { io } = require('socket.io-client');
const fetch = require('node-fetch').default;

const API_BASE = 'http://localhost:3000';

async function apiCall(endpoint, data = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API call failed: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createSocketConnection() {
  return io(API_BASE, {
    transports: ['websocket', 'polling']
  });
}

function log(message, category = 'TEST') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
}

class TestSuite {
  constructor(name) {
    this.name = name;
    this.results = [];
    this.startTime = Date.now();
  }

  async test(testName, testFn) {
    try {
      log(`Starting: ${testName}`, this.name);
      const start = Date.now();
      await testFn();
      const duration = Date.now() - start;
      this.results.push({ name: testName, status: 'PASS', duration });
      log(`✅ PASS: ${testName} (${duration}ms)`, this.name);
    } catch (error) {
      const duration = Date.now() - this.startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name: testName, status: 'FAIL', error: errorMessage, duration });
      log(`❌ FAIL: ${testName} - ${errorMessage}`, this.name);
      throw error;
    }
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = total - passed;
    const totalDuration = Date.now() - this.startTime;

    log(`\n📊 ${this.name} Summary:`, 'SUMMARY');
    log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`, 'SUMMARY');
    log(`Total time: ${totalDuration}ms`, 'SUMMARY');
    
    return { total, passed, failed, totalDuration, results: this.results };
  }
}

module.exports = {
  apiCall,
  sleep,
  createSocketConnection,
  log,
  TestSuite
};
