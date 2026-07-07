import requests

STREAM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Referer": "https://sportslivetoday.com/",
    "Origin": "https://sportslivetoday.com",
    "Connection": "keep-alive",
}

resp = requests.get("https://sportslivetoday.com/_payload.json?live&sportType=football")
if resp.status_code == 200:
    import json
    data = resp.json()
    print("Fetched payload")
    
    # Just grab the first stream and try hitting it
    # I'll just use the parsing logic to find a stream url
    def find_stream(payload):
        for item in payload:
            if isinstance(item, dict) and "playPath" in item and item["playPath"]:
                return item["playPath"]
        return None
        
    url = find_stream(data)
    if url:
        print("Found URL:", url)
        resp2 = requests.get(url, headers=STREAM_HEADERS)
        print("Stream status:", resp2.status_code)
        print("Body preview:", resp2.text[:200])
    else:
        print("No stream found")
