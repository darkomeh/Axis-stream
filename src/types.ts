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
  sources: MediaSource[];
  subtitles?: { language: string; url: string }[];
  embedUrl?: string;
  embedCode?: string;
  type?: string;
  tmdbId?: string;
  audioTracks?: { language: string; languageCode: string; subjectId: string; detailPath: string }[];
  initialTime?: number;
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
