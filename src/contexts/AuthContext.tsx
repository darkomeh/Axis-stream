import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MediaItem } from '../types';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface SubtitlePreferences {
  fontSize: number;
  color: string;
  backgroundColor: string;
  verticalPosition: number;
}

export interface UserPreferences {
  autoPlayNext: boolean;
  autoPlay: boolean;
  defaultQuality: string;
  skipIntro: boolean;
  playbackSpeed: number;
  subtitleSettings: SubtitlePreferences;
}

export interface ContinueWatchingItem extends MediaItem {
  progress: number;
  duration: number;
  updatedAt: number;
  season?: number;
  episode?: number;
}

export interface UserStats {
  watchTimeMinutes: number;
  totalViews: number;
  lastWatchDate: string | null;
  currentStreak: number;
  genreProgress: Record<string, number>;
  weekendCount: number;
  badges: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, email: string, avatar?: string) => void;
  logout: () => void;
  watchlist: MediaItem[];
  addToWatchlist: (item: MediaItem) => void;
  removeFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  history: MediaItem[];
  addToHistory: (item: MediaItem) => void;
  clearHistory: () => void;
  
  // New Features
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  stats: UserStats;
  isAdmin: boolean;
  systemMessage: string | null;
  isMaintenance: boolean;
  isBanned: boolean;
  broadcastLevel: 'info' | 'warning' | 'critical';
  siteConfig: { siteName: string; brandColor: string; tagline: string; logoUrl?: string };
  addWatchTime: (minutes: number) => void;
  trackWatchActivity: (item: MediaItem) => void;
  following: string[];
  toggleFollow: (id: string) => void;
  isFollowing: (id: string) => boolean;
  continueWatching: ContinueWatchingItem[];
  updateContinueWatching: (item: ContinueWatchingItem) => void;
  removeFromContinueWatching: (id: string) => void;
  setLastActionType: (type: string | null) => void;
}

const initialStats: UserStats = {
  watchTimeMinutes: 0,
  totalViews: 0,
  lastWatchDate: null,
  currentStreak: 0,
  genreProgress: {},
  weekendCount: 0,
  badges: []
};

const defaultPreferences: UserPreferences = {
  autoPlayNext: true,
  autoPlay: true,
  defaultQuality: 'auto',
  skipIntro: false,
  playbackSpeed: 1,
  subtitleSettings: {
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0)',
    verticalPosition: 4,
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);
  
  // New State
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [following, setFollowing] = useState<string[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [siteConfig, setSiteConfig] = useState<{ siteName: string; brandColor: string; tagline: string; logoUrl?: string; }>({ siteName: 'AxisTV', brandColor: '#E50914', tagline: 'Home of Endless Movies and Series', logoUrl: 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg' });
  const [lastActionType, setLastActionType] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const data = await res.json();
        setSystemMessage(data.broadcastMessage);
        setIsMaintenance(data.maintenanceMode);
        if (data.broadcastLevel) setBroadcastLevel(data.broadcastLevel);
        if (data.siteConfig) setSiteConfig(data.siteConfig);
        retryCount = 0; // Reset on success
      } catch (e) {
        // Only log after 3 consecutive failures to avoid noise during server restarts
        retryCount++;
        if (retryCount >= 3) {
          console.error("Failed to fetch system status after retries", e);
        }
      }
    };
    
    // Initial fetch with slight delay to ensure server is ready
    const timer = setTimeout(fetchStatus, 1000);
    const interval = setInterval(fetchStatus, 30000); // 30s polling
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('axis_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      const storedWatchlist = localStorage.getItem(`axis_watchlist_${user.id}`);
      if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
      
      const storedHistory = localStorage.getItem(`axis_history_${user.id}`);
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedPrefs = localStorage.getItem(`axis_prefs_${user.id}`);
      if (storedPrefs) setPreferences({ ...defaultPreferences, ...JSON.parse(storedPrefs) });

      const storedStats = localStorage.getItem(`axis_stats_${user.id}`);
      if (storedStats) {
        const parsed = JSON.parse(storedStats);
        setStats({ ...initialStats, ...parsed });
      } else {
        setStats(initialStats);
      }

      const storedFollowing = localStorage.getItem(`axis_following_${user.id}`);
      if (storedFollowing) setFollowing(JSON.parse(storedFollowing));

      const storedContinueWatching = localStorage.getItem(`axis_continue_watching_${user.id}`);
      if (storedContinueWatching) setContinueWatching(JSON.parse(storedContinueWatching));
    } else {
      setWatchlist([]);
      setHistory([]);
      setPreferences(defaultPreferences);
      setStats(initialStats);
      setFollowing([]);
      setContinueWatching([]);
    }
  }, [user]);

  const isAdmin = useMemo(() => {
    return user?.username.toLowerCase() === 'great' && user?.email === 'greatmayuku2@gmail.com';
  }, [user]);

  // Sync with server for Admin view
  useEffect(() => {
    if (user && !isBanned) {
      const syncData = async () => {
        try {
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...user,
              watchlistCount: watchlist.length,
              historyCount: history.length,
              stats,
              preferences,
              lastAction: new Date().toISOString(),
              lastActionType
            })
          });
          
          if (res.status === 403) {
            setIsBanned(true);
            return;
          }

          if (lastActionType) setLastActionType(null); // Clear after sync
        } catch (e) {
          console.error("Sync failed", e);
        }
      };
      syncData();
    }
  }, [user, watchlist.length, history.length, stats, preferences, isBanned, lastActionType]);

  const login = useCallback((username: string, email: string, avatar?: string) => {
    const newUser = { 
      id: email, 
      username, 
      email, 
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` 
    };
    setUser(newUser);
    setLastActionType(`LOGGED_IN: ${username}`);
    localStorage.setItem('axis_user', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('axis_user');
  }, []);

  const addToWatchlist = useCallback((item: MediaItem) => {
    if (!user) return;
    setWatchlist(prev => {
      const updated = [...prev.filter(i => i.id !== item.id), item];
      setLastActionType(`WATCHLIST_ADD: ${item.title}`);
      localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const removeFromWatchlist = useCallback((id: string) => {
    if (!user) return;
    setWatchlist(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.some(i => i.id === id);
  }, [watchlist]);

  const addToHistory = useCallback((item: MediaItem) => {
    if (!user) return;
    setHistory(prev => {
      const updated = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 50);
      setLastActionType(`WATCH_START: ${item.title}`);
      localStorage.setItem(`axis_history_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const clearHistory = useCallback(() => {
    if (!user) return;
    setHistory([]);
    localStorage.removeItem(`axis_history_${user.id}`);
  }, [user]);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    if (!user) return;
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      localStorage.setItem(`axis_prefs_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const addWatchTime = useCallback((minutes: number) => {
    if (!user) return;
    setStats(prev => {
      const updated = { ...prev, watchTimeMinutes: prev.watchTimeMinutes + minutes };
      localStorage.setItem(`axis_stats_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const trackWatchActivity = useCallback((item: MediaItem) => {
    if (!user) return;
    setStats(prev => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      let newStreak = prev.currentStreak;
      if (prev.lastWatchDate) {
        const lastDate = new Date(prev.lastWatchDate);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const category = item.type === "Series" ? "Series" : (item.genres?.[0] || "Film");
      const newGenreProgress = { ...prev.genreProgress, [category]: (prev.genreProgress[category] || 0) + 1 };
      
      const newBadges = [...prev.badges];
      if (newStreak >= 7 && !newBadges.includes('7-day streak')) newBadges.push('7-day streak');
      if (newGenreProgress['Horror'] >= 5 && !newBadges.includes('Horror Master')) newBadges.push('Horror Master');
      if (newGenreProgress['Romance'] >= 5 && !newBadges.includes('Romance King')) newBadges.push('Romance King');
      if (isWeekend && !newBadges.includes('Weekend Binger')) {
        // Simulating 3+ watches in a weekend day
        const dayCount = (prev.lastWatchDate === today) ? (prev.totalViews % 3) + 1 : 1;
        if (dayCount >= 3) newBadges.push('Weekend Binger');
      }

      const updated = {
        ...prev,
        totalViews: prev.totalViews + 1,
        lastWatchDate: today,
        currentStreak: newStreak,
        genreProgress: newGenreProgress,
        badges: newBadges
      };
      
      localStorage.setItem(`axis_stats_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const toggleFollow = useCallback((id: string) => {
    if (!user) return;
    setFollowing(prev => {
      const updated = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(`axis_following_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const isFollowing = useCallback((id: string) => following.includes(id), [following]);

  const updateContinueWatching = useCallback((item: ContinueWatchingItem) => {
    if (!user) return;
    setContinueWatching(prev => {
      const existing = prev.filter(i => i.id !== item.id);
      const updated = [item, ...existing].slice(0, 20);
      localStorage.setItem(`axis_continue_watching_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const removeFromContinueWatching = useCallback((id: string) => {
    if (!user) return;
    setContinueWatching(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem(`axis_continue_watching_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const value = useMemo(() => ({
    user, login, logout, isAdmin, 
    systemMessage, isMaintenance, isBanned,
    broadcastLevel, siteConfig,
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, clearHistory,
    preferences, updatePreferences,
    stats, addWatchTime, trackWatchActivity,
    following, toggleFollow, isFollowing,
    continueWatching, updateContinueWatching, removeFromContinueWatching,
    setLastActionType
  }), [
    user, login, logout, isAdmin,
    systemMessage, isMaintenance, isBanned,
    broadcastLevel, siteConfig,
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, clearHistory,
    preferences, updatePreferences,
    stats, addWatchTime, trackWatchActivity,
    following, toggleFollow, isFollowing,
    continueWatching, updateContinueWatching, removeFromContinueWatching,
    setLastActionType
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
