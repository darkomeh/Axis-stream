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

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL
});

// Helper for exponential backoff retry
async function fetchWithRetry(config: AxiosRequestConfig, retries = 3, backoff = 1000): Promise<any> {
  try {
    const response = await api(config);
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      throw new Error("Received HTML instead of JSON. API might be misconfigured.");
    }
    if (response.data && response.data.error) {
      throw new Error(response.data.error);
    }
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
  async getHomepage(): Promise<HomepageData> {
    return await fetchWithRetry({ url: `/homepage` });
  },

  async search(query: string, page = 1, perPage = 30, subjectType = 0): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    return await fetchWithRetry({ url: `/search`, params: { keyword: query, page, perPage, subjectType } });
  },

  async getTrending(page = 0, perPage = 18): Promise<MediaItem[]> {
    return await fetchWithRetry({ url: `/trending`, params: { page, perPage } });
  },

  async getPopularSearch(): Promise<string[]> {
    return await fetchWithRetry({ url: `/popular-search` });
  },

  async getHot(): Promise<{ movies: MediaItem[], series: MediaItem[] }> {
    return await fetchWithRetry({ url: `/hot` });
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      return await fetchWithRetry({ url: `/search/suggest`, params: { keyword: query } });
    } catch (e) {
      console.error("Error in getSuggestions:", e);
      return [];
    }
  },

  async getDetails(subjectId: string): Promise<ItemDetails> {
    return await fetchWithRetry({ url: `/detail`, params: { subjectId } });
  },

  async getRichDetails(subjectId: string): Promise<any> {
    return await fetchWithRetry({ url: `/rich-detail`, params: { subjectId } });
  },

  async getRecommendations(subjectId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    return await fetchWithRetry({ url: `/recommend`, params: { subjectId, page, perPage } });
  },

  async browse(genre?: string, country?: string, page = 1, perPage = 12, subjectType = 2): Promise<MediaItem[]> {
    return await fetchWithRetry({ url: `/browse`, params: { subjectType, genre, countryName: country, page, perPage } });
  },

  async getRanking(): Promise<RankingItem[]> {
    return await fetchWithRetry({ url: `/ranking` });
  },

  async getPlay(subjectId: string, season?: number, episode?: number): Promise<MediaData> {
    const params: any = { subjectId };
    if (season !== undefined && season > 0) params.se = season;
    if (episode !== undefined && episode > 0) params.ep = episode;
    return await fetchWithRetry({ url: `/play`, params });
  },

  async getCaptions(subjectId: string, streamId: string): Promise<any> {
    return await fetchWithRetry({ url: `/captions`, params: { subjectId, streamId } });
  },

  async getActorDetails(staffId: string): Promise<Actor> {
    return await fetchWithRetry({ url: `/staff/detail`, params: { staffId } });
  },

  async getLive(): Promise<LiveMatch[]> {
    return await fetchWithRetry({ url: `/live` });
  },

  async getActorWorks(staffId: string, page = 1, perPage = 10): Promise<MediaItem[]> {
    return await fetchWithRetry({ url: `/staff/works`, params: { staffId, page, perPage } });
  },

  async getRelatedActors(staffId: string): Promise<Actor[]> {
    return await fetchWithRetry({ url: `/staff/related`, params: { staffId } });
  },
};
