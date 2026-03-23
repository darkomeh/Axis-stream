import { HomepageData, ItemDetails, MediaData, MediaItem } from "./types";

const getApiBase = () => {
  return '/api';
};

const getFullUrl = (endpoint: string, params: Record<string, string | number> = {}) => {
  const base = getApiBase();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  
  const queryString = searchParams.toString();
  return `${base}${path}${queryString ? `?${queryString}` : ''}`;
};

function mapMediaItem(item: any): MediaItem | null {
  if (!item) return null;
  const id = item.subjectId || item.id;
  if (!id) return null;
  
  return {
    id: String(id),
    title: item.title || "Unknown Title",
    poster: item.cover?.url || item.poster || "",
    rating: item.imdbRatingValue || item.rating,
    type: item.subjectType === 2 ? "Series" : item.subjectType === 1 ? "Movie" : item.type,
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
    quality: item.quality,
    detailPath: item.detailPath
  };
}

function mapAndDeduplicate(list: any[]): MediaItem[] {
  if (!Array.isArray(list)) return [];
  const mapped = list.map(mapMediaItem).filter(Boolean) as MediaItem[];
  const seen = new Set();
  return mapped.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

export async function fetchHomepage(): Promise<HomepageData> {
  const url = getFullUrl('homepage');
  console.log(`[API] Fetching homepage: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[API] Homepage error: ${res.status} ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to fetch homepage: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const data = json.data || {};
  
  return {
    topPickList: data.topPickList || [],
    homeList: data.homeList || [],
    latestMovies: data.latestMovies || [],
    latestSeries: data.latestSeries || [],
    operatingList: data.operatingList || []
  };
}

export async function fetchTrending(): Promise<MediaItem[]> {
  const url = getFullUrl('trending');
  console.log(`[API] Fetching trending: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[API] Trending error: ${res.status} ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to fetch trending: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchHotMoviesSeries(): Promise<{ movies: MediaItem[], series: MediaItem[] }> {
  const url = getFullUrl('hot');
  console.log(`[API] Fetching hot movies/series: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[API] Hot movies/series error: ${res.status} ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to fetch hot movies and series: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const data = json.data || {};
  
  return { 
    movies: data.movies || [], 
    series: data.series || [] 
  };
}

export async function searchMedia(query: string, page = 1, perPage = 30, subjectType = 0): Promise<MediaItem[]> {
  if (!query || !query.trim()) return [];
  const url = getFullUrl('search', { keyword: query, page, perPage, subjectType });
  console.log(`[API] Searching: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API] Search error: ${res.status} ${res.statusText}`);
    throw new Error("Failed to search");
  }
  const json = await res.json();
  return json.data || [];
}

export const searchItems = searchMedia;

export async function fetchPopularSearches(): Promise<string[]> {
  const url = getFullUrl('popular-search');
  console.log(`[API] Fetching popular searches: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API] Popular searches error: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch popular searches");
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchItemDetails(subjectId: string): Promise<ItemDetails> {
  const url = getFullUrl('detail', { subjectId });
  console.log(`[API] Fetching item details: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API] Item details error: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch item details");
  }
  const json = await res.json();
  
  if (!json.success || !json.data) {
    throw new Error("Invalid details data");
  }
  
  const data = json.data;
  
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    poster: data.poster || "",
    background: data.background || data.poster || "",
    rating: data.rating,
    year: data.year,
    genres: data.genres || [],
    cast: data.cast || [],
    type: data.type,
    duration: data.duration,
    detailPath: data.detailPath,
    seasons: data.seasons,
    trailerUrl: (typeof data.trailerUrl === 'string' ? data.trailerUrl : data.trailerUrl?.url) || 
                (typeof data.trailer === 'string' ? data.trailer : data.trailer?.url) || ""
  };
}

export async function fetchRecommendations(subjectId: string): Promise<MediaItem[]> {
  const url = getFullUrl('recommend', { subjectId });
  console.log(`[API] Fetching recommendations: ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API] Recommendations error: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch recommendations");
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchSuggestions(query: string): Promise<string[]> {
  if (!query || !query.trim()) return [];
  const url = getFullUrl('search/suggest', { keyword: query });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  const json = await res.json();
  return json.data || [];
}

export async function fetchActorDetails(staffId: string): Promise<any> {
  const url = getFullUrl('staff/detail', { staffId });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch actor details");
  const json = await res.json();
  return json.data || {};
}

export async function fetchActorWorks(staffId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
  const url = getFullUrl('staff/works', { staffId, page, perPage });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch actor works");
  const json = await res.json();
  return json.data || [];
}

export async function fetchRichDetails(subjectId: string): Promise<any> {
  const url = getFullUrl('rich-detail', { subjectId });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch rich details");
  const json = await res.json();
  return json.data || {};
}

export async function fetchCaptions(subjectId: string, streamId: string): Promise<any> {
  const url = getFullUrl('captions', { subjectId, streamId });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch captions");
  const json = await res.json();
  return json.data || [];
}

export async function fetchRelatedActors(staffId: string): Promise<any[]> {
  const url = getFullUrl('staff/related', { staffId });
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch related actors");
  const json = await res.json();
  return json.data || [];
}

export async function fetchLiveStreams(): Promise<any[]> {
  const url = getFullUrl('live');
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error("Failed to fetch live streams");
  const json = await res.json();
  return json.data || [];
}

export async function fetchMedia(
  subjectId: string,
  _detailPath: string,
  season: number = 0,
  episode: number = 0,
  _isTv: boolean = false
): Promise<MediaData> {
  const params: any = { subjectId };
  if (season > 0) params.season = season;
  if (episode > 0) params.episode = episode;

  const url = getFullUrl('play', params);
  
  console.log(`[API] Fetching media: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[API] Media error: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch media");
  }
  const json = await res.json();
  
  if (!json.success || !json.data) {
    throw new Error(`Failed to fetch media: ${json.error || "Unknown error"}`);
  }

  const { sources, subtitles } = json.data;
  
  if (!sources || sources.length === 0) {
    throw new Error("No sources found for this media");
  }

  return { sources, subtitles: subtitles || [] };
}
