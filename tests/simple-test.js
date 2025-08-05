// Simple test to verify setup
console.log('🧪 Testing basic functionality...');

async function simpleTest() {
  try {
    console.log('Testing API connection...');
    
    const response = await fetch('http://localhost:3000/api/lobby/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API working! Lobby code:', data.code);
    } else {
      console.log('❌ API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleTest();
