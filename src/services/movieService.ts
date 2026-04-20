import axios, { AxiosRequestConfig } from 'axios';
import { 
  MediaItem, 
  HomepageData, 
  ItemDetails, 
  MediaData, 
  Actor, 
  LiveMatch, 
  RankingItem 
} from '../types';

const TARGET_API = '/api';
const EXTERNAL_API_URL = 'https://movieapi.xcasper.space/api';
const API_KEY = 'Godszeal';

const api = axios.create();

// Helper for requests to our own backend
async function fetchWithRetry(config: AxiosRequestConfig, retries = 3, backoff = 1000): Promise<any> {
  const tryDirect = !config.url?.startsWith('http');
  if (tryDirect) {
    try {
      const directResponse = await axios.get(`${EXTERNAL_API_URL}${config.url}`, {
        params: { ...config.params, apikey: API_KEY },
        timeout: 10000
      });
      const data = directResponse.data?.data;
      if (data) {
        // Special normalization for some endpoints if needed
        if (config.url === '/homepage') {
          return {
            topPickList: (data.topPickList || []).map(normalizeItem),
            homeList: (data.homeList || []).map(normalizeItem),
            latestMovies: (data.latestMovies || []).map(normalizeItem),
            latestSeries: (data.latestSeries || []).map(normalizeItem),
            operatingList: (data.operatingList || []).map((op: any) => ({
              ...op,
              subjects: (op.subjects || []).map(normalizeItem)
            }))
          };
        }
        if (config.url === '/trending') return (data.subjectList || []).map(normalizeItem);
        if (config.url === '/search') return (data.items || []).map(normalizeItem);
        if (config.url === '/popular-search') return (data.everyoneSearch || []).map((i: any) => i.title);
        if (config.url === '/hot') return { movies: (data.movie || []).map(normalizeItem), series: (data.tv || []).map(normalizeItem) };
        if (config.url === '/search/suggest') return data;
        if (config.url === '/browse' || config.url === '/recommend' || config.url === '/staff/works') return (data.items || []).map(normalizeItem);
        if (config.url === '/ranking') {
          return (data.subjectList || []).map((item: any, index: number) => ({
            id: String(item.subjectId || item.id),
            title: item.title,
            poster: item.cover || item.poster || '',
            rating: item.score || item.imdbRatingValue || item.rating,
            rank: index + 1,
            year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
          }));
        }
        if (config.url === '/detail') {
          const subject = data.subject || {};
          return {
            id: String(subject.subjectId || subject.id),
            title: subject.title,
            description: subject.description,
            poster: subject.cover || subject.poster || '',
            background: subject.stills?.[0]?.url || subject.cover || '',
            rating: subject.imdbRatingValue || subject.rating,
            year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
            genres: subject.genre ? subject.genre.split(',') : [],
            cast: (data.stars || subject.stars || []).map((s: any) => ({
              id: String(s.staffId),
              name: s.name,
              avatar: s.avatar || s.cover || ''
            })),
            type: subject.subjectType === 2 ? 'Series' : 'Movie',
            seasons: data.resource?.seasons
          };
        }
        return data;
      }
    } catch (e) {
      console.warn(`Direct fetch failed for ${config.url}, falling back...`);
    }
  }

  try {
    const response = await api({
      ...config,
      url: `${TARGET_API}${config.url}`
    });
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying request... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(config, retries - 1, backoff * 2);
    }
    throw error;
  }
}

function normalizeItem(item: any): MediaItem {
  let poster = (typeof item.cover === 'string' ? item.cover : item.cover?.url) || 
               item.poster || 
               item.coverUrl || 
               item.image || 
               item.img || 
               item.stills?.url ||
               '';
  
  return {
    id: String(item.subjectId || item.id),
    title: item.title || 'Unknown',
    poster: poster,
    rating: item.imdbRatingValue || item.rating,
    type: item.subjectType === 2 ? 'Series' : item.subjectType === 1 ? 'Movie' : (item.type || (item.subjectType === 6 ? 'Video' : 'Media')),
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
    quality: item.quality
  };
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

  async getAggregatedPool(): Promise<MediaItem[]> {
    const TTL = 10 * 60 * 1000; // 10 minutes on client
    if (this._aggCache && Date.now() - this._aggCache.timestamp < TTL) {
      return this._aggCache.pool;
    }

    try {
      const data = await fetchWithRetry({ url: "/aggregated-popular" });
      const { trending, hot, ranking, homepage } = data;

      const pool: MediaItem[] = [
        ...trending,
        ...hot.movies,
        ...hot.series,
        ...(ranking || []).map((r: any) => ({
          id: String(r.id),
          title: r.title,
          poster: r.cover,
          type: r.type === 1 ? 'Movie' : r.type === 2 ? 'Series' : 'Media',
          year: r.year,
          rating: String(r.score || '')
        })),
        ...(homepage.topPickList || []),
        ...(homepage.homeList || []),
        ...(homepage.latestMovies || []),
        ...(homepage.latestSeries || []),
        ...(homepage.operatingList || []).flatMap((op: any) => op.subjects || [])
      ];

      this._aggCache = { pool, timestamp: Date.now() };
      return pool;
    } catch (e) {
      console.warn("Aggregation failed", e);
      return [];
    }
  },

  async smartSearch(query: string, page = 1): Promise<MediaItem[]> {
    // Stage 1: Fast direct search
    const searchResults = await this.search(query, page);
    
    // Stage 2: Merge with popular pool (only on page 1)
    if (page === 1) {
      const extraPool = await this.getAggregatedPool();
      
      // Tag results from pool as popular
      const taggedExtra = extraPool.map(item => ({ 
        ...item, 
        isPopular: true,
        source: 'aggregator'
      }));
      
      return [...searchResults, ...taggedExtra];
    }
    
    return searchResults;
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
      console.error("Error in getRecommendations:", e.message || e);
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
      console.error("Error in browse:", e.message || e);
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

  async getPlay(subjectId: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId, apikey: API_KEY };
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;

    try {
      // Call external API directly from browser to bypass server-side 502/Cloudflare
      const response = await axios.get(`${EXTERNAL_API_URL}/play`, { params });
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
      console.warn("Direct API call failed, falling back to server proxy:", e.message);
      try {
        return await fetchWithRetry({ url: `/play`, params });
      } catch (localError: any) {
        console.error("Server proxy also failed:", localError.message);
        return {
          sources: [],
          subtitles: [],
          embedUrl: season ? `https://vidsrc.to/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`
        };
      }
    }
  },

  async getCaptions(subjectId: string, streamId: string): Promise<any> {
    return await fetchWithRetry({ url: `/captions`, params: { subjectId, streamId } });
  },

  async getActorDetails(staffId: string): Promise<Actor> {
    return await fetchWithRetry({ url: `/staff/detail`, params: { staffId } });
  },

  async getLive(): Promise<LiveMatch[]> {
    try {
      return await fetchWithRetry({ url: `/live` });
    } catch (e: any) {
      console.error("Error in getLive:", e.message || e);
      return [];
    }
  },

  async getActorWorks(staffId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
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
};
