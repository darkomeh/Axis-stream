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

const BASE_URL = 'https://movieapi.xcasper.space/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://movieapi.xcasper.space/',
  }
});

// Helper for exponential backoff retry
async function fetchWithRetry(config: AxiosRequestConfig, retries = 3, backoff = 1000): Promise<any> {
  try {
    return await api(config);
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
  const poster = (typeof item.cover === 'string' ? item.cover : item.cover?.url) || item.poster || '';
  return {
    id: String(item.subjectId || item.id),
    title: item.title || 'Unknown Title',
    poster: poster,
    rating: item.imdbRatingValue || item.rating,
    contentRating: item.contentRating || item.mpaa || item.ageRating,
    type: item.subjectType === 2 ? 'Series' : item.subjectType === 1 ? 'Movie' : item.type,
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
    quality: item.quality,
    detailPath: item.detailPath
  };
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
          subjects: Array.isArray(op.subjects) ? op.subjects.map(normalizeItem) : [],
        })) : [],
      };
    } catch (e) {
      console.error("Error in getHomepage:", e);
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
    } catch (e) {
      console.error("Error in search:", e);
      return [];
    }
  },

  async getTrending(page = 0, perPage = 18): Promise<MediaItem[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/trending`, 
        params: { page, perPage } 
      });
      const list = response.data?.data?.subjectList || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e) {
      console.error("Error in getTrending:", e);
      return [];
    }
  },

  async getPopularSearch(): Promise<string[]> {
    try {
      const response = await fetchWithRetry({ url: `/popular-search` });
      const searches = response.data?.data?.everyoneSearch || [];
      return Array.isArray(searches) ? searches.map((item: any) => item.title) : [];
    } catch (e) {
      console.error("Error in getPopularSearch:", e);
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
    } catch (e) {
      console.error("Error in getHot:", e);
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
    } catch (e) {
      console.error("Error in getSuggestions:", e);
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
      poster: subject.cover?.url || subject.poster || '',
      background: subject.stills?.[0]?.url || subject.cover?.url || '',
      rating: subject.imdbRatingValue || subject.rating,
      contentRating: subject.contentRating || subject.mpaa || subject.ageRating,
      year: subject.releaseDate ? subject.releaseDate.substring(0, 4) : subject.year,
      genres: subject.genre ? subject.genre.split(',') : [],
      cast: stars.map((star: any) => {
        const avatar = (typeof star.avatar === 'string' ? star.avatar : star.avatar?.url) || 
                       (typeof star.cover === 'string' ? star.cover : star.cover?.url) || 
                       (typeof star.image === 'string' ? star.image : star.image?.url) || 
                       (typeof star.photo === 'string' ? star.photo : star.photo?.url) || '';
        return {
          id: String(star.staffId),
          name: star.name,
          avatar: avatar
        };
      }),
      type: subject.subjectType === 2 ? 'Series' : 'Movie',
      duration: subject.duration ? `${subject.duration} min` : undefined,
      seasons: data.resource?.seasons,
      trailerUrl: (typeof subject.trailerUrl === 'string' ? subject.trailerUrl : subject.trailerUrl?.url) || 
                  (typeof subject.trailer === 'string' ? subject.trailer : subject.trailer?.url) || 
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
    } catch (e) {
      console.error("Error in getRecommendations:", e);
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
    } catch (e) {
      console.error("Error in browse:", e);
      return [];
    }
  },

  async getRanking(): Promise<RankingItem[]> {
    try {
      const response = await fetchWithRetry({ url: `/ranking` });
      const list = response.data?.data || [];
      if (!Array.isArray(list)) return [];
      return list.map((item: any, index: number) => ({
        id: String(item.subjectId || item.id),
        title: item.title,
        cover: (typeof item.cover === 'string' ? item.cover : item.cover?.url) || item.poster || '',
        score: item.score || item.imdbRatingValue || item.rating,
        rank: index + 1,
        type: item.subjectType,
        year: item.releaseDate ? item.releaseDate.substring(0, 4) : item.year,
      }));
    } catch (e) {
      console.error("Error in getRanking:", e);
      return [];
    }
  },

  async getPlay(subjectId: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId };
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;

    const response = await fetchWithRetry({ url: `/play`, params });
    const data = response.data?.data || {};
    
    const streams = data.streams || [];
    const hls = data.hls || [];
    const captions = data.subtitles || [];

    const sources = [...streams, ...hls].map((s: any) => {
      const rawUrl = s.proxyUrl || s.url;
      return {
        quality: s.resolutions ? `${s.resolutions}p` : (s.quality || 'Unknown'),
        url: rawUrl,
        type: (s.url?.includes('.m3u8') ? 'hls' : 'mp4') as "hls" | "mp4"
      };
    }).filter((s: any) => s.url);

    const subtitles = captions.map((c: any) => ({
      language: c.language || c.lanName || c.lan || 'Unknown',
      url: c.url || '',
    })).filter((s: any) => s.url);

    return { sources, subtitles };
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
    const data = response.data?.data || {};
    const avatar = (typeof data.avatar === 'string' ? data.avatar : data.avatar?.url) || 
                   (typeof data.cover === 'string' ? data.cover : data.cover?.url) || 
                   (typeof data.image === 'string' ? data.image : data.image?.url) || 
                   (typeof data.photo === 'string' ? data.photo : data.photo?.url) || '';
    return {
      id: String(data.staffId),
      name: data.name,
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
      const response = await fetchWithRetry({ url: `/live` });
      const list = response.data?.data || [];
      if (!Array.isArray(list)) return [];
      return list.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        cover: item.cover,
        url: item.url,
        status: item.status,
        time: item.time
      }));
    } catch (e) {
      console.error("Error in getLive:", e);
      return [];
    }
  },

  async getActorWorks(staffId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    try {
      const response = await fetchWithRetry({ 
        url: `/staff/works`, 
        params: { staffId, page, perPage } 
      });
      const list = response.data?.data?.items || [];
      return Array.isArray(list) ? list.map(normalizeItem) : [];
    } catch (e) {
      console.error("Error in getActorWorks:", e);
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
      return list.map((data: any) => ({
        id: String(data.staffId),
        name: data.name,
        avatar: (typeof data.avatar === 'string' ? data.avatar : data.avatar?.url) || 
                (typeof data.cover === 'string' ? data.cover : data.cover?.url) || 
                (typeof data.image === 'string' ? data.image : data.image?.url) || 
                (typeof data.photo === 'string' ? data.photo : data.photo?.url) || ''
      }));
    } catch (e) {
      console.error("Error in getRelatedActors:", e);
      return [];
    }
  },
};
