import axios, { AxiosRequestConfig } from 'axios';
import { 
  MediaItem, 
  HomepageData, 
  ItemDetails, 
  MediaData, 
  Actor, 
  RankingItem 
} from '../types.js';

const BASE_URL_MAIN = 'https://movieapi.xcasper.space/api';
const BASE_URL_BACKUP = 'https://gzmovieboxapi.septorch.tech/api';
const API_KEY = 'Godszeal';

const STORAGE_KEY = 'axis_api_source';
let currentApiSource: 'main' | 'backup' = 'backup';

export function setApiSource(source: 'main' | 'backup') {
  currentApiSource = source;
  api.defaults.baseURL = source === 'backup' ? BASE_URL_BACKUP : BASE_URL_MAIN;
  serverCache.clear();
  negativeCache.clear();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, source);
    } catch (e) {}
  }
  console.log(`[API Config] Switched upstream API to: ${source}`);
}

const api = axios.create({
  baseURL: currentApiSource === 'backup' ? BASE_URL_BACKUP : BASE_URL_MAIN,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Referer': 'https://movieapi.xcasper.space/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 5000 // Cut down timeout from 15000ms to 5000ms for snappy real-time failovers
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
    
    // Rewrite URLs if we are currently using the backup API source
    if (currentApiSource === 'backup' && config.url) {
      if (config.url === '/popular-search') {
        config.url = '/popular-searches';
      } else if (config.url === '/hot') {
        config.url = '/hot-movies-series';
      } else if (config.url === '/recommend') {
        config.url = '/recommendations';
      } else if (config.url === '/detail') {
        config.url = '/item-details';
      } else if (config.url === '/ranking') {
        // Return a processed or empty ranking response safely to avoid 404
        return {
          data: {
            data: {
              subjectList: []
            }
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
    }

    const response = await api(config);
    
    // Clear failure mark if it succeeded
    negativeCache.delete(cacheKey);
    // Cache successful response
    serverCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    return response;
  } catch (error: any) {
    const isMainDown = currentApiSource === 'main' && (
      !error.response || 
      (error.response.status >= 500 && error.response.status <= 599) ||
      error.response.status === 403 ||
      error.response.status === 404 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    );

    if (isMainDown) {
      setApiSource('backup');
      config.baseURL = BASE_URL_BACKUP;
      return fetchWithRetry(config, retries, backoff);
    }

    const isRetryable = !error.response || (error.response.status >= 500 && error.response.status <= 504) || error.response.status === 429;
    
    if (retries > 0 && isRetryable) {
      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const delay = backoff + jitter;
      
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
  
  poster = sanitizeImageUrl(poster);

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

function sanitizeImageUrl(url: string, width: number = 500): string {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('image.tmdb.org') || cleanUrl.includes('/original/')) {
    cleanUrl = cleanUrl.replace('/original/', `/w${width}/`);
  } else if (cleanUrl.includes('pbcdnw.aoneroom.com') || cleanUrl.includes('hakunaymatata.com')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&output=webp`;
  }
  return cleanUrl;
}

export const externalMovieService = {
  async getHomepage(): Promise<HomepageData> {
    try {
      const url = currentApiSource === 'backup' ? '/homepage' : '/homepage';
      const response = await fetchWithRetry({ url });
      const data = response.data?.data || {};
      
      let topPickList = Array.isArray(data.topPickList) ? data.topPickList.map(normalizeItem) : [];
      let homeList = Array.isArray(data.homeList) ? data.homeList.map(normalizeItem) : [];
      let latestMovies = Array.isArray(data.latestMovies) ? data.latestMovies.map(normalizeItem) : [];
      let latestSeries = Array.isArray(data.latestSeries) ? data.latestSeries.map(normalizeItem) : [];
      
      // Fallback data if API doesn't provide latestMovies / latestSeries
      if (currentApiSource === 'backup' && latestMovies.length === 0) {
        try {
          const hot = await this.getHot();
          latestMovies = hot.movies || [];
          latestSeries = hot.series || [];
        } catch (err) {}
      }

      return {
        topPickList,
        homeList,
        latestMovies,
        latestSeries,
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
      const isBackup = currentApiSource === 'backup';
      const params = isBackup 
        ? { query, page, perPage, subjectType: 'ALL' } 
        : { keyword: query, page, perPage, subjectType };
      
      const response = await fetchWithRetry({ 
        url: `/search`, 
        params 
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
      const isBackup = currentApiSource === 'backup';
      const params: any = { page };
      if (isBackup) {
        params.type = 'ALL'; // Fallback type
      } else {
        params.perPage = perPage;
      }
      
      const response = await fetchWithRetry({ 
        url: `/trending`, 
        params
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
      const url = currentApiSource === 'backup' ? '/popular-searches' : '/popular-search';
      const response = await fetchWithRetry({ url });
      const searches = response.data?.data?.everyoneSearch || [];
      return Array.isArray(searches) ? searches.map((item: any) => item.title) : [];
    } catch (e: any) {
      console.error("Error in getPopularSearch:", e.message || e);
      return [];
    }
  },

  async getHot(): Promise<{ movies: MediaItem[], series: MediaItem[] }> {
    try {
      const response = await axios.get('https://gzmovieboxapi.septorch.tech/api/hot-movies-series', {
        params: { apikey: 'Godszeal' },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 8000
      });
      const data = response.data?.data || {};
      return {
        movies: Array.isArray(data.movie) ? data.movie.map(normalizeItem) : [],
        series: Array.isArray(data.tv) ? data.tv.map(normalizeItem) : [],
      };
    } catch (e: any) {
      console.error("Error in getHot direct fetch:", e.message || e);
      return { movies: [], series: [] };
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      if (currentApiSource === 'backup') {
        const searchRes = await this.search(query, 1, 5, 'ALL' as any);
        return searchRes.map(item => item.title);
      }
      
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
    try {
      const url = currentApiSource === 'backup' ? '/item-details' : '/detail';
      const response = await fetchWithRetry({ 
        url, 
        params: { subjectId } 
      });
      const data = response.data?.data || {};
      const subject = data.subject || {};
      const stars = data.stars || subject.stars || [];
      
      return {
        id: String(subject.subjectId || subject.id || subjectId),
        title: subject.title || 'Unknown Title',
        description: subject.description || '',
        poster: (() => {
          const p = (typeof subject.cover === 'string' ? subject.cover : subject.cover?.url) || 
                    subject.poster || 
                    subject.coverUrl || 
                    subject.image || 
                    subject.img || 
                    '';
          return sanitizeImageUrl(p, 500);
        })(),
        background: sanitizeImageUrl(subject.stills?.[0]?.url || subject.cover?.url || subject.stills || '', 1280),
        rating: subject.imdbRatingValue || subject.rating,
        contentRating: subject.contentRating || subject.mpaa || subject.ageRating,
        year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
        genres: Array.isArray(subject.genre) ? subject.genre : (typeof subject.genre === 'string' ? subject.genre.split(',') : []),
        images: Array.isArray(subject.imageList) 
          ? subject.imageList.map((img: any) => typeof img === 'string' ? sanitizeImageUrl(img, 500) : sanitizeImageUrl(img.url, 500)).filter(Boolean)
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
        detailPath: subject.detailPath || data.detailPath || undefined,
        trailer: subject.trailer,
        trailerUrl: (typeof subject.trailerUrl === 'string' ? subject.trailerUrl : subject.trailerUrl?.url) || 
                    (typeof subject.trailer === 'string' ? subject.trailer : (subject.trailer?.videoAddress?.url || subject.trailer?.url)) || 
                    (typeof data.trailerUrl === 'string' ? data.trailerUrl : data.trailerUrl?.url) || ''
      };
    } catch (e: any) {
      console.error(`[externalMovieService] getDetails failed for subjectId ${subjectId}:`, e.message);
      return {
        id: String(subjectId),
        title: "Content Unavailable",
        description: "The details for this title are currently unavailable from our provider. Please try again later.",
        poster: "",
        background: "",
        rating: "0",
        type: "Movie",
        genres: [],
        images: [],
        cast: [],
        seasons: []
      };
    }
  },
  async getRichDetails(subjectId: string): Promise<any> {
    try {
      if (currentApiSource === 'backup') return {};
      
      const response = await fetchWithRetry({ 
        url: `/rich-detail`, 
        params: { subjectId } 
      });
      return response.data?.data || {};
    } catch (e: any) {
      console.error(`[externalMovieService] getRichDetails failed for ${subjectId}:`, e.message);
      return {};
    }
  },

  async getRecommendations(subjectId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    try {
      const url = currentApiSource === 'backup' ? '/recommendations' : '/recommend';
      const response = await fetchWithRetry({ 
        url, 
        params: { subjectId, page, perPage } 
      });
      const list = response.data?.data?.items || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e: any) {
      // console.error("Error in getRecommendations:", e.message || e);
      return [];
    }
  },

  async browse(genre?: string, country?: string, page = 1, perPage = 12, subjectType = 2): Promise<MediaItem[]> {
    try {
      if (currentApiSource === 'backup') {
        if (genre || country) {
          return this.search(genre || country || '', page, perPage, 'ALL' as any);
        }
        return this.getTrending(page, perPage);
      }
      
      const response = await fetchWithRetry({ 
        url: `/browse`, 
        params: { subjectType, genre, countryName: country, page, perPage } 
      });
      const list = response.data?.data?.items || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e: any) {
      // console.error("Error in browse:", e.message || e);
      return [];
    }
  },

  async getRanking(): Promise<RankingItem[]> {
    try {
      const hot = await this.getHot();
      const items = [...hot.movies, ...hot.series].sort((a,b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      return items.map((item, index) => ({
         id: item.id,
         title: item.title,
         cover: item.poster,
         score: item.rating,
         rank: index + 1,
         type: item.type === 'Movie' ? 1 : 2,
         year: item.year
      }));
    } catch (e: any) {
      console.error("Error in getRanking override:", e.message || e);
      return [];
    }
  },

  async getPlay(subjectId: string, detailPath?: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId };
    if (detailPath) params.detailPath = detailPath;

    if (currentApiSource === 'backup') {
      if (season !== undefined && season > 0) params.season = season;
      if (episode !== undefined && episode > 0) params.episode = episode;
    } else {
      if (season !== undefined && season > 0) params.se = season;
      if (episode !== undefined && episode > 0) params.ep = episode;
    }

    try {
      const url = currentApiSource === 'backup' ? '/media' : '/play';
      const response = await fetchWithRetry({ url, params });
      const data = response.data?.data || {};
      
      let streams = data.streams || [];
      let hls = data.hls || [];
      let captions = data.subtitles || [];

      if (currentApiSource === 'backup') {
        streams = data.downloads?.data?.downloads || [];
        captions = data.subtitles?.data?.captions || data.downloads?.data?.captions || [];
      }

      const sources = [...streams, ...hls].map((s: any) => {
        let rawUrl = s.proxyUrl || s.streamUrl || s.url;
        const downloadUrl = s.downloadUrl || s.proxyUrl || s.url;

        if (currentApiSource === 'backup' && rawUrl) {
          // If the backup API has already provided a direct, high-speed 'streamUrl' proxy,
          // use it directly to avoid double-proxying and reduce network latency.
          if (!s.streamUrl) {
            rawUrl = `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
          }
        }

        return {
          quality: s.resolutions ? (String(s.resolutions).includes('p') ? s.resolutions : `${s.resolutions}p`) : 
                   (s.resolution ? String(s.resolution).includes('p') ? s.resolution : `${s.resolution}p` : (s.quality || 'Unknown')),
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
          (params.se ? `https://vidsrc.wiki/embed/tv/${subjectId}/${params.se}/${params.ep || 1}` : `https://vidsrc.wiki/embed/movie/${subjectId}`);

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
    const baseURL = currentApiSource === 'backup' ? BASE_URL_BACKUP : BASE_URL_MAIN;
    const constructedSources = [
      {
        quality: '1080p',
        url: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=1080${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=1080&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      },
      {
        quality: '720p',
        url: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=720${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=720&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      },
      {
        quality: '360p',
        url: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=360${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        downloadUrl: `${baseURL}/bff/stream?subjectId=${subjectId}&apikey=${API_KEY}&resolution=360&download=1${season ? `&se=${season}&ep=${episode || 1}` : ''}`,
        type: 'mp4' as const
      }
    ];

    return {
      sources: constructedSources,
      subtitles: [],
      embedUrl: season ? `https://vidsrc.wiki/embed/tv/${subjectId}/${season}/${episode || 1}` : `https://vidsrc.wiki/embed/movie/${subjectId}`
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
      if (currentApiSource === 'backup') {
        return {
           id: staffId,
           name: 'Unknown',
           avatar: '',
           avatarUrl: '',
           description: 'Actor capabilities are not supported in the current backup core.',
           birthday: '',
           birthPlace: ''
        };
      }
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
      if (currentApiSource === 'backup') return [];
      
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
      if (currentApiSource === 'backup') return [];
      
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
