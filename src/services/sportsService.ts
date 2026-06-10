import axios from "axios";

const SPORTS_BASE = "https://apiskeith.top/sports";
const NEWS_BASE = "https://apiskeith.top/news";

export interface SportMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  time: string;
  status: string;
  league: string;
  homeLogo?: string;
  awayLogo?: string;
}

export interface SportNews {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface Highlight {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
}

export const getLiveMatches = async (): Promise<SportMatch[]> => {
  try {
    const res = await axios.get(`${SPORTS_BASE}/live`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.matches)) {
       return res.data.matches;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch real live matches from Keith APIs, returning empty.");
    return [];
  }
};

export const getSportNews = async (): Promise<SportNews[]> => {
  try {
    const res = await axios.get(`${NEWS_BASE}/sport`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.news)) {
       return res.data.news;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch sport news from Keith APIs, returning empty.");
    return [];
  }
};

export const getHighlights = async (): Promise<Highlight[]> => {
  try {
    const res = await axios.get(`${SPORTS_BASE}/highlights`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.highlights)) {
       return res.data.highlights;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch highlights from Keith APIs, returning empty.");
    return [];
  }
};
