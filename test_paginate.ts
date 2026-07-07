(async () => {
  const staffId = "5091059898294095544"; // Tom Cruise
  const res2 = await fetch(`https://movieapi.xcasper.space/api/staff/works?staffId=${staffId}&page=1&perPage=24`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const data = await res2.json();
  const items = data.data.items || [];
  for (const item of items) {
    console.log(item.subjectId, item.title);
  }
})();
