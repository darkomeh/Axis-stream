async function testHomepage() {
  try {
    const res = await fetch('http://localhost:3000/api/homepage');
    console.log('Homepage status:', res.status);
    const data = await res.json();
    console.log('Homepage data keys:', Object.keys(data));
  } catch (error) {
    console.error('Homepage failed:', error.message);
  }
}

testHomepage();
