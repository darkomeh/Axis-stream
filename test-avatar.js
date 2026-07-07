async function test() {
  const url = "https://gzmovieboxapi.vercel.app/api/search?query=Avatar&apikey=Godszeal";
  const res = await fetch(url);
  const data = await res.json();
  const item = data.data.items[0];
  console.log("Item:", item.title, item.subjectId, item.detailPath);
  
  const mediaUrl = `https://gzmovieboxapi.vercel.app/api/media?subjectId=${item.subjectId}&detailPath=${item.detailPath}&apikey=Godszeal`;
  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json();
  console.log("Media Data:", JSON.stringify(mediaData, null, 2));
}
test();
