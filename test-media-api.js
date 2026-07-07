async function test() {
  const url = "https://gzmovieboxapi.vercel.app/api/media?subjectId=1216407338207298384&detailPath=one-piece-netflix-qL3bmkP9Rr1&apikey=Godszeal";
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
