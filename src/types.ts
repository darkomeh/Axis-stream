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
  duration?: string | number;
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
  imdbRatingVotes?: string;
  country?: string;
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
  forceIframe?: boolean;
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
  
  if (clean.includes(":")) {
    return val;
  }
  
  // Try to extract pure numbers first to prevent "85hr" returning directly when it actually means 85 minutes
  const numericOnly = clean.match(/^(\d+)\s*(min|mins|m|hr|hrs|h|hours)?$/);
  let totalMinutes = 0;
  
  if (numericOnly) {
    const num = parseInt(numericOnly[1], 10);
    // If it says "hr" or "h" but the number is huge (>10), it's probably actually minutes
    if (numericOnly[2] === "m" || numericOnly[2] === "min" || numericOnly[2] === "mins" || num > 20 || !numericOnly[2]) {
      totalMinutes = num;
    } else {
      totalMinutes = num * 60; // it actually is hours (e.g., "2 hr")
    }
  } else {
    // Parse formats like "2h 45m", "1h 30min"
    const hMatch = clean.match(/(\d+)\s*h/);
    const mMatch = clean.match(/(\d+)\s*(m|min)/);
    
    if (hMatch) {
      totalMinutes += parseInt(hMatch[1], 10) * 60;
    }
    if (mMatch) {
      totalMinutes += parseInt(mMatch[1], 10);
    }
    
    if (totalMinutes === 0) {
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

export interface LiveChannel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  description: string;
  currentProgram?: string;
  country?: string;
  views?: number;
}

