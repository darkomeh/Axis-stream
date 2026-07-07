const str1 = '"3112302396081426312","Morocco","https://pbcdn.aoneroom.com/image/2026/04/22/c1f4bd1e2e66174f4ba2da176d1c7aba.png"';
const str2 = '"6388178550226672312","Canada","0","https://pbcdn.aoneroom.com/image/2026/04/22/b76571bc16872d1ffb8dd56611a2ffdb.png"';

const regex = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;

console.log(regex.exec(str1));
regex.lastIndex = 0;
console.log(regex.exec(str2));
