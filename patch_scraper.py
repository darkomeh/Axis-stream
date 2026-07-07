import re
with open('backend/services/matchScraper.ts', 'r') as f:
    content = f.read()

fixed = content.replace('timeout: config.REQUEST_TIMEOUT', 'timeout: config.REQUEST_TIMEOUT, responseType: "text", transformResponse: [(data) => data]')

with open('backend/services/matchScraper.ts', 'w') as f:
    f.write(fixed)
