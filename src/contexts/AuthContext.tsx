import React, { createContext, useContext, useState, useEffect } from 'react';
import { MediaItem } from '../types';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);

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
    } else {
      setWatchlist([]);
      setHistory([]);
    }
  }, [user]);

  const login = (username: string, email: string) => {
    const newUser = { id: email, username, email, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` };
    setUser(newUser);
    localStorage.setItem('axis_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('axis_user');
  };

  const addToWatchlist = (item: MediaItem) => {
    if (!user) return;
    const updated = [...watchlist.filter(i => i.id !== item.id), item];
    setWatchlist(updated);
    localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
  };

  const removeFromWatchlist = (id: string) => {
    if (!user) return;
    const updated = watchlist.filter(i => i.id !== id);
    setWatchlist(updated);
    localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
  };

  const isInWatchlist = (id: string) => {
    return watchlist.some(i => i.id === id);
  };

  const addToHistory = (item: MediaItem) => {
    if (!user) return;
    const updated = [item, ...history.filter(i => i.id !== item.id)].slice(0, 50); // Keep last 50
    setHistory(updated);
    localStorage.setItem(`axis_history_${user.id}`, JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (!user) return;
    setHistory([]);
    localStorage.removeItem(`axis_history_${user.id}`);
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, 
      watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
      history, addToHistory, clearHistory
    }}>
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
