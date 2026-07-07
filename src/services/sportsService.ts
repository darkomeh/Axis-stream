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

// Fallback data
const MOCK_MATCHES: SportMatch[] = [
  { id: "1", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeScore: "2", awayScore: "1", time: "85'", status: "LIVE", league: "La Liga", homeLogo: "https://i.ibb.co/6y4mXhW/real-madrid.png", awayLogo: "https://i.ibb.co/q1zZ8bX/barcelona.png" },
  { id: "2", homeTeam: "Arsenal", awayTeam: "Man City", homeScore: "0", awayScore: "0", time: "12'", status: "LIVE", league: "Premier League" },
  { id: "3", homeTeam: "Lakers", awayTeam: "Warriors", homeScore: "112", awayScore: "108", time: "FINAL", status: "FT", league: "NBA" },
  { id: "4", homeTeam: "Bayern", awayTeam: "Dortmund", homeScore: "3", awayScore: "0", time: "FINAL", status: "FT", league: "Bundesliga" },
];

const MOCK_NEWS: SportNews[] = [
  { id: "n1", title: "Record Breaking Transfer in Premier League", description: "The biggest transfer of the summer has just been concluded as teams prepare for the new season.", imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop", source: "Sports Update", url: "#", publishedAt: "2h ago" },
  { id: "n2", title: "Championship Finals: Everything you need to know", description: "A comprehensive guide to the upcoming global championship.", imageUrl: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=600&auto=format&fit=crop", source: "BBC Sports", url: "#", publishedAt: "4h ago" },
  { id: "n3", title: "Tech in Sports: The new era of VAR", description: "How artificial intelligence is changing referee decisions in modern matches.", imageUrl: "https://images.unsplash.com/photo-1508344928928-7137b29de216?q=80&w=600&auto=format&fit=crop", source: "Tech News", url: "#", publishedAt: "5h ago" }
];

const MOCK_HIGHLIGHTS: Highlight[] = [
  { id: "h1", title: "Unbelievable Last Minute Goal! 😱", thumbnail: "https://images.unsplash.com/photo-1518605368461-1ee7c512066c?q=80&w=600&auto=format&fit=crop", videoUrl: "#", duration: "4:05" },
  { id: "h2", title: "Top 10 NBA Dunks of the Week", thumbnail: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=600&auto=format&fit=crop", videoUrl: "#", duration: "8:21" },
  { id: "h3", title: "Champions League Semi-Final Highlights", thumbnail: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=600&auto=format&fit=crop", videoUrl: "#", duration: "12:30" }
];

export const getLiveMatches = async (): Promise<SportMatch[]> => {
  try {
    const res = await axios.get(`${SPORTS_BASE}/live`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.matches)) {
       return res.data.matches;
    }
    return MOCK_MATCHES;
  } catch (error) {
    console.warn("Failed to fetch real live matches from Keith APIs, using fallback.");
    return MOCK_MATCHES;
  }
};

export const getSportNews = async (): Promise<SportNews[]> => {
  try {
    const res = await axios.get(`${NEWS_BASE}/sport`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.news)) {
       return res.data.news;
    }
    return MOCK_NEWS;
  } catch (error) {
    console.warn("Failed to fetch sport news from Keith APIs, using fallback.");
    return MOCK_NEWS;
  }
};

export const getHighlights = async (): Promise<Highlight[]> => {
  try {
    const res = await axios.get(`${SPORTS_BASE}/highlights`, { timeout: 4000 });
    if (res.data && Array.isArray(res.data.highlights)) {
       return res.data.highlights;
    }
    return MOCK_HIGHLIGHTS;
  } catch (error) {
    console.warn("Failed to fetch highlights from Keith APIs, using fallback.");
    return MOCK_HIGHLIGHTS;
  }
};
