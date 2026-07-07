import re
with open('payload.json', 'r') as f:
    content = f.read()

matches = re.finditer(r'.{0,500}"MatchNotStart".{0,100}m3u8.{0,100}', content)
for m in matches:
    print(m.group(0))
    print("-----")
    break
