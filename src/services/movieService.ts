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

function normalizeItem(item: any): MediaItem {
  if (!item) return {} as MediaItem;
  let poster = (typeof item.cover === 'string' ? item.cover : item.cover?.url) || 
                 item.poster || 
                 item.coverUrl || 
                 item.image || 
                 item.img || 
                 item.stills?.url ||
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

// Helper for requests to our own backend or proxied API
async function fetchWithRetry(config: AxiosRequestConfig, retries = 3, backoff = 1000): Promise<any> {
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

export const movieService = {
  // Client-side simple cache for aggregation pool
  _aggCache: null as { pool: MediaItem[], timestamp: number } | null,
  _homeCache: null as { data: HomepageData, timestamp: number } | null,
  _trendingCache: null as { data: MediaItem[], timestamp: number } | null,
  _hotCache: null as { data: { movies: MediaItem[], series: MediaItem[] }, timestamp: number } | null,
  _popularSearchCache: null as { data: string[], timestamp: number } | null,

  async getHomepage(): Promise<HomepageData> {
    const TTL = 5 * 60 * 1000;
    if (this._homeCache && Date.now() - this._homeCache.timestamp < TTL) {
      return this._homeCache.data;
    }
    try {
      const responseBody = await fetchWithRetry({ url: `/homepage` });
      // Support both normalized and raw formats
      const data = responseBody?.data || responseBody || {};
      
      const homepage: HomepageData = {
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
      const responseBody = await fetchWithRetry({ 
        url: `/search`, 
        params: { keyword: query, page, perPage, subjectType } 
      });
      const data = responseBody?.data || responseBody;
      const items = Array.isArray(data) ? data : (data?.items || []);
      return items.map(normalizeItem);
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
    if (page === 1 && this._trendingCache && Date.now() - this._trendingCache.timestamp < TTL) {
      return this._trendingCache.data;
    }
    try {
      const responseBody = await fetchWithRetry({ 
        url: `/trending`, 
        params: { page, perPage } 
      });
      const data = responseBody?.data || responseBody;
      const list = Array.isArray(data) ? data : (data?.subjectList || []);
      const normalizedList = list.map(normalizeItem);
      
      if (page === 1) this._trendingCache = { data: normalizedList, timestamp: Date.now() };
      return normalizedList;
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
      const responseBody = await fetchWithRetry({ url: `/popular-search` });
      const data = responseBody?.data || responseBody;
      const searches = Array.isArray(data) ? data : (data?.everyoneSearch || []);
      
      const list = searches.map((item: any) => typeof item === 'string' ? item : item.title);
      this._popularSearchCache = { data: list, timestamp: Date.now() };
      return list;
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
      const responseBody = await fetchWithRetry({ url: `/hot` });
      const data = responseBody?.data || responseBody || {};
      
      const hot = {
        movies: Array.isArray(data.movies || data.movie) ? (data.movies || data.movie).map(normalizeItem) : [],
        series: Array.isArray(data.series || data.tv) ? (data.series || data.tv).map(normalizeItem) : []
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
    const responseBody = await fetchWithRetry({ url: `/detail`, params: { subjectId } });
    const data = responseBody?.data || responseBody || {};
    const subject = data.subject || {};
    const stars = data.stars || subject.stars || [];
    
    return {
      id: String(subject.subjectId || subject.id),
      title: subject.title || 'Unknown Title',
      description: subject.description || '',
      poster: (typeof subject.cover === 'string' ? subject.cover : subject.cover?.url) || subject.poster || '',
      background: subject.stills?.[0]?.url || subject.cover?.url || '',
      rating: subject.imdbRatingValue || subject.rating,
      contentRating: subject.contentRating || subject.mpaa || subject.ageRating,
      year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
      genres: subject.genre ? subject.genre.split(',') : [],
      cast: Array.isArray(stars) ? stars.map((star: any) => ({
        id: String(star.staffId),
        name: star.name,
        avatar: (typeof star.avatar === 'string' ? star.avatar : star.avatar?.url) || 
                (typeof star.cover === 'string' ? star.cover : star.cover?.url) || ''
      })) : [],
      type: subject.subjectType === 2 ? 'Series' : 'Movie',
      duration: subject.duration ? `${subject.duration} min` : undefined,
      seasons: data.resource?.seasons,
      trailerUrl: (typeof subject.trailerUrl === 'string' ? subject.trailerUrl : subject.trailerUrl?.url) || ''
    };
  },

  async getRichDetails(subjectId: string): Promise<any> {
    const responseBody = await fetchWithRetry({ url: `/rich-detail`, params: { subjectId } });
    return responseBody?.data || responseBody || {};
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
      const responseBody = await fetchWithRetry({ url: `/recommend`, params: { subjectId, page, perPage } });
      const data = responseBody?.data || responseBody;
      const list = Array.isArray(data) ? data : (data?.items || []);
      const normalizedList = list.map(normalizeItem);
      
      if (page === 1) {
        if (!this._recommendationsCache) this._recommendationsCache = {};
        this._recommendationsCache[cacheKey] = { data: normalizedList, timestamp: Date.now() };
      }
      return normalizedList;
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
      const responseBody = await fetchWithRetry({ url: `/browse`, params: { subjectType, genre, countryName: country, page, perPage } });
      const data = responseBody?.data || responseBody;
      const list = Array.isArray(data) ? data : (data?.items || []);      
      const normalizedList = list.map(normalizeItem);

      if (page === 1) {
        if (!this._browseCache) this._browseCache = {};
        this._browseCache[cacheKey] = { data: normalizedList, timestamp: Date.now() };
      }
      return normalizedList;
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
      const responseBody = await fetchWithRetry({ url: `/ranking` });
      const data = responseBody?.data || responseBody;
      const list = Array.isArray(data) ? data : (data?.subjectList || []);
      
      const normalizedList = list.map((item: any, index: number) => {
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
      
      this._rankingCache = { data: normalizedList, timestamp: Date.now() };
      return normalizedList;
    } catch (e: any) {
      console.error("Error in getRanking:", e.message || e);
      return [];
    }
  },

  async getPlay(subjectId: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId };
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;

    try {
      const responseBody = await fetchWithRetry({ url: `/play`, params });
      const data = responseBody?.data || responseBody || {};
      
      const streams = data.streams || [];
      const hls = data.hls || [];
      const captions = data.subtitles || [];

      const sources = [...streams, ...hls].map((s: any) => {
        const rawUrl = s.proxyUrl || s.url;
        const downloadUrl = s.downloadUrl || s.proxyUrl || s.url;
        const isHls = rawUrl?.includes('.m3u8') || s.url?.includes('.m3u8');

        return {
          quality: s.resolutions ? (String(s.resolutions).includes('p') ? s.resolutions : `${s.resolutions}p`) : (s.quality || 'Unknown'),
          url: rawUrl,
          downloadUrl: downloadUrl,
          type: (isHls ? 'hls' : 'mp4') as 'hls' | 'mp4',
          downloadType: (downloadUrl?.includes('.m3u8') ? 'hls' : 'mp4') as 'hls' | 'mp4'
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
      throw new Error("No sources found");
    } catch (e: any) {
      console.warn("Play data fetch failed, using embed fallback:", e.message);
      return {
        sources: [],
        subtitles: [],
        embedUrl: season ? `https://vidsrc.to/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.to/embed/movie/${subjectId}`
      };
    }
  },

  async getCaptions(subjectId: string, streamId: string): Promise<any> {
    return await fetchWithRetry({ url: `/captions`, params: { subjectId, streamId } });
  },

  async getActorDetails(staffId: string): Promise<Actor> {
    const raw = await fetchWithRetry({ url: `/staff/detail`, params: { staffId } });
    const data = raw?.data || raw || {};
    const avatar = (typeof data.avatar === 'string' ? data.avatar : data.avatar?.url) || 
                   (typeof data.cover === 'string' ? data.cover : data.cover?.url) || 
                   (typeof data.image === 'string' ? data.image : data.image?.url) || 
                   (typeof data.photo === 'string' ? data.photo : data.photo?.url) || '';
    return {
      id: String(data.staffId || staffId),
      name: data.name || 'Unknown',
      avatar: avatar,
      description: data.description,
      birthday: data.birthday,
      birthPlace: data.birthPlace,
      popularity: data.popularity,
      biography: data.biography || data.description
    };
  },

  async getLive(): Promise<LiveMatch[]> {
    try {
      const raw = await fetchWithRetry({ url: `/live` });
      const list = raw?.data || raw || [];
      if (!Array.isArray(list)) return [];
      return list.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        cover: item.cover,
        url: item.url,
        status: item.status,
        time: item.time
      }));
    } catch (e: any) {
      console.error("Error in getLive:", e.message || e);
      return [];
    }
  },

  async getActorWorks(staffId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    try {
      const raw = await fetchWithRetry({ url: `/staff/works`, params: { staffId, page, perPage } });
      const data = raw?.data || raw;
      const list = Array.isArray(data) ? data : (data?.items || []);
      return list.map(normalizeItem);
    } catch (e: any) {
      console.error("Error in getActorWorks:", e.message || e);
      return [];
    }
  },

  async getRelatedActors(staffId: string): Promise<Actor[]> {
    try {
      const raw = await fetchWithRetry({ url: `/staff/related`, params: { staffId } });
      const list = raw?.data || raw || [];
      if (!Array.isArray(list)) return [];
      return list.map((data: any) => ({
        id: String(data.staffId),
        name: data.name,
        avatar: (typeof data.avatar === 'string' ? data.avatar : data.avatar?.url) || 
                (typeof data.cover === 'string' ? data.cover : data.cover?.url) || ''
      }));
    } catch (e: any) {
      console.error("Error in getRelatedActors:", e.message || e);
      return [];
    }
  },
};
