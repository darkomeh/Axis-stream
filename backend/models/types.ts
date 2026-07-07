export interface PeriodScore {
  name: string;
  home: number;
  away: number;
}

export interface Odd {
  type: string;
  value: string;
}

export interface StreamItem {
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
  period_scores: PeriodScore[];
  odds: Odd[];
  highlights: any[];
  scraped_at: string;
}

export interface StreamValidationResult {
  status: "ONLINE" | "OFFLINE" | "UNKNOWN" | "BLOCKED" | "TIMEOUT" | "ERROR";
  reason?: string;
  latency?: number;
  quality?: string;
  speed?: number;
  url?: string;
}
