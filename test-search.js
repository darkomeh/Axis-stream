async function test() {
  const url = "https://gzmovieboxapi.vercel.app/api/search?query=One%20Piece&apikey=Godszeal";
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.data.items[0], null, 2));
}
test();
