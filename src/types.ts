export interface MediaItem {
  id: string;
  title: string;
  poster?: string;
  rating?: string;
  contentRating?: string;
  type?: string | number;
  category?: string;
  year?: string;
  quality?: string;
  detailPath?: string;
  genres?: string[];
  description?: string;
  avgHueDark?: string;
}

export interface HomepageSection {
  title: string;
  items: MediaItem[];
}

export interface HomepageData {
  topPickList?: MediaItem[];
  homeList?: MediaItem[];
  latestMovies?: MediaItem[];
  latestSeries?: MediaItem[];
  operatingList?: any[];
}

export interface ItemDetails {
  id: string;
  title: string;
  description: string;
  poster: string;
  background?: string;
  rating?: string;
  contentRating?: string;
  year?: string;
  genres?: string[];
  cast?: { id: string; name: string; character?: string; avatar?: string; avatarUrl?: string }[];
  type?: string | number;
  duration?: string;
  detailPath?: string;
  imdbRatingValue?: string;
  releaseDate?: string;
  subtitles?: string;
  images?: string[];
  avgHueDark?: string;
  trailer?: {
    videoAddress: {
      url: string;
      duration?: number;
      width?: number;
      height?: number;
    };
    cover: {
      url: string;
    };
  };
  seasons?: {
    se: number;
    maxEp: number;
    resolutions: { resolution: number; epNum: number }[];
  }[];
  trailerUrl?: string;
  sources?: MediaSource[];
}

export interface MediaSource {
  quality: string;
  url: string;
  type?: 'hls' | 'mp4';
  downloadUrl?: string;
  downloadType?: 'hls' | 'mp4';
}

export interface MediaData {
  id?: string;
  sources: MediaSource[];
  subtitles?: { language: string; url: string }[];
  embedUrl?: string;
  embedCode?: string;
  type?: string;
  tmdbId?: string;
  audioTracks?: { language: string; languageCode: string; subjectId: string; detailPath: string }[];
  initialTime?: number;
  vidsrcServers?: any[];
  isBackup?: boolean;
}

export interface Actor {
  id: string;
  name: string;
  avatar: string;
  avatarUrl?: string;
  description?: string;
  birthday?: string;
  birthPlace?: string;
  popularity?: string;
  biography?: string;
}

export interface RankingItem {
  id: string;
  title: string;
  cover: string;
  poster?: string;
  score?: string;
  rating?: string;
  rank: number;
  type?: number | string;
  category?: string;
  year?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  watchlist: string[];
  history: { id: string; title: string; poster: string }[];
}

export function formatDurationToHours(val: string | undefined | null): string {
  if (!val) return "";
  const clean = val.toLowerCase().trim();
  
  if (clean.includes("hour") || clean.includes("hr") || clean.includes(":")) {
    return val;
  }
  
  // Parse formats like "2h 45m", "1h 30min"
  const hMatch = clean.match(/(\d+)\s*h/);
  const mMatch = clean.match(/(\d+)\s*(m|min)/);
  
  let totalMinutes = 0;
  if (hMatch) {
    totalMinutes += parseInt(hMatch[1], 10) * 60;
  }
  if (mMatch) {
    totalMinutes += parseInt(mMatch[1], 10);
  }
  
  // If we couldn't parse with h and m, check if it's just raw minutes (e.g. "120", "106 min", "120mins")
  if (totalMinutes === 0) {
    const onlyDigits = clean.match(/^(\d+)$/) || clean.match(/^(\d+)\s*(min|mins|m)$/);
    if (onlyDigits) {
      totalMinutes = parseInt(onlyDigits[1], 10);
    } else {
      // Fallback: extract the first number found and assume it's minutes
      const anyDigit = clean.match(/(\d+)/);
      if (anyDigit) {
        totalMinutes = parseInt(anyDigit[1], 10);
      }
    }
  }
  
  if (totalMinutes > 0) {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs > 0 && mins > 0) {
      return `${hrs} hr ${mins} min`;
    } else if (hrs > 0) {
      return `${hrs} hr`;
    } else {
      return `${mins} min`;
    }
  }
  
  return val;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
