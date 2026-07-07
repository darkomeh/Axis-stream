import fs from 'fs';
const path = 'src/types.ts';
let code = fs.readFileSync(path, 'utf8');

const regexToReplace = /export interface Match \{[\s\S]*?scraped_at: string;\n\}/;

const replacement = `export interface StreamItem {
  name: string;
  url: string;
  type: string;
  quality: string;
  status?: string;
  latency?: number;
  speed?: number;
}

export interface Match {
  id: string;
  sport_type: string;
  league: string;
  round: string;
  home_team: string;
  home_abbr?: string;
  home_logo?: string;
  away_team: string;
  away_abbr?: string;
  away_logo?: string;
  home_score: string;
  away_score: string;
  status: string;
  raw_status: string;
  status_live: string | number;
  start_time?: string;
  m3u8_url: string | null;
  channels: Record<string, string>;
  streams: StreamItem[];
  period_scores: any[];
  odds: any[];
  highlights: any[];
  scraped_at: string;
}`;

code = code.replace(regexToReplace, replacement);

fs.writeFileSync(path, code);
console.log("Patched types");
