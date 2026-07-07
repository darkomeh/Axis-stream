export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  status: string;
  m3u8_url: string | null;
  channels: Record<string, string>;
  scraped_at: string;
}

export interface StreamValidationResult {
  status: "LIVE" | "OFFLINE" | "UNKNOWN";
  reason?: string;
  note?: string;
  segment_url?: string;
  content_type?: string;
  segment_size?: string;
}
