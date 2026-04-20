export interface SubtitleItem {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export function parseSRT(srt: string): SubtitleItem[] {
  const items: SubtitleItem[] = [];
  const blocks = srt.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0]);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        const startTime = timeToSeconds(timeMatch[1]);
        const endTime = timeToSeconds(timeMatch[2]);
        const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, ''); // Remove HTML tags
        
        items.push({ id, startTime, endTime, text });
      }
    }
  }

  return items;
}

function timeToSeconds(time: string): number {
  const [hours, minutes, secondsAndMs] = time.split(':');
  const [seconds, ms] = secondsAndMs.split(',');
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(ms) / 1000
  );
}
