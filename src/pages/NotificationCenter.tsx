import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Search, Settings, Check, Trash2, Archive, 
  BellOff, Pin, Heart, Bookmark, ChevronLeft,
  Film, Tv, Download, Trophy, Flame, Users, AlertTriangle, Shield,
  MoreVertical, X, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToNotifications, markAsRead, markMultipleAsRead, markAllAsRead, 
  togglePin, deleteNotification, deleteMultipleNotifications, clearAllUnpinned
} from '../services/notificationService';

// Types
export type NotificationCategory = 'All' | 'Unread' | 'Movies' | 'Episodes' | 'Downloads' | 'Watch Party' | 'Achievements' | 'Recommendations' | 'System' | 'Security' | 'Developer';

export type NotificationType = 'new_movie' | 'new_episode' | 'new_trailer' | 'trending' | 'recommendation' | 'watchlist' | 'download_complete' | 'download_failed' | 'achievement' | 'watch_streak' | 'watch_party_invite' | 'watch_party_join' | 'announcement' | 'maintenance' | 'system_update' | 'security' | 'login_new_device' | 'developer';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  timestamp: number;
  read: boolean;
  pinned: boolean;
  archived: boolean;
  posterUrl?: string;
  actionUrl?: string;
  priority: 'normal' | 'high' | 'critical';
}


const CATEGORIES: { label: NotificationCategory, icon: React.FC<any> }[] = [
  { label: 'All', icon: Bell },
  { label: 'Unread', icon: CheckCircle2 },
  { label: 'Movies', icon: Film },
  { label: 'Episodes', icon: Tv },
  { label: 'Downloads', icon: Download },
  { label: 'Watch Party', icon: Users },
  { label: 'Achievements', icon: Trophy },
  { label: 'Recommendations', icon: Flame },
  { label: 'System', icon: Settings },
  { label: 'Security', icon: Shield },
];

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Listen for notifications
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToNotifications(user.id, (data) => {
        setNotifications(data);
      });
      return () => unsubscribe();
    }
  }, [user]);
  
  // Vibrate helper
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
      if (newSelection.size === 0) setIsSelectMode(false);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    triggerHaptic();
  };

  const handleLongPress = (id: string) => {
    if (!isSelectMode) {
      triggerHaptic();
      setIsSelectMode(true);
      toggleSelection(id);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    await markMultipleAsRead(Array.from(selectedIds));
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    await deleteMultipleNotifications(Array.from(selectedIds));
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id);
    }
  };

  const handleClearAll = async () => {
    if (user?.id) {
      await clearAllUnpinned(user.id);
    }
  };

  const handleToggleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
  };
  
  const handleTogglePin = async (id: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(id, !isPinned);
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  // Grouped Notifications
  const groupedNotifications = useMemo(() => {
    const filtered = notifications.filter(n => {
      if (activeCategory === 'Unread' && n.read) return false;
      if (activeCategory === 'Movies' && n.type !== 'new_movie') return false;
      if (activeCategory === 'Episodes' && n.type !== 'new_episode') return false;
      if (activeCategory === 'Security' && n.type !== 'security') return false;
      if (activeCategory === 'Achievements' && n.type !== 'achievement') return false;
      
      if (searchQuery) {
        return n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
               n.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      }
      
      return !n.archived;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });

    const groups: { label: string, items: AppNotification[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const thisWeek = today - 86400000 * 7;
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    filtered.forEach(n => {
      let label = 'Older';
      if (n.pinned) {
        label = 'Pinned';
      } else if (n.timestamp >= today) {
        label = 'Today';
      } else if (n.timestamp >= yesterday) {
        label = 'Yesterday';
      } else if (n.timestamp >= thisWeek) {
        label = 'Earlier This Week';
      } else if (n.timestamp >= thisMonth) {
        label = 'Earlier This Month';
      }

      const existingGroup = groups.find(g => g.label === label);
      if (existingGroup) {
        existingGroup.items.push(n);
      } else {
        groups.push({ label, items: [n] });
      }
    });

    // Ensure specific order: Pinned, Today, Yesterday, This Week, This Month, Older
    const order = ['Pinned', 'Today', 'Yesterday', 'Earlier This Week', 'Earlier This Month', 'Older'];
    groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));

    return groups;
  }, [notifications, activeCategory, searchQuery]);

  const hasNotifications = groupedNotifications.some(g => g.items.length > 0);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F7] font-sans pb-24 md:pb-8 selection:bg-brand/30 selection:text-white">
      {/* Liquid Glass Header */}
      <div className="sticky top-0 z-50 px-4 py-4 md:px-8 pt-8 pb-4 backdrop-blur-3xl bg-[#080808]/70 border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(255,69,58,0.5)]">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Settings className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
            {user?.avatar && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hidden md:block">
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-4xl mx-auto mt-4 overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input 
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-white/40"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Filters */}
        <div className="max-w-4xl mx-auto mt-6">
          <div className="flex overflow-x-auto pb-4 -mb-4 scrollbar-hide gap-2 mask-linear-fade">
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              const isActive = activeCategory === category.label;
              return (
                <button
                  key={category.label}
                  onClick={() => setActiveCategory(category.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
                    isActive 
                      ? 'bg-white text-black font-medium shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : ''}`} />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-6">

        {/* Push Permission Banner */}
        {Notification.permission === 'default' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-white/5 border border-brand/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/20 rounded-xl">
                <Bell className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Enable Push Notifications</h4>
                <p className="text-xs text-[#A1A1AA]">Get real-time updates when you're away.</p>
              </div>
            </div>
            <button 
              onClick={() => {
                Notification.requestPermission().then(() => {
                  // Trigger re-render to hide banner
                  setIsSettingsOpen(false);
                });
              }}
              className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand/80 transition-colors whitespace-nowrap"
            >
              Turn On
            </button>
          </motion.div>
        )}
        
        {/* Quick Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between mb-6 text-sm h-6">
            {isSelectMode ? (
               <div className="flex items-center gap-4 text-white">
                 <span className="font-semibold text-brand">{selectedIds.size} Selected</span>
                 <button onClick={handleMarkSelectedAsRead} className="hover:text-brand transition-colors">Mark Read</button>
                 <button onClick={handleDeleteSelected} className="hover:text-brand transition-colors">Delete</button>
                 <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} className="text-[#A1A1AA] hover:text-white transition-colors">Cancel</button>
               </div>
            ) : (
               <>
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark all as read
                </button>
                <button 
                  onClick={handleClearAll}
                  className="text-[#A1A1AA] hover:text-brand transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              </>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {hasNotifications ? (
              groupedNotifications.map(group => (
                <motion.div key={group.label} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
                  <h3 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider mb-4 px-2">{group.label}</h3>
                  <div className="space-y-3">
                    {group.items.map(notification => (
                      <NotificationCard 
                        key={notification.id} 
                        notification={notification} 
                        onToggleRead={handleToggleRead}
                        onTogglePin={(id, e) => handleTogglePin(id, notification.pinned, e)}
                        onDelete={handleDeleteNotification}
                        isSelectMode={isSelectMode}
                        isSelected={selectedIds.has(notification.id)}
                        onSelect={() => toggleSelection(notification.id)}
                        onLongPress={() => handleLongPress(notification.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-24 text-center flex flex-col items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 relative">
                  <Bell className="w-10 h-10 text-white/20" />
                  <motion.div 
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Bell className="w-10 h-10 text-white/40" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">You're all caught up.</h3>
                <p className="text-[#A1A1AA] mb-8">No new notifications in this category.</p>
                <Link to="/browse" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors border border-white/10 hover:border-white/30 backdrop-blur-md">
                  Explore new releases
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Notification Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex justify-end"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-[#121212] border-l border-white/10 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#121212]/80 backdrop-blur-xl z-10">
                <h2 className="text-xl font-semibold">Notification Preferences</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* OS Permissions */}
                <div>
                  <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> System Permissions
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-0.5">Push Notifications</div>
                        <div className="text-xs text-[#A1A1AA]">Receive native OS alerts when the app is closed or in the background.</div>
                      </div>
                      <button
                        onClick={() => {
                          if (Notification.permission !== 'granted') {
                            Notification.requestPermission().then(() => {
                              // Force re-render to update toggle state (could use state, but simple hack is ok)
                              setIsSettingsOpen(false); 
                              setTimeout(() => setIsSettingsOpen(true), 50);
                            });
                          }
                        }}
                        disabled={Notification.permission === 'granted'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          Notification.permission === 'granted' ? 'bg-brand' : 'bg-white/20 cursor-pointer'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            Notification.permission === 'granted' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Updates */}
                <div>
                  <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Film className="w-4 h-4" /> Content Updates
                  </h3>
                  <div className="space-y-4">
                    <ToggleOption label="New Movies" description="Be the first to know about major movie releases." defaultChecked />
                    <ToggleOption label="New Episodes" description="Updates for series you're watching." defaultChecked />
                    <ToggleOption label="Trending" description="Weekly digest of what's popular on AxisTV." defaultChecked />
                    <ToggleOption label="Recommended" description="Personalized suggestions based on your taste." defaultChecked />
                  </div>
                </div>

                {/* Account & Activity */}
                <div>
                   <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Account & Activity
                  </h3>
                  <div className="space-y-4">
                    <ToggleOption label="Downloads" description="Notifications when offline downloads finish or fail." defaultChecked />
                    <ToggleOption label="Achievements" description="Alerts for unlocked watch streaks and badges." defaultChecked />
                    <ToggleOption label="Watch Party" description="Invitations and updates from your friends." defaultChecked />
                  </div>
                </div>

                {/* System */}
                <div>
                   <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> System & Security
                  </h3>
                  <div className="space-y-4">
                    <ToggleOption label="Security Alerts" description="Important alerts about new logins and account changes." defaultChecked disabled />
                    <ToggleOption label="Announcements" description="Platform news, maintenance, and updates." defaultChecked />
                  </div>
                </div>

                {/* Sounds & Haptics */}
                <div>
                   <h3 className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Sounds & Haptics
                  </h3>
                  <div className="space-y-4">
                    <ToggleOption label="Haptic Feedback" description="Vibrate on actions like swipe and long-press." defaultChecked />
                    
                    <div className="mt-4">
                      <div className="font-medium text-white mb-2 text-sm">Notification Sound</div>
                      <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white appearance-none focus:outline-none focus:border-brand transition-colors">
                        <option value="default">Axis Default</option>
                        <option value="netflix">Cinematic (Netflix Style)</option>
                        <option value="apple">Glass (Apple Style)</option>
                        <option value="minimal">Minimal Pop</option>
                        <option value="silent">Silent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Developer */}
                {user?.email === 'greatmayuku2@gmail.com' && (
                  <div>
                    <h3 className="text-sm font-medium text-brand uppercase tracking-wider mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Developer Options
                    </h3>
                    <div className="space-y-4">
                      <ToggleOption label="Developer Messages" description="Receive internal broadcast alerts and API logs." defaultChecked />
                    </div>
                  </div>
                )}
                
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleOption({ label, description, defaultChecked = false, disabled = false }: { label: string, description: string, defaultChecked?: boolean, disabled?: boolean }) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="font-medium text-white mb-0.5">{label}</div>
        <div className="text-xs text-[#A1A1AA]">{description}</div>
      </div>
      <button
        onClick={() => !disabled && setEnabled(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-brand' : 'bg-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Notification Card Component
function NotificationCard({ 
  notification, 
  onToggleRead, 
  onTogglePin,
  onDelete,
  isSelectMode,
  isSelected,
  onSelect,
  onLongPress
}: { 
  notification: AppNotification, 
  onToggleRead: (id: string, e: React.MouseEvent) => void,
  onTogglePin: (id: string, e: React.MouseEvent) => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  isSelectMode?: boolean,
  isSelected?: boolean,
  onSelect?: () => void,
  onLongPress?: () => void
}) {
  let pressTimer: any;
  const startPress = () => {
    pressTimer = setTimeout(() => {
      onLongPress && onLongPress();
    }, 500); // 500ms long press
  };
  const cancelPress = () => clearTimeout(pressTimer);
  
  const getIcon = (type: NotificationType) => {
    switch(type) {
      case 'new_movie': return <Film className="w-5 h-5 text-blue-400" />;
      case 'new_episode': return <Tv className="w-5 h-5 text-purple-400" />;
      case 'security': return <Shield className="w-5 h-5 text-amber-400" />;
      case 'achievement': return <Trophy className="w-5 h-5 text-yellow-400" />;
      default: return <Bell className="w-5 h-5 text-white/70" />;
    }
  };

  // Format time relative
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl group cursor-pointer"
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onClick={() => isSelectMode && onSelect && onSelect()}
    >
      {/* Background Actions Layer (revealed on swipe) */}
      <div className="absolute inset-0 flex justify-between items-center px-6">
        <div className="text-white/70 flex items-center gap-2">
          <Pin className="w-5 h-5" /> Pin
        </div>
        <div className="text-red-400 flex items-center gap-2">
          Delete <Trash2 className="w-5 h-5" />
        </div>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        drag={isSelectMode ? false : "x"}
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.x < -75) {
            onDelete(notification.id, e as any);
          } else if (info.offset.x > 75) {
            onTogglePin(notification.id, e as any);
          }
        }}
        className={`relative z-10 overflow-hidden rounded-2xl transition-all duration-300 ${
          notification.read 
            ? 'bg-[rgba(18,18,18,0.95)] border border-white/5 hover:bg-[rgba(25,25,25,0.95)]' 
            : 'bg-[rgba(30,30,30,0.95)] border border-white/10 hover:bg-[rgba(40,40,40,0.95)]'
        } ${isSelected ? 'ring-2 ring-brand' : ''}`}
      >
      {/* Selection Checkbox */}
      {isSelectMode && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'bg-brand border-brand' : 'border-white/30 bg-black/50'
          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      {/* Unread indicator pulse */}
      {!notification.read && !isSelectMode && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-l-2xl shadow-[0_0_15px_rgba(255,69,58,0.6)]" />
      )}

      {/* Priority subtle glow */}
      {notification.priority === 'critical' && (
        <div className="absolute inset-0 bg-red-500/5 mix-blend-screen pointer-events-none" />
      )}

      <div className={`p-4 md:p-5 flex gap-4 md:gap-5 transition-all duration-300 ${isSelectMode ? 'ml-10' : ''}`}>
        {/* Poster or Icon */}
        <div className="shrink-0 relative">
          {notification.posterUrl ? (
            <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg overflow-hidden border border-white/10 shadow-lg relative">
              <img src={notification.posterUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
                 {getIcon(notification.type)}
              </div>
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              notification.priority === 'critical' 
                ? 'bg-red-500/20 border-red-500/30' 
                : 'bg-white/10 border-white/10'
            }`}>
              {getIcon(notification.type)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-base md:text-lg font-medium tracking-tight truncate ${notification.read ? 'text-white/80' : 'text-white'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-2 shrink-0 text-xs text-[#A1A1AA]">
              {notification.pinned && <Pin className="w-3 h-3 text-brand" />}
              {formatTime(notification.timestamp)}
            </div>
          </div>
          <p className={`text-sm md:text-base leading-snug line-clamp-2 ${notification.read ? 'text-[#A1A1AA]' : 'text-white/90'}`}>
            {notification.subtitle}
          </p>

          {/* Inline Action */}
          {notification.actionUrl && (
            <div className="mt-3">
               <Link to={notification.actionUrl} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-gray-200 transition-colors">
                  View Now
               </Link>
            </div>
          )}
        </div>

        {/* Hover Actions (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300 shrink-0">
          <button 
            onClick={(e) => onToggleRead(notification.id, e)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/5"
            title={notification.read ? "Mark as unread" : "Mark as read"}
          >
            {notification.read ? <Bell className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => onTogglePin(notification.id, e)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border border-white/5 ${
              notification.pinned ? 'bg-brand/20 text-brand hover:bg-brand/30' : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
            title={notification.pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => onDelete(notification.id, e)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-white/70 hover:text-red-400 transition-colors border border-white/5"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
    </div>
  );
}
