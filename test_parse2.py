import re
with open('payload.json', 'r') as f:
    content = f.read()

matches = re.finditer(r'.{0,300}\.m3u8.{0,300}', content)
for m in matches:
    print(m.group(0))
    print("-----")
    break
