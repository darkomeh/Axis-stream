async function testHealth() {
  try {
    const res = await fetch('http://localhost:3000/api/health');
    console.log('Health check status:', res.status);
    const data = await res.json();
    console.log('Health check data:', data);
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

testHealth();
