const https = require('https');
https.get('https://movieapi.xcasper.space/api/detail?subjectId=5154075108704669480', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log("Images array exists:", !!json.data.subject.imageList);
    if (json.data.subject.imageList) console.log("Images count:", json.data.subject.imageList.length);
    console.log("First image type:", json.data.subject.imageList?.[0]);
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
