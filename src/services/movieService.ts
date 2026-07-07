import axios, { AxiosRequestConfig } from 'axios';
import { 
  MediaItem, 
  HomepageData, 
  ItemDetails, 
  MediaData, 
  Actor, 
  RankingItem 
} from '../types';

import { submitContentReport } from './firebaseService';

const TARGET_API = '/api';
const EXTERNAL_API_URL = 'https://movieapi.xcasper.space/api';
const API_KEY = 'Godszeal';

const api = axios.create();

// Global runtime cache for lightning-fast speeds on repeated navigation
const globalRequestCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 mins

function getCacheKey(config: AxiosRequestConfig) {
  return `${config.url}?${new URLSearchParams(config.params || {}).toString()}`;
}

// Helper for requests to our own backend
async function fetchWithRetry(config: AxiosRequestConfig, retries = 1, backoff = 500): Promise<any> {
  const cacheKey = getCacheKey(config);
  const cached = globalRequestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const tryDirect = !config.url?.startsWith('http') && !config.url?.includes('/staff/');
  if (tryDirect) {
    try {
      const directResponse = await axios.get(`${EXTERNAL_API_URL}${config.url}`, {
        params: { ...config.params, apikey: API_KEY },
        timeout: 2000 
      });
      const data = directResponse.data?.data;
      if (data) {
        let processedData;
        // Special normalization for some endpoints if needed
        if (config.url === '/homepage') {
          processedData = {
            topPickList: (data.topPickList || []).map(normalizeItem),
            homeList: (data.homeList || []).map(normalizeItem),
            latestMovies: (data.latestMovies || []).map(normalizeItem),
            latestSeries: (data.latestSeries || []).map(normalizeItem),
            operatingList: (data.operatingList || []).map((op: any) => ({
              ...op,
              subjects: (op.subjects || []).map(normalizeItem)
            }))
          };
        } else if (config.url === '/trending') processedData = (data.subjectList || []).map(normalizeItem);
        else if (config.url === '/search') processedData = (data.items || []).map(normalizeItem);
        else if (config.url === '/popular-search') processedData = (data.everyoneSearch || []).map((i: any) => i.title);
        else if (config.url === '/hot') processedData = { movies: (data.movie || []).map(normalizeItem), series: (data.tv || []).map(normalizeItem) };
        else if (config.url === '/search/suggest') processedData = data;
        else if (config.url === '/browse' || config.url === '/recommend' || config.url === '/staff/works') processedData = (data.items || []).map(normalizeItem);
        else if (config.url === '/ranking') {
          processedData = (data.subjectList || []).map((item: any, index: number) => ({
            id: String(item.subjectId || item.id),
            title: item.title,
            poster: getImageUrl(item.cover) || getImageUrl(item.poster) || '',
            rating: item.score || item.imdbRatingValue || item.rating,
            rank: index + 1,
            year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
            avgHueDark: item.avgHueDark || item.avgHue || item.hue || '#1a1a1a'
          }));
        }
        else if (config.url === '/staff/detail') {
          const details = data.subject || data;
          processedData = {
            id: String(details.staffId || details.id || config.params?.staffId || ''),
            name: details.name || 'Unknown',
            avatar: getImageUrl(details.avatar) || getImageUrl(details.cover) || getImageUrl(details.image) || getImageUrl(details.photo) || getImageUrl(details.avatarUrl) || '',
            description: details.description || '',
            birthday: details.birthday || '',
            birthPlace: details.birthPlace || '',
            popularity: details.popularity || 0,
            biography: details.biography || details.description || ''
          };
        }
        else if (config.url === '/staff/related') {
          processedData = (data || []).map((d: any) => ({
            id: String(d.staffId),
            name: d.name,
            avatar: getImageUrl(d.avatar) || getImageUrl(d.cover) || getImageUrl(d.image) || getImageUrl(d.photo) || ''
          }));
        }
        else if (config.url === '/detail') {
          const subject = data.subject || {};
          processedData = {
            id: String(subject.subjectId || subject.id),
            title: subject.title,
            description: subject.description,
            poster: getImageUrl(subject.cover) || getImageUrl(subject.poster) || '',
            background: getImageUrl(subject.stills?.[0]) || getImageUrl(subject.cover) || '',
            avgHueDark: subject.avgHueDark || subject.avgHue || subject.hue || '#1a1a1a',
            rating: subject.imdbRatingValue || subject.rating,
            imdbRatingValue: subject.imdbRatingValue,
            year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
            releaseDate: subject.releaseDate,
            genres: subject.genre ? subject.genre.split(',') : [],
            cast: Array.from(
              (data.stars || subject.stars || data.staff || []).reduce((acc: Map<string, any>, s: any) => {
                const id = String(s.staffId || s.id);
                if (!acc.has(id)) {
                  acc.set(id, {
                    id,
                    name: s.name || '',
                    avatar: getImageUrl(s.avatar) || getImageUrl(s.cover) || getImageUrl(s.image) || '',
                    character: s.character || ''
                  });
                } else {
                  // Append character if multiple roles
                  const existing = acc.get(id);
                  if (s.character && existing.character && !existing.character.includes(s.character)) {
                    existing.character += `, ${s.character}`;
                  } else if (s.character && !existing.character) {
                    existing.character = s.character;
                  }
                }
                return acc;
              }, new Map()).values()
            ),
            type: subject.subjectType === 2 ? 'Series' : 'Movie',
            seasons: data.resource?.seasons,
            trailer: subject.trailer,
            trailerUrl: sanitizeTrailerUrl(subject.trailerUrl || subject.trailer || data.trailerUrl),
            duration: subject.duration ? `${Math.floor(subject.duration / 60)}m` : undefined,
            detailPath: subject.detailPath
          };
        }
        else {
          processedData = data;
        }

        globalRequestCache.set(cacheKey, { data: processedData, timestamp: Date.now() });
        return processedData;
      }
    } catch (e) {
      // console.warn(`Direct fetch failed for ${config.url}, falling back...`);
    }
  }

  try {
    const response = await api({
      ...config,
      url: `${TARGET_API}${config.url}`
    });
    
    globalRequestCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
  } catch (error: any) {
    const isStaffDetail = config.url?.includes('/staff/');
    if (retries > 0 && !isStaffDetail && (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504 || error.code === 'ECONNABORTED')) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(config, retries - 1, backoff * 2);
    }
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
    title: item.title || 'Unknown',
    poster: poster,
    rating: item.imdbRatingValue || item.rating,
    type: item.subjectType === 2 ? 'Series' : item.subjectType === 1 ? 'Movie' : (item.type || (item.subjectType === 6 ? 'Video' : 'Media')),
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
    quality: item.quality,
    avgHueDark: item.avgHueDark || item.avgHue || item.hue || '#1a1a1a'
  };
}

function getImageUrl(img: any): string {
  if (!img) return '';
  if (typeof img === 'string') return sanitizeImageUrl(img);
  if (typeof img === 'object' && img !== null) {
    const url = img.url || img.coverUrl || img.posterUrl || img.avatarUrl || img.photoUrl || img.avatar || img.cover || img.image || img.photo || img.img || '';
    if (typeof url === 'string') return sanitizeImageUrl(url);
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

function sanitizeTrailerUrl(url: string | any): string {
  if (!url) return '';
  let cleanUrl = typeof url === 'string' ? url : (url.url || '');
  if (!cleanUrl) return '';

  // Convert YouTube Watch links to Embed links
  if (cleanUrl.includes('youtube.com/watch?v=')) {
    const videoId = new URL(cleanUrl).searchParams.get('v');
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  if (cleanUrl.includes('youtu.be/')) {
    const videoId = cleanUrl.split('/').pop();
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  return cleanUrl;
}

export const movieService = {
  // Client-side simple cache for aggregation pool
  _aggCache: null as { pool: MediaItem[], timestamp: number } | null,
  _homeCache: null as { data: HomepageData, timestamp: number } | null,
  _trendingCache: null as { data: MediaItem[], timestamp: number } | null,
  _hotCache: null as { data: { movies: MediaItem[], series: MediaItem[] }, timestamp: number } | null,
  _popularSearchCache: null as { data: string[], timestamp: number } | null,

  async getHomepage(): Promise<HomepageData> {
    const TTL = 5 * 60 * 1000; // 5 mins
    if (this._homeCache && Date.now() - this._homeCache.timestamp < TTL) {
      return this._homeCache.data;
    }
    try {
      const data = await fetchWithRetry({ url: `/homepage` });
      const homepage = (Array.isArray(data?.topPickList) || Array.isArray(data?.homeList)) ? data : { topPickList: [], homeList: [], latestMovies: [], latestSeries: [], operatingList: [] };
      this._homeCache = { data: homepage, timestamp: Date.now() };
      return homepage;
    } catch (e: any) {
      console.error("Error in getHomepage:", e.message || e);
      return { topPickList: [], homeList: [], latestMovies: [], latestSeries: [], operatingList: [] };
    }
  },

  async search(query: string, page = 1, perPage = 30, subjectType = 0): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    try {
      return await fetchWithRetry({ 
        url: `/search`, 
        params: { keyword: query, page, perPage, subjectType } 
      });
    } catch (e: any) {
      console.error("Error in search:", e.message || e);
      return [];
    }
  },

  async getTrending(page = 1, perPage = 18): Promise<MediaItem[]> {
    const TTL = 5 * 60 * 1000;
    // Only cache page 1
    if (page === 1 && this._trendingCache && Date.now() - this._trendingCache.timestamp < TTL) {
      return this._trendingCache.data;
    }
    try {
      const data = await fetchWithRetry({ 
        url: `/trending`, 
        params: { page, perPage } 
      });
      const list = Array.isArray(data) ? data : [];
      if (page === 1) this._trendingCache = { data: list, timestamp: Date.now() };
      return list;
    } catch (e: any) {
      console.error("Error in getTrending:", e.message || e);
      // Fallback to homeCache if direct trending fails
      if (this._homeCache?.data?.topPickList?.length) {
        return this._homeCache.data.topPickList;
      }
      return [];
    }
  },

  async getPopularSearch(): Promise<string[]> {
    const TTL = 10 * 60 * 1000;
    if (this._popularSearchCache && Date.now() - this._popularSearchCache.timestamp < TTL) {
      return this._popularSearchCache.data;
    }
    try {
      const data = await fetchWithRetry({ url: `/popular-search` });
      const searches = Array.isArray(data) ? data : [];
      this._popularSearchCache = { data: searches, timestamp: Date.now() };
      return searches;
    } catch (e: any) {
      console.error("Error in getPopularSearch:", e.message || e);
      return [];
    }
  },

  async getHot(): Promise<{ movies: MediaItem[], series: MediaItem[] }> {
    const TTL = 5 * 60 * 1000;
    if (this._hotCache && Date.now() - this._hotCache.timestamp < TTL) {
      return this._hotCache.data;
    }
    try {
      const data = await fetchWithRetry({ url: `/hot` });
      const hot = {
        movies: Array.isArray(data?.movies) ? data.movies : [],
        series: Array.isArray(data?.series) ? data.series : []
      };
      this._hotCache = { data: hot, timestamp: Date.now() };
      return hot;
    } catch (e: any) {
      console.error("Error in getHot:", e.message || e);
      return { movies: [], series: [] };
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      return await fetchWithRetry({ 
        url: `/search/suggest`, 
        params: { keyword: query } 
      });
    } catch (e: any) {
      console.error("Error in getSuggestions:", e.message || e);
      return [];
    }
  },

  async getDetails(subjectId: string): Promise<ItemDetails> {
    return await fetchWithRetry({ url: `/detail`, params: { subjectId } });
  },

  async getRichDetails(subjectId: string): Promise<any> {
    return await fetchWithRetry({ url: `/rich-detail`, params: { subjectId } });
  },

  _recommendationsCache: null as { [key: string]: { data: MediaItem[], timestamp: number } } | null,

  async getRecommendations(subjectId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    const TTL = 5 * 60 * 1000;
    const cacheKey = `${subjectId}-${page}-${perPage}`;

    if (page === 1) {
      if (!this._recommendationsCache) this._recommendationsCache = {};
      const cached = this._recommendationsCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < TTL) {
        return cached.data;
      }
    }

    try {
      const data = await fetchWithRetry({ url: `/recommend`, params: { subjectId, page, perPage } });
      const list = Array.isArray(data) ? data : [];
      
      if (page === 1) {
        if (!this._recommendationsCache) this._recommendationsCache = {};
        this._recommendationsCache[cacheKey] = { data: list, timestamp: Date.now() };
      }
      return list;
    } catch (e: any) {
      // console.error("Error in getRecommendations:", e.message || e);
      return [];
    }
  },

  _browseCache: null as { [key: string]: { data: MediaItem[], timestamp: number } } | null,

  async browse(genre?: string, country?: string, page = 1, perPage = 12, subjectType = 2): Promise<MediaItem[]> {
    const TTL = 5 * 60 * 1000;
    const cacheKey = `${genre || ''}-${country || ''}-${subjectType}-${perPage}`;
    
    // Only cache page 1
    if (page === 1) {
      if (!this._browseCache) this._browseCache = {};
      const cached = this._browseCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < TTL) {
        return cached.data;
      }
    }

    try {
      const data = await fetchWithRetry({ url: `/browse`, params: { subjectType, genre, countryName: country, page, perPage } });
      const list = Array.isArray(data) ? data : [];      

      if (page === 1) {
        if (!this._browseCache) this._browseCache = {};
        this._browseCache[cacheKey] = { data: list, timestamp: Date.now() };
      }
      return list;
    } catch (e: any) {
      // console.error("Error in browse:", e.message || e);
      return [];
    }
  },

  _rankingCache: null as { data: RankingItem[], timestamp: number } | null,

  async getRanking(): Promise<RankingItem[]> {
    const TTL = 5 * 60 * 1000;
    if (this._rankingCache && Date.now() - this._rankingCache.timestamp < TTL) {
      return this._rankingCache.data;
    }
    try {
      const data = await fetchWithRetry({ url: `/ranking` });
      const list = Array.isArray(data) ? data : [];
      this._rankingCache = { data: list, timestamp: Date.now() };
      return list;
    } catch (e: any) {
      console.error("Error in getRanking:", e.message || e);
      return [];
    }
  },

  async getPlay(subjectId: string, season?: number, episode?: number, detailPath?: string): Promise<MediaData> {
    const params: any = { subjectId };
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;
    if (detailPath) params.detailPath = detailPath;

    // 1. Try our own backend proxy API first. It manages backup scaling, routing, headers, and credentials.
    try {
      const response = await axios.get(`${TARGET_API}/play`, { params });
      if (response.data && (
        (Array.isArray(response.data.sources) && response.data.sources.length > 0) ||
        response.data.embedUrl ||
        response.data.embedCode
      )) {
        return response.data;
      }
    } catch (err: any) {
      console.warn("[movieService] Backend /api/play proxy returned error, trying direct browser fallback...", err.message || err);
    }

    // 2. Browser direct fetch as secondary fallback, using legacy layout
    const directParams: any = { subjectId, apikey: API_KEY };
    if (season !== undefined && season > 0) directParams.se = season;
    if (episode !== undefined && episode > 0) directParams.ep = episode;
    if (detailPath) directParams.detailPath = detailPath;

    try {
      // Call external API directly from browser to bypass server-side issues
      const response = await axios.get(`${EXTERNAL_API_URL}/play`, { params: directParams });
      const data = response.data?.data || {};
      
      const streams = data.streams || [];
      const hls = data.hls || [];
      const captions = data.subtitles || [];

      const sources = [...streams, ...hls].map((s: any) => {
        const rawUrl = s.proxyUrl || s.url;
        const downloadUrl = s.downloadUrl || s.proxyUrl || s.url;
        const isHls = rawUrl?.includes('.m3u8') || s.url?.includes('.m3u8');
        const isDownloadHls = downloadUrl?.includes('.m3u8');

        return {
          quality: s.resolutions ? (String(s.resolutions).includes('p') ? s.resolutions : `${s.resolutions}p`) : (s.quality || 'Unknown'),
          url: rawUrl,
          downloadUrl: downloadUrl,
          type: (isHls ? 'hls' : 'mp4') as 'hls' | 'mp4',
          downloadType: (isDownloadHls ? 'hls' : 'mp4') as 'hls' | 'mp4'
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
        const embedUrl = data.embedUrl || data.iframeUrl || data.playerUrl || 
          (season ? `https://vidsrc.to/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`);

        return { 
          sources, 
          subtitles,
          embedUrl,
          audioTracks
        };
      }
      throw new Error("No sources found in direct API response");
    } catch (e: any) {
      console.warn("[movieService] Direct browser-side API call failed:", e.message || e);
      try {
        // Construct immediate embed-based fallback to guarantee playback
        const embedUrl = season ? `https://vidsrc.to/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`;
        
        return { 
          sources: [], 
          subtitles: [],
          embedUrl,
          audioTracks: []
        };
      } catch (localError: any) {
        console.error("Critical stream failure", localError);
        throw localError;
      }
    }
  },

  async getCaptions(subjectId: string, streamId: string): Promise<any> {
    return await fetchWithRetry({ url: `/captions`, params: { subjectId, streamId } });
  },

  async getActorDetails(staffId: string): Promise<Actor> {
    return await fetchWithRetry({ url: `/staff/detail`, params: { staffId } });
  },

  async getActorWorks(staffId: string, page = 1, perPage = 24): Promise<MediaItem[]> {
    try {
      return await fetchWithRetry({ url: `/staff/works`, params: { staffId, page, perPage } });
    } catch (e: any) {
      console.error("Error in getActorWorks:", e.message || e);
      return [];
    }
  },

  async getRelatedActors(staffId: string): Promise<Actor[]> {
    try {
      return await fetchWithRetry({ url: `/staff/related`, params: { staffId } });
    } catch (e: any) {
      console.error("Error in getRelatedActors:", e.message || e);
      return [];
    }
  },

  async reportIssue(userId: string, category: string, detail: string): Promise<boolean> {
    try {
      console.log(`[Issue Reported] Category: ${category}, Detail: ${detail}`);
      return await submitContentReport(userId, category, detail);
    } catch (e) {
      console.error("Failed to report issue", e);
      return false;
    }
  }
};
