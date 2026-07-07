import re
with open('payload.json', 'r') as f:
    content = f.read()

matches = re.finditer(r'({[^}]*?})?,"Match(NotStart|Ended|Ing|NotSt|End)",.*?(https?://[^",\\]+\.m3u8[^",\\]*)', content)
for m in matches:
    print(m.group(0))
    print("-----")
