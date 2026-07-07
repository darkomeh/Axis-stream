function isUrlAllowed(reqUrl) {
  try {
    const parsed = new URL(reqUrl);
    
    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block common internal IPs and loopback (Basic SSRF protection)
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    if (hostname.startsWith('10.')) return false;
    if (hostname.startsWith('192.168.')) return false;
    if (hostname.startsWith('169.254.')) return false; // Cloud Metadata
    if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return false; // Private network
    
    return true;
  } catch {
    return false;
  }
}
console.log(isUrlAllowed("https://live-pull.aisports.mobi/moviebox/device01/playlist.m3u8?sign=6795d817e6dc8942ad9be8f4624098f5&t=1783180908"));
