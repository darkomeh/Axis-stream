export interface SubtitleItem {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export function parseSRT(data: string): SubtitleItem[] {
  const items: SubtitleItem[] = [];
  // Remove WEBVTT header if present
  let cleanData = data.replace(/^WEBVTT\s*\n*/, '');
  
  // Split by double newline to get blocks
  const blocks = cleanData.trim().split(/\n\s*\n/);

  let idCounter = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    
    // Time regex handles both SRT (00:00:00,000) and VTT (00:00:00.000 or 00:00.000)
    const timeRegex = /(?:([0-9]{2,}:)?[0-9]{2}:[0-9]{2}[,.]\d{3})\s*-->\s*(?:([0-9]{2,}:)?[0-9]{2}:[0-9]{2}[,.]\d{3})/;
    
    if (timeRegex.test(lines[timeLineIndex])) {
      // time line is the first line
    } else if (lines.length > 1 && timeRegex.test(lines[1])) {
      // ID is the first line, time line is the second
      timeLineIndex = 1;
    } else {
      continue; // neither first nor second line has time, skip
    }

    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split(/\s*-->\s*/);
    
    if (timeParts.length === 2) {
      const startTime = timeToSeconds(timeParts[0]);
      const endTime = timeToSeconds(timeParts[1]);
      
      const textLines = lines.slice(timeLineIndex + 1);
      // Remove HTML tags (e.g. <b>, <i>, <v Speaker>)
      const text = textLines.join('\n').replace(/<[^>]*>/g, ''); 
      
      if (text) {
        items.push({ id: idCounter++, startTime, endTime, text });
      }
    }
  }

  return items;
}

function timeToSeconds(time: string): number {
  // Normalize comma to dot for parsing
  const parts = time.replace(',', '.').split(':');
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  } else {
    seconds = parseFloat(parts[0]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}
