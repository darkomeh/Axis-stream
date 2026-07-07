const fs = require('fs');
const content = fs.readFileSync('src/pages/Sports.tsx', 'utf8');
const fixed = content.replace(/<LiveTVPlayer[\s\S]*?\/>/, `<LiveTVPlayer
            url={selectedStream.url}
            name={selectedStream.title}
            logo=""
            description="Live Sports Stream"
            currentProgram={selectedStream.title}
            onBack={() => setSelectedStream(null)}
          />`);
fs.writeFileSync('src/pages/Sports.tsx', fixed);
