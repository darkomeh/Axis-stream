import re
with open('src/pages/Sports.tsx', 'r') as f:
    content = f.read()

fixed = re.sub(r'<LiveTVPlayer.*?\/>', '''<LiveTVPlayer
            url={selectedStream.url}
            name={selectedStream.title}
            logo=""
            description="Live Sports Stream"
            currentProgram={selectedStream.title}
            onBack={() => setSelectedStream(null)}
          />''', content, flags=re.DOTALL)

with open('src/pages/Sports.tsx', 'w') as f:
    f.write(fixed)
