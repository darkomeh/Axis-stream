 

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/sport/feeds');
    const data = await res.json();
    console.log('Success:', data.success);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
