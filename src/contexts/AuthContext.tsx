import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MediaItem } from '../types';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: MediaItem[];
}

export interface UserPreferences {
  autoPlayNext: boolean;
  autoPlay: boolean;
  defaultQuality: string;
  skipIntro: boolean;
  playbackSpeed: number;
}

export interface ContinueWatchingItem extends MediaItem {
  progress: number;
  duration: number;
  updatedAt: number;
  season?: number;
  episode?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, email: string) => void;
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
  stats: { watchTimeMinutes: number };
  addWatchTime: (minutes: number) => void;
  following: string[];
  toggleFollow: (id: string) => void;
  isFollowing: (id: string) => boolean;
  customPlaylists: Playlist[];
  createPlaylist: (name: string) => string | undefined;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, item: MediaItem) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
  continueWatching: ContinueWatchingItem[];
  updateContinueWatching: (item: ContinueWatchingItem) => void;
  removeFromContinueWatching: (id: string) => void;
}

const defaultPreferences: UserPreferences = {
  autoPlayNext: true,
  autoPlay: true,
  defaultQuality: 'auto',
  skipIntro: false,
  playbackSpeed: 1,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);
  
  // New State
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [stats, setStats] = useState({ watchTimeMinutes: 0 });
  const [following, setFollowing] = useState<string[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);

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
      if (storedStats) setStats(JSON.parse(storedStats));

      const storedFollowing = localStorage.getItem(`axis_following_${user.id}`);
      if (storedFollowing) setFollowing(JSON.parse(storedFollowing));

      const storedPlaylists = localStorage.getItem(`axis_playlists_${user.id}`);
      if (storedPlaylists) setCustomPlaylists(JSON.parse(storedPlaylists));

      const storedContinueWatching = localStorage.getItem(`axis_continue_watching_${user.id}`);
      if (storedContinueWatching) setContinueWatching(JSON.parse(storedContinueWatching));
    } else {
      setWatchlist([]);
      setHistory([]);
      setPreferences(defaultPreferences);
      setStats({ watchTimeMinutes: 0 });
      setFollowing([]);
      setCustomPlaylists([]);
      setContinueWatching([]);
    }
  }, [user]);

  const login = useCallback((username: string, email: string) => {
    const newUser = { id: email, username, email, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` };
    setUser(newUser);
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
      const updated = { watchTimeMinutes: prev.watchTimeMinutes + minutes };
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

  const createPlaylist = useCallback((name: string) => {
    if (!user) return;
    const newPlaylist: Playlist = { id: Date.now().toString(), name, items: [] };
    setCustomPlaylists(prev => {
      const updated = [...prev, newPlaylist];
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    return newPlaylist.id;
  }, [user]);

  const deletePlaylist = useCallback((id: string) => {
    if (!user) return;
    setCustomPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const addToPlaylist = useCallback((playlistId: string, item: MediaItem) => {
    if (!user) return;
    setCustomPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId && !p.items.some(i => i.id === item.id)) {
          return { ...p, items: [...p.items, item] };
        }
        return p;
      });
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const removeFromPlaylist = useCallback((playlistId: string, itemId: string) => {
    if (!user) return;
    setCustomPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          return { ...p, items: p.items.filter(i => i.id !== itemId) };
        }
        return p;
      });
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

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
    user, login, logout, 
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, clearHistory,
    preferences, updatePreferences,
    stats, addWatchTime,
    following, toggleFollow, isFollowing,
    customPlaylists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    continueWatching, updateContinueWatching, removeFromContinueWatching
  }), [
    user, login, logout, 
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, clearHistory,
    preferences, updatePreferences,
    stats, addWatchTime,
    following, toggleFollow, isFollowing,
    customPlaylists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    continueWatching, updateContinueWatching, removeFromContinueWatching
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
