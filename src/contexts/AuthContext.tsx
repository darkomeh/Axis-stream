import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MediaItem } from '../types';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  auth, 
  db 
} from '../lib/firebase';
import { 
  loginWithGoogle, 
  logoutUser,
  addWatchHistory,
  addFavorite,
  removeFavorite,
  removeContinueWatching as firebaseRemoveContinueWatching,
  getWatchHistory,
  removeWatchHistory,
  clearWatchHistory,
  deleteUserProfileData as firebaseDeleteUserProfileData,
  updateProfile as firebaseUpdateProfile,
  saveContinueWatching as firebaseSaveContinueWatching,
  sendChatMessage as firebaseSendChatMessage,
  trackVisitor,
  trackWatchTime,
  createSupportTicket,
  getSupportTickets,
  replyToTicket,
  getAdvancedUserStats,
  getGlobalStats,
  handleFirestoreError,
  OperationType
} from '../services/firebaseService';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc,
  getDoc
} from 'firebase/firestore';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: 'user' | 'admin' | 'moderator';
  joinedAt?: string;
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
  showTrailers: boolean;
  defaultQuality: string;
  skipIntro: boolean;
  playbackSpeed: number;
  dataSaver: boolean;
  subtitleSettings: SubtitlePreferences;
  theme?: string;
  accentColor?: string;
  kidsMode?: boolean;
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

export interface Playlist {
  id: string;
  name: string;
  items: MediaItem[];
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, email: string, avatar?: string) => void;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (data: { name?: string, photoURL?: string, bio?: string, username?: string }) => Promise<void>;
  saveContinueWatching: (item: ContinueWatchingItem) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  submitSupportTicket: (subject: string, message: string) => Promise<void>;
  trackWatchTime: (seconds: number) => Promise<void>;
  getSupportTickets: () => Promise<any[]>;
  replyToSupportTicket: (ticketId: string, text: string) => Promise<void>;
  getGlobalAnalytics: () => Promise<any>;
  logout: () => void;
  watchlist: MediaItem[];
  addToWatchlist: (item: MediaItem) => void;
  removeFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  history: MediaItem[];
  addToHistory: (item: MediaItem) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  featuredCollection: MediaItem[];
  updateFeaturedCollection: (items: MediaItem[]) => void;
  
  // New Features
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  stats: UserStats;
  playlists: Playlist[];
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, item: MediaItem) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
  isAdmin: boolean;
  systemMessage: string | null;
  isMaintenance: boolean;
  isBanned: boolean;
  broadcastLevel: 'info' | 'warning' | 'critical';
  siteConfig: { siteName: string; brandColor: string; tagline: string; logoUrl?: string; streamSource?: 'xcasper' | 'imbed' };
  addWatchTime: (minutes: number) => void;
  trackWatchActivity: (item: MediaItem) => void;
  following: string[];
  toggleFollow: (id: string) => void;
  isFollowing: (id: string) => boolean;
  continueWatching: ContinueWatchingItem[];
  updateContinueWatching: (item: ContinueWatchingItem) => void;
  removeFromContinueWatching: (id: string) => Promise<void>;
  setLastActionType: (type: string | null) => void;
  isLoginPopupOpen: boolean;
  openLoginPopup: () => void;
  closeLoginPopup: () => void;
  deleteProfileData: () => Promise<void>;
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

export const defaultPreferences: UserPreferences = {
  autoPlayNext: true,
  autoPlay: true,
  showTrailers: true,
  defaultQuality: 'auto',
  skipIntro: false,
  playbackSpeed: 1,
  dataSaver: false,
  kidsMode: false,
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);
  const [featuredCollection, setFeaturedCollection] = useState<MediaItem[]>([]);
  
  // New State
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [siteConfig, setSiteConfig] = useState<{ siteName: string; brandColor: string; tagline: string; logoUrl?: string; streamSource?: 'xcasper' | 'imbed'; }>({ siteName: 'Axis TV', brandColor: '#E50914', tagline: 'Your Movie Plug', logoUrl: 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg', streamSource: 'xcasper' });
  const [lastActionType, setLastActionType] = useState<string | null>(null);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  const openLoginPopup = useCallback(() => setIsLoginPopupOpen(true), []);
  const closeLoginPopup = useCallback(() => setIsLoginPopupOpen(false), []);

  useEffect(() => {
    let retryCount = 0;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const text = await res.text();
        if (text.startsWith('<')) throw new Error('Vercel HTML fallback');
        
        const data = JSON.parse(text);
        setSystemMessage(data.broadcastMessage);
        setIsMaintenance(data.maintenanceMode);
        if (data.broadcastLevel) setBroadcastLevel(data.broadcastLevel);
        if (data.siteConfig) setSiteConfig(data.siteConfig);
        retryCount = 0; // Reset on success
      } catch (e) {
        // Only log after 3 consecutive failures to avoid noise during server restarts
        retryCount++;
        if (retryCount >= 3) {
          // console.warn("Failed to fetch system status after retries (expected on Vercel)");
        }
      }
    };
    
    // Initial fetch with slight delay to ensure server is ready
    const timer = setTimeout(fetchStatus, 1000);
    const interval = setInterval(() => {
      if (!document.hidden && window.location.pathname.startsWith('/admin')) {
        fetchStatus();
      }
    }, 60000); // 60s polling only when visible and in admin
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
      if (!fUser) {
        setUser(null);
        localStorage.removeItem('axis_user');
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of user profile
  useEffect(() => {
    if (firebaseUser) {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isOwner = (data.email || firebaseUser.email || '').toLowerCase() === 'greatmayuku2@gmail.com';
          const newUser = {
            id: firebaseUser.uid,
            username: isOwner ? '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永' : (data.username || data.name || 'User'),
            name: isOwner ? '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永' : (data.name || data.username || 'User'),
            email: data.email || firebaseUser.email || '',
            avatar: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            bio: data.bio || '',
            role: data.role || 'user',
            joinedAt: firebaseUser.metadata.creationTime || new Date().toISOString()
          };
          setUser(newUser);
          setIsBanned(data.isBanned || false);
          localStorage.setItem('axis_user', JSON.stringify(newUser));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser]);

  // Sync Favorites (Watchlist) from Firestore
  useEffect(() => {
    if (firebaseUser) {
      const q = query(
        collection(db, `users/${firebaseUser.uid}/favorites`),
        orderBy('addedAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.data().movieId,
          title: doc.data().title,
          poster: doc.data().poster || '',
          type: doc.data().type || 'Movie',
          rating: doc.data().rating || '',
          year: doc.data().year || '',
        } as MediaItem));
        setWatchlist(items);
        localStorage.setItem(`axis_watchlist_${firebaseUser.uid}`, JSON.stringify(items));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}/favorites`);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser]);

  // Sync Watch History from Firestore
  useEffect(() => {
    if (firebaseUser) {
      const q = query(
        collection(db, `users/${firebaseUser.uid}/watchHistory`),
        orderBy('watchedAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.data().movieId,
          title: doc.data().title,
          type: doc.data().type || 'Movie',
          poster: doc.data().poster || '',
          year: doc.data().year || '',
          rating: doc.data().rating || ''
        } as MediaItem));
        setHistory(items);
        localStorage.setItem(`axis_history_${firebaseUser.uid}`, JSON.stringify(items));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}/watchHistory`);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser]);

  // Sync Continue Watching from Firestore
  useEffect(() => {
    if (firebaseUser) {
      const q = query(
        collection(db, `users/${firebaseUser.uid}/continueWatching`),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id || doc.data().movieId,
          title: doc.data().title,
          progress: doc.data().lastPosition || 0,
          duration: doc.data().duration || 1,
          type: doc.data().type || 'Movie',
          poster: doc.data().poster || '',
          background: doc.data().background || '',
          avgHueDark: doc.data().avgHueDark || '',
          season: doc.data().season || undefined,
          episode: doc.data().episode || undefined,
          rating: doc.data().rating || '',
          year: doc.data().year || '',
          updatedAt: doc.data().updatedAt ? (doc.data().updatedAt.toMillis ? doc.data().updatedAt.toMillis() : doc.data().updatedAt) : Date.now()
        } as ContinueWatchingItem));
        setContinueWatching(items);
        localStorage.setItem(`axis_continue_watching_${firebaseUser.uid}`, JSON.stringify(items));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}/continueWatching`);
      });
      return () => unsubscribe();
    }
  }, [firebaseUser]);

  const isAdmin = useMemo(() => {
    return user?.email === 'greatmayuku2@gmail.com' || user?.role === 'admin';
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
          
          const text = await res.text();
          if (text.startsWith('<')) {
            // Vercel fallback
            if (lastActionType) setLastActionType(null); // Clear after sync
            return;
          }

          if (lastActionType) setLastActionType(null); // Clear after sync
        } catch (e) {
          console.warn("Sync failed (expected on Vercel without backend)", e);
        }
      };
      syncData();
    }
  }, [user, watchlist.length, history.length, stats, preferences, isBanned, lastActionType]);

  const login = useCallback((username: string, email: string, avatar?: string) => {
    const isOwner = email.toLowerCase() === 'greatmayuku2@gmail.com';
    const newUser = { 
      id: email, 
      username: isOwner ? '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永' : username, 
      name: isOwner ? '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永' : username,
      email, 
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` 
    };
    setUser(newUser);
    setLastActionType(`LOGGED_IN: ${username}`);
    localStorage.setItem('axis_user', JSON.stringify(newUser));
  }, []);

  const handleLoginWithGoogle = useCallback(async () => {
    await loginWithGoogle();
  }, []);

  const handleUpdateProfile = useCallback(async (data: { name?: string, photoURL?: string, bio?: string, username?: string }) => {
    await firebaseUpdateProfile(data);
  }, []);

  const handleSaveContinueWatching = useCallback(async (item: ContinueWatchingItem) => {
    await firebaseSaveContinueWatching(item);
  }, []);

  const handleSendChatMessage = useCallback(async (text: string) => {
    await firebaseSendChatMessage(text);
  }, []);

  const handleSubmitSupportTicket = useCallback(async (subject: string, message: string) => {
    await createSupportTicket(subject, message);
  }, []);

  const handleTrackWatchTime = useCallback(async (seconds: number) => {
    await trackWatchTime(seconds);
  }, []);

  const handleGetSupportTickets = useCallback(async () => {
    return await getSupportTickets() || [];
  }, []);

  const handleReplyToSupportTicket = useCallback(async (ticketId: string, text: string) => {
    await replyToTicket(ticketId, text);
  }, []);

  const handleGetGlobalAnalytics = useCallback(async () => {
    return await getGlobalStats();
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    localStorage.removeItem('axis_user');
  }, []);

  const addToWatchlist = useCallback(async (item: MediaItem) => {
    if (!user) return;
    if (firebaseUser) {
      await addFavorite(item);
    } else {
      setWatchlist(prev => {
        const updated = [...prev.filter(i => i.id !== item.id), item];
        setLastActionType(`WATCHLIST_ADD: ${item.title}`);
        localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const removeFromWatchlist = useCallback(async (id: string) => {
    if (!user) return;
    if (firebaseUser) {
      await removeFavorite(id);
    } else {
      setWatchlist(prev => {
        const updated = prev.filter(i => i.id !== id);
        localStorage.setItem(`axis_watchlist_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.some(i => i.id === id);
  }, [watchlist]);

  const addToHistory = useCallback(async (item: MediaItem) => {
    if (!user) return;
    if (firebaseUser) {
      await addWatchHistory(item);
    } else {
      setHistory(prev => {
        const updated = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 50);
        setLastActionType(`WATCH_START: ${item.title}`);
        localStorage.setItem(`axis_history_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const removeFromHistory = useCallback(async (id: string) => {
    if (!user) return;
    if (firebaseUser) {
      await removeWatchHistory(id);
    } else {
      setHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        setLastActionType(`HISTORY_REMOVE: ${id}`);
        localStorage.setItem(`axis_history_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    if (firebaseUser) {
      await clearWatchHistory();
    } else {
      setHistory([]);
      localStorage.removeItem(`axis_history_${user.id}`);
    }
  }, [user, firebaseUser]);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      const key = user ? `axis_prefs_${user.id}` : `axis_prefs_guest`;
      localStorage.setItem(key, JSON.stringify(updated));
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
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      let newStreak = prev.currentStreak;
      if (prev.lastWatchDate) {
        if (prev.lastWatchDate === today) {
          // Already watched today, keep current streak
          newStreak = prev.currentStreak || 1;
        } else {
          const parts = prev.lastWatchDate.split('-');
          const lastDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const todayDate = new Date(year, now.getMonth(), now.getDate());
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak = (prev.currentStreak || 0) + 1;
          } else {
            newStreak = 1;
          }
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

  const updateContinueWatching = useCallback(async (item: ContinueWatchingItem) => {
    if (firebaseUser) {
      await firebaseSaveContinueWatching(item);
    } else if (user) {
      setContinueWatching(prev => {
        const existing = prev.filter(i => i.id !== item.id);
        const updated = [item, ...existing].slice(0, 20);
        localStorage.setItem(`axis_continue_watching_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const removeFromContinueWatching = useCallback(async (id: string) => {
    if (!user) return;
    if (firebaseUser) {
      await firebaseRemoveContinueWatching(id);
    } else {
      setContinueWatching(prev => {
        const updated = prev.filter(i => i.id !== id);
        localStorage.setItem(`axis_continue_watching_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [user, firebaseUser]);

  const createPlaylist = useCallback((name: string) => {
    if (!user) return;
    setPlaylists(prev => {
      const updated = [...prev, { id: Date.now().toString(), name, items: [], createdAt: Date.now() }];
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      setLastActionType(`PLAYLIST_CREATE: ${name}`);
      return updated;
    });
  }, [user]);

  const deletePlaylist = useCallback((id: string) => {
    if (!user) return;
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      setLastActionType(`PLAYLIST_DELETE: ${id}`);
      return updated;
    });
  }, [user]);

  const addToPlaylist = useCallback((playlistId: string, item: MediaItem) => {
    if (!user) return;
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId && !p.items.some(i => i.id === item.id)) {
          return { ...p, items: [...p.items, item] };
        }
        return p;
      });
      localStorage.setItem(`axis_playlists_${user.id}`, JSON.stringify(updated));
      setLastActionType(`PLAYLIST_ADD: ${item.title}`);
      return updated;
    });
  }, [user]);

  const removeFromPlaylist = useCallback((playlistId: string, itemId: string) => {
    if (!user) return;
    setPlaylists(prev => {
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

  const deleteProfileData = useCallback(async () => {
    if (!user) return;
    try {
      if (firebaseUser) {
        await firebaseDeleteUserProfileData(firebaseUser.uid);
      }
      const keysToClear = [
        `axis_watchlist_${user.id}`,
        `axis_history_${user.id}`,
        `axis_continue_watching_${user.id}`,
        `axis_prefs_${user.id}`,
        `axis_stats_${user.id}`,
        `axis_following_${user.id}`,
        `axis_playlists_${user.id}`
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      await logout();
      setLastActionType("PROFILE_DELETED");
    } catch (error) {
      console.error("Error deleting profile data:", error);
      throw error;
    }
  }, [user, firebaseUser, logout]);

  const updateFeaturedCollection = useCallback((items: MediaItem[]) => {
    if (items.length > 6) return; // Enforce limit
    setFeaturedCollection(items);
    if (user) {
      localStorage.setItem(`axis_featured_${user.id}`, JSON.stringify(items));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const storedFeatured = localStorage.getItem(`axis_featured_${user.id}`);
      if (storedFeatured) setFeaturedCollection(JSON.parse(storedFeatured));
      
      const storedPrefs = localStorage.getItem(`axis_prefs_${user.id}`);
      if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
      
      const storedStats = localStorage.getItem(`axis_stats_${user.id}`);
      if (storedStats) {
        const statsData = JSON.parse(storedStats);
        if (statsData.lastWatchDate) {
          const parts = statsData.lastWatchDate.split('-');
          const lastDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const now = new Date();
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            statsData.currentStreak = 0;
            localStorage.setItem(`axis_stats_${user.id}`, JSON.stringify(statsData));
          }
        }
        setStats(statsData);
      }
      
      const storedPlaylists = localStorage.getItem(`axis_playlists_${user.id}`);
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
      
      const storedFollowing = localStorage.getItem(`axis_following_${user.id}`);
      if (storedFollowing) setFollowing(JSON.parse(storedFollowing));
    } else {
      setFeaturedCollection([]);
      const storedPrefs = localStorage.getItem('axis_prefs_guest');
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      } else {
        setPreferences(defaultPreferences);
      }
      setStats(initialStats);
      setPlaylists([]);
      setFollowing([]);
    }
  }, [user]);

  const value = useMemo(() => ({
    user, 
    login, 
    loginWithGoogle: handleLoginWithGoogle,
    updateProfile: handleUpdateProfile,
    saveContinueWatching: handleSaveContinueWatching,
    sendChatMessage: handleSendChatMessage,
    submitSupportTicket: handleSubmitSupportTicket,
    trackWatchTime: handleTrackWatchTime,
    getSupportTickets: handleGetSupportTickets,
    replyToSupportTicket: handleReplyToSupportTicket,
    getGlobalAnalytics: handleGetGlobalAnalytics,
    logout, 
    isAdmin, 
    systemMessage, isMaintenance, isBanned,
    broadcastLevel, siteConfig,
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, removeFromHistory, clearHistory,
    featuredCollection, updateFeaturedCollection,
    preferences, updatePreferences,
    stats, addWatchTime, trackWatchActivity,
    playlists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    following, toggleFollow, isFollowing,
    continueWatching, updateContinueWatching, removeFromContinueWatching,
    setLastActionType,
    isLoginPopupOpen,
    openLoginPopup,
    closeLoginPopup,
    deleteProfileData
  }), [
    user, login, logout, isAdmin,
    systemMessage, isMaintenance, isBanned,
    broadcastLevel, siteConfig,
    watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
    history, addToHistory, removeFromHistory, clearHistory,
    preferences, updatePreferences,
    stats, addWatchTime, trackWatchActivity,
    playlists, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    following, toggleFollow, isFollowing,
    continueWatching, updateContinueWatching, removeFromContinueWatching,
    setLastActionType,
    isLoginPopupOpen,
    openLoginPopup,
    closeLoginPopup,
    deleteProfileData
  ]);

  // Visitor Tracking
  useEffect(() => {
    const hasTracked = sessionStorage.getItem('axis_visitor_tracked');
    if (!hasTracked) {
      trackVisitor();
      sessionStorage.setItem('axis_visitor_tracked', 'true');
    }
  }, [logout]);

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
