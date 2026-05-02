import axios, { AxiosRequestConfig } from 'axios';
import { 
  MediaItem, 
  HomepageData, 
  ItemDetails, 
  MediaData, 
  Actor, 
  RankingItem 
} from '../types';

const BASE_URL = 'https://movieapi.xcasper.space/api';
const API_KEY = 'Godszeal';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Referer': 'https://movieapi.xcasper.space/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 8000 // Slightly shorter timeout to react faster
});

// Server-side cache for external data
const serverCache = new Map<string, { data: any, timestamp: number }>();
const negativeCache = new Map<string, { timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for success
const NEGATIVE_TTL = 2 * 60 * 1000; // 2 minute "don't retry" for failure

// Helper for exponential backoff retry with jitter
async function fetchWithRetry(config: AxiosRequestConfig, retries = 2, backoff = 500): Promise<any> {
  const cacheKey = `${config.url}?${new URLSearchParams(config.params || {}).toString()}`;
  
  // Check successful cache first
  const cached = serverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Check negative cache (recent failures)
  const failed = negativeCache.get(cacheKey);
  const currentTTL = cacheKey.includes('/staff/') ? NEGATIVE_TTL * 5 : NEGATIVE_TTL;
  if (failed && Date.now() - failed.timestamp < currentTTL) {
    throw new Error('Service recently failed for this resource; skip retry to protect upstream.');
  }

  try {
    // Add API Key to params
    config.params = { ...config.params, apikey: API_KEY };
    const response = await api(config);
    
    // Clear failure mark if it succeeded
    negativeCache.delete(cacheKey);
    // Cache successful response
    serverCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    return response;
  } catch (error: any) {
    const isRetryable = !error.response || (error.response.status >= 500 && error.response.status <= 504);
    
    if (retries > 0 && isRetryable) {
      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const delay = backoff + jitter;
      
      // Only log if it's not a common failure endpoint or if it's the last retry
      const isNoisy = config.url?.includes('/staff/');
      if (!isNoisy) {
        console.warn(`[Upstream] ${config.url} failed with ${error.response?.status || 'Network Error'}. Retrying in ${Math.round(delay)}ms... (${retries} left)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(config, retries - 1, backoff * 1.5);
    }

    // Mark as failed in negative cache to prevent immediate re-hammering
    negativeCache.set(cacheKey, { timestamp: Date.now() });
    throw error;
  }
}

function normalizeItem(item: any): MediaItem {
  let poster = getImageUrl(item.cover) || 
               getImageUrl(item.poster) || 
               getImageUrl(item.coverUrl) || 
               getImageUrl(item.image) || 
               getImageUrl(item.img) || 
               getImageUrl(item.stills) ||
               '';
  
  return {
    id: String(item.subjectId || item.id),
    title: item.title || 'Unknown Title',
    poster: poster,
    rating: item.imdbRatingValue || item.rating,
    contentRating: item.contentRating || item.mpaa || item.ageRating,
    type: item.subjectType === 2 ? 'Series' : item.subjectType === 1 ? 'Movie' : (item.type || (item.subjectType === 6 ? 'Video' : 'Media')),
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
    quality: item.quality,
    detailPath: item.detailPath
  };
}

function getImageUrl(img: any): string {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    const url = img.url || img.coverUrl || img.posterUrl || img.avatarUrl || img.photoUrl || img.avatar || img.cover || img.image || img.photo || img.img || '';
    if (typeof url === 'string') return url;
    if (typeof url === 'object' && url !== null) return getImageUrl(url);
  }
  return '';
}

function sanitizeImageUrl(url: string): string {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('image.tmdb.org') || cleanUrl.includes('/original/')) {
    cleanUrl = cleanUrl.replace('/original/', '/w500/');
  }
  return cleanUrl;
}

export const externalMovieService = {
  async getHomepage(): Promise<HomepageData> {
    try {
      const response = await fetchWithRetry({ url: `/homepage` });
      const data = response.data?.data || {};
      return {
        topPickList: Array.isArray(data.topPickList) ? data.topPickList.map(normalizeItem) : [],
        homeList: Array.isArray(data.homeList) ? data.homeList.map(normalizeItem) : [],
        latestMovies: Array.isArray(data.latestMovies) ? data.latestMovies.map(normalizeItem) : [],
        latestSeries: Array.isArray(data.latestSeries) ? data.latestSeries.map(normalizeItem) : [],
        operatingList: Array.isArray(data.operatingList) ? data.operatingList.map((op: any) => ({
          ...op,
          name: op.name || op.title || 'Recommended',
          subjects: Array.isArray(op.subjects) ? op.subjects.map(normalizeItem) : [],
        })) : [],
      };
    } catch (e: any) {
      console.error("Error in getHomepage:", e.message || e);
      return {
        topPickList: [],
        homeList: [],
        latestMovies: [],
        latestSeries: [],
        operatingList: [],
      };
    }
  },

  async search(query: string, page = 1, perPage = 30, subjectType = 0): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    try {
      const response = await fetchWithRetry({ 
        url: `/search`, 
        params: { keyword: query, page, perPage, subjectType } 
      });
      const items = response.data?.data?.items || [];
      return Array.isArray(items) ? items.map(normalizeItem) : [];
    } catch (e: any) {
      console.error("Error in search:", e.message || e);
      return [];
    }
  },

  async getTrending(page = 1, perPage = 18): Promise<MediaItem[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/trending`, 
        params: { page, perPage } 
      });
      const list = response.data?.data?.subjectList || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e: any) {
      console.error("Error in getTrending:", e.message || e);
      return [];
    }
  },

  async getPopularSearch(): Promise<string[]> {
    try {
      const response = await fetchWithRetry({ url: `/popular-search` });
      const searches = response.data?.data?.everyoneSearch || [];
      return Array.isArray(searches) ? searches.map((item: any) => item.title) : [];
    } catch (e: any) {
      console.error("Error in getPopularSearch:", e.message || e);
      return [];
    }
  },

  async getHot(): Promise<{ movies: MediaItem[], series: MediaItem[] }> {
    try {
      const response = await fetchWithRetry({ url: `/hot` });
      const data = response.data?.data || {};
      return {
        movies: Array.isArray(data.movie) ? data.movie.map(normalizeItem) : [],
        series: Array.isArray(data.tv) ? data.tv.map(normalizeItem) : [],
      };
    } catch (e: any) {
      console.error("Error in getHot:", e.message || e);
      return { movies: [], series: [] };
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      const response = await fetchWithRetry({ 
        url: `/search/suggest`, 
        params: { keyword: query } 
      });
      return response.data?.data || [];
    } catch (e: any) {
      console.error("Error in getSuggestions:", e.message || e);
      return [];
    }
  },

  async getDetails(subjectId: string): Promise<ItemDetails> {
    const response = await fetchWithRetry({ 
      url: `/detail`, 
      params: { subjectId } 
    });
    const data = response.data?.data || {};
    const subject = data.subject || {};
    const stars = data.stars || subject.stars || [];
    
    return {
      id: String(subject.subjectId || subject.id),
      title: subject.title || 'Unknown Title',
      description: subject.description || '',
      poster: (() => {
        const p = (typeof subject.cover === 'string' ? subject.cover : subject.cover?.url) || 
                  subject.poster || 
                  subject.coverUrl || 
                  subject.image || 
                  subject.img || 
                  '';
        return p;
      })(),
      background: subject.stills?.[0]?.url || subject.cover?.url || '',
      rating: subject.imdbRatingValue || subject.rating,
      contentRating: subject.contentRating || subject.mpaa || subject.ageRating,
      year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
      genres: Array.isArray(subject.genre) ? subject.genre : (typeof subject.genre === 'string' ? subject.genre.split(',') : []),
      images: Array.isArray(subject.imageList) 
        ? subject.imageList.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean)
        : [],
      cast: stars.map((star: any) => {
        const avatar = (typeof star.avatarUrl === 'string' ? star.avatarUrl : star.avatarUrl?.url) ||
                       (typeof star.avatar === 'string' ? star.avatar : star.avatar?.url) || 
                       (typeof star.cover === 'string' ? star.cover : star.cover?.url) || 
                       (typeof star.image === 'string' ? star.image : star.image?.url) || 
                       (typeof star.photo === 'string' ? star.photo : star.photo?.url) || '';
        const sanitizedAvatar = sanitizeImageUrl(avatar);
        return {
          id: String(star.staffId || star.id),
          name: star.name,
          character: star.character,
          avatarUrl: sanitizedAvatar,
          avatar: sanitizedAvatar
        };
      }),
      type: subject.subjectType === 2 ? 'Series' : 'Movie',
      duration: subject.duration ? `${subject.duration} min` : undefined,
      seasons: data.resource?.seasons,
      trailer: subject.trailer,
      trailerUrl: (typeof subject.trailerUrl === 'string' ? subject.trailerUrl : subject.trailerUrl?.url) || 
                  (typeof subject.trailer === 'string' ? subject.trailer : (subject.trailer?.videoAddress?.url || subject.trailer?.url)) || 
                  (typeof data.trailerUrl === 'string' ? data.trailerUrl : data.trailerUrl?.url) || ''
    };
  },
  async getRichDetails(subjectId: string): Promise<any> {
    const response = await fetchWithRetry({ 
      url: `/rich-detail`, 
      params: { subjectId } 
    });
    return response.data?.data || {};
  },

  async getRecommendations(subjectId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/recommend`, 
        params: { subjectId, page, perPage } 
      });
      const list = response.data?.data?.items || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e: any) {
      console.error("Error in getRecommendations:", e.message || e);
      return [];
    }
  },

  async browse(genre?: string, country?: string, page = 1, perPage = 12, subjectType = 2): Promise<MediaItem[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/browse`, 
        params: { subjectType, genre, countryName: country, page, perPage } 
      });
      const list = response.data?.data?.items || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e: any) {
      console.error("Error in browse:", e.message || e);
      return [];
    }
  },

  async getRanking(): Promise<RankingItem[]> {
    try {
      const response = await fetchWithRetry({ url: `/ranking` });
      const list = response.data?.data?.subjectList || [];
      if (!Array.isArray(list)) return [];
      return list.map((item: any, index: number) => {
        let poster = (typeof item.cover === 'string' ? item.cover : item.cover?.url) || item.poster || '';
        return {
          id: String(item.subjectId || item.id),
          title: item.title,
          cover: poster,
          score: item.score || item.imdbRatingValue || item.rating,
          rank: index + 1,
          type: item.subjectType,
          year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
        };
      });
    } catch (e: any) {
      console.error("Error in getRanking:", e.message || e);
      return [];
    }
  },

  async getPlay(subjectId: string, detailPath?: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId };
    if (detailPath) params.detailPath = detailPath;
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;

    try {
      const response = await fetchWithRetry({ url: `/play`, params });
      const data = response.data?.data || {};
      
      const streams = data.streams || [];
      const hls = data.hls || [];
      const captions = data.subtitles || [];

      const sources = [...streams, ...hls].map((s: any) => {
        const rawUrl = s.proxyUrl || s.url;
        const downloadUrl = s.downloadUrl || s.proxyUrl || s.url;

        return {
          quality: s.resolutions ? (String(s.resolutions).includes('p') ? s.resolutions : `${s.resolutions}p`) : (s.quality || 'Unknown'),
          url: rawUrl,
          downloadUrl: downloadUrl,
          type: ((rawUrl?.includes('.m3u8') || s.url?.includes('.m3u8')) ? 'hls' : 'mp4') as 'hls' | 'mp4'
        };
      }).filter((s: any) => s.url);

      const subtitles = captions.map((c: any) => ({
        language: c.language || c.lanName || c.lan || 'Unknown',
        url: c.url || '',
      })).filter((s: any) => s.url);

      const audioTracks = (data.audioTracks || []).map((t: any) => ({
        language: t.language || 'Unknown',
        languageCode: t.languageCode || '',
        subjectId: String(t.subjectId || ''),
        detailPath: t.detailPath || ''
      }));

      if (sources.length > 0) {
        // Construct a fallback embed URL if not provided by API
        const embedUrl = data.embedUrl || data.iframeUrl || data.playerUrl || 
          (params.se ? `https://vidsrc.to/embed/tv/${subjectId}/${params.se}/${params.ep || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`);

        return { 
          sources, 
          subtitles,
          embedUrl,
          audioTracks
        };
      }
    } catch (e: any) {
      // Primary fetch failed, utilizing fallback streaming URLs
    }

    // Fallback to constructed stream URLs and embed URL if API fails or returns no sources
    const constructedSources = [
      {
        quality: '1080p',
        url: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=1080${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=1080&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      },
      {
        quality: '720p',
        url: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=720${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=720&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      },
      {
        quality: '360p',
        url: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=360${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=360&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      }
    ];

    return {
      sources: constructedSources,
      subtitles: [],
      embedUrl: season ? `https://vidsrc.to/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`
    };
  },

  async getCaptions(subjectId: string, streamId: string): Promise<any> {
    const response = await fetchWithRetry({ 
      url: `/captions`, 
      params: { subjectId, streamId } 
    });
    return response.data?.data || [];
  },

  async getActorDetails(staffId: string): Promise<Actor> {
    const response = await fetchWithRetry({ 
      url: `/staff/detail`, 
      params: { staffId } 
    });
    const data = response.data?.data || response.data || {};
    const details = data.subject || data;

    const avatar = (typeof details.avatar === 'string' ? details.avatar : details.avatar?.url) || 
                   (typeof details.cover === 'string' ? details.cover : details.cover?.url) || 
                   (typeof details.image === 'string' ? details.image : details.image?.url) || 
                   (typeof details.photo === 'string' ? details.photo : details.photo?.url) || 
                   (typeof details.avatarUrl === 'string' ? details.avatarUrl : details.avatarUrl?.url) || '';
                   
    const sanitizedAvatar = sanitizeImageUrl(avatar);
    
    return {
      id: String(details.staffId || details.id || staffId),
      name: details.name || 'Unknown',
      avatar: sanitizedAvatar,
      description: details.description || '',
      birthday: details.birthday || '',
      birthPlace: details.birthPlace || '',
      popularity: details.popularity || 0,
      biography: details.biography || details.description || ''
    };
  },

  async getStaffDetails(staffId: string): Promise<Actor | null> {
    try {
      const response = await fetchWithRetry({ url: '/staff/detail', params: { staffId } });
      // The API might return data directly or nested in a data property
      const data = response.data?.data || response.data;
      if (!data) return null;
      
      // Some APIs structure details differently; ensure we can handle both flat or nested definitions
      const details = data.subject || data;

      const avatarUrl = (typeof details.avatarUrl === 'string' ? details.avatarUrl : details.avatarUrl?.url) ||
                        (typeof details.avatar === 'string' ? details.avatar : details.avatar?.url) || 
                        (typeof details.cover === 'string' ? details.cover : details.cover?.url) || '';
      
      const sanitizedAvatarUrl = sanitizeImageUrl(avatarUrl);
      
      return {
        id: String(details.staffId || details.id || staffId),
        name: details.name || 'Unknown',
        avatar: sanitizedAvatarUrl,
        avatarUrl: sanitizedAvatarUrl,
        description: details.description || '',
        birthday: details.birthday || '',
        birthPlace: details.birthPlace || '',
      };
    } catch (e: any) {
      console.error("Error in getStaffDetails:", e.message || e);
      return null;
    }
  },

  async getActorWorks(staffId: string, page = 1, perPage = 24): Promise<MediaItem[]> {
    try {
      // Fetch up to 3 pages to get a good amount of distinct non-dubbed films
      const allItems: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const response = await fetchWithRetry({ 
          url: `/staff/works`, 
          params: { staffId, page: i, perPage } 
        });
        const list = response.data?.data?.items || [];
        if (Array.isArray(list) && list.length > 0) {
          allItems.push(...list);
        }
        if (!Array.isArray(list) || list.length < perPage) {
          break; // No more items
        }
      }

      const items = allItems.map(normalizeItem);
      
      // Deduplicate items based on id and clean title
      const uniqueItems = new Map();
      for (const item of items) {
        if (!uniqueItems.has(item.id)) {
          // Check if clean title is already in there
          let duplicateTitleFound = false;
          // Clean title removes [Dubbed] or [Version française] etc.
          const cleanTitle = item.title.replace(/\[.*?\]|\(.*?\)/g, '').trim().toLowerCase();
          
          for (const [_, existing] of uniqueItems) {
            const existingClean = existing.title.replace(/\[.*?\]|\(.*?\)/g, '').trim().toLowerCase();
            if (existingClean === cleanTitle) {
              duplicateTitleFound = true;
              break;
            }
          }
          if (!duplicateTitleFound) {
            uniqueItems.set(item.id, item);
          }
        }
      }
      return Array.from(uniqueItems.values());
    } catch (e: any) {
      if (!e.message?.includes("skip retry")) {
        console.warn("Error in getActorWorks (Staff ID might be dead):", e.message || e);
      }
      return [];
    }
  },

  async getRelatedActors(staffId: string): Promise<Actor[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/staff/related`, 
        params: { staffId } 
      });
      const list = response.data?.data || [];
      if (!Array.isArray(list)) return [];
      return list.map((data: any) => {
        let avatarUrl = '';
        const possibleFields = [data.avatarUrl, data.avatar, data.coverUrl, data.cover, data.image, data.photoUrl, data.photo, data.img];
        for (const field of possibleFields) {
          const extractedUrl = getImageUrl(field);
          if (extractedUrl) {
            avatarUrl = extractedUrl;
            break;
          }
        }
        const sanitizedAvatarUrl = sanitizeImageUrl(avatarUrl);
        return {
          id: String(data.staffId || data.id),
          name: data.name || data.title,
          avatar: sanitizedAvatarUrl,
          avatarUrl: sanitizedAvatarUrl
        };
      });
    } catch (e: any) {
      if (!e.message?.includes("skip retry")) {
        console.warn("Error in getRelatedActors (Staff ID might be dead):", e.message || e);
      }
      return [];
    }
  },

  async reportIssue(userId: string, category: string, detail: string): Promise<boolean> {
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, category, detail })
      });
      return res.ok;
    } catch (e) {
      console.error("Failed to report issue", e);
      return false;
    }
  }
};
