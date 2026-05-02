import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Navbar from '../components/Navbar';
import PopcornLoader from '../components/PopcornLoader';
import ServerHealthMonitor from '../components/admin/ServerHealthMonitor';
import ApiHealthMonitor from '../components/admin/ApiHealthMonitor';
import SpotlightManager from '../components/admin/SpotlightManager';
import { 
  Users, Activity, TrendingUp, Calendar, 
  Search, ShieldAlert, Award, Clock, 
  Trash2, Mail, ExternalLink, ChevronRight,
  Lock, Unlock, Key, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { 
  getUsers as getFirebaseUsers, 
  getUserCount as getFirebaseUserCount,
  getActiveUserCount,
  getAdvancedUserStats,
  getGlobalStats,
  getSupportTickets,
  replyToTicket as replyToSupportTicket,
  getAdminConfig,
  updateAdminConfig,
  updateBanStatus,
  updateRole
} from '../services/firebaseService';
import { Timestamp } from 'firebase/firestore';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  lastAction?: string;
  watchlistCount: number;
  historyCount: number;
  role?: string;
  isBanned?: boolean;
  stats: {
    totalViews: number;
    watchTimeMinutes: number;
    currentStreak: number;
    badges: string[];
  };
}

interface AdminState {
  totalUsers: number;
  newToday: number;
  mostActive: AdminUser[];
  allUsers: AdminUser[];
  maintenanceMode: boolean;
  broadcastMessage: string | null;
  broadcastLevel: 'info' | 'warning' | 'critical';
  bannedEmails: string[];
  auditLogs: { id: string, timestamp: string, type: string, detail: string }[];
  searchLogs: { query: string, timestamp: string, userId?: string }[];
  featuredMedia: string[];
  siteConfig: {
    siteName: string;
    brandColor: string;
    tagline: string;
  };
  reports: { id: string, userId: string, category: string, detail: string, timestamp: string, status: string }[];
  serverMetrics: {
    uptime: number;
    memory: { rss: number, heapTotal: number, heapUsed: number };
    cpuLoad: number[];
    platform: string;
    arch: string;
  };
  searchVelocity?: number;
  openReports?: number;
  activeUserCount: number;
  advancedStats: {
    total: number;
    last7Days: number;
    last30Days: number;
    admins: number;
    banned: number;
  };
  globalAnalytics: {
    totalVisitors: number;
    todayVisitors?: number;
    totalWatchTimeSeconds: number;
    totalSearches?: number;
    totalAggregatedWatchTime?: number;
    lastUpdated: any;
  } | null;
  supportTickets: any[];
}

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'logs' | 'content' | 'branding' | 'reports' | 'support' | 'database'>('overview');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(true);
  const [pageError, setPageError] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!isAdmin) {
      setPageError('Access Denied: Administrative privileges required.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      setPageError('');
      
      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const text = await res.text();
          if (text.startsWith('<')) return null; // Vercel SPA fallback
          return JSON.parse(text);
        } catch (e) {
          return null;
        }
      };

      const statsData = { totalUsers: 0, newToday: 0, mostActive: [], searchVelocity: 0, openReports: 0 };
      const usersData = [];
      const systemData = {
        maintenanceMode: false,
        broadcastMessage: null,
        broadcastLevel: 'info',
        bannedEmails: [],
        auditLogs: [],
        searchLogs: [],
        featuredMedia: [],
        siteConfig: { siteName: "Axis TV", brandColor: "#E50914", tagline: "The Ultimate Streaming Experience" },
        reports: [],
        serverMetrics: { uptime: 0, memory: { heapUsed: 0 }, platform: 'browser', arch: 'x64' }
      };
      
      let firebaseUsers: any[] = [];
      let firebaseUserCount = 0;
      let activeUserCount = 0;
      let advancedStats = { total: 0, last7Days: 0, last30Days: 0, admins: 0, banned: 0 };
      let globalAnalytics = null;
      let supportTickets: any[] = [];
      let adminConfigObj: any = null;

      // Use individualized error handling for each sensitive call
      const safeFireFetch = async (fn: () => Promise<any>, fallback: any = null) => {
        try {
          return await fn();
        } catch (e) {
          console.warn(`Admin Data Fetch failed for ${fn.name}:`, e);
          return fallback;
        }
      };

      firebaseUsers = await safeFireFetch(getFirebaseUsers, []);
      firebaseUserCount = await safeFireFetch(getFirebaseUserCount, 0);
      activeUserCount = await safeFireFetch(getActiveUserCount, 0);
      advancedStats = await safeFireFetch(getAdvancedUserStats, { total: 0, last7Days: 0, last30Days: 0, admins: 0, banned: 0 });
      globalAnalytics = await safeFireFetch(getGlobalStats, null);
      supportTickets = await safeFireFetch(getSupportTickets, []);
      adminConfigObj = await safeFireFetch(getAdminConfig, {});
      
      // Rely only on Firebase users for a complete view
      const combinedUsers: AdminUser[] = [];
      if (firebaseUsers && firebaseUsers.length > 0) {
        firebaseUsers.forEach((fu: any) => {
          combinedUsers.push({
            id: fu.uid || fu.id,
            username: fu.username || fu.name || fu.email.split('@')[0],
            email: fu.email,
            avatar: fu.photoURL || fu.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fu.uid || fu.id}`,
            createdAt: fu.createdAt instanceof Timestamp ? fu.createdAt.toDate().toISOString() : fu.createdAt?.seconds ? new Date(fu.createdAt.seconds * 1000).toISOString() : fu.createdAt || new Date().toISOString(),
            watchlistCount: fu.watchlistCount || 0,
            historyCount: fu.historyCount || 0,
            isBanned: fu.isBanned,
            role: fu.role || 'user',
            lastAction: fu.lastLogin instanceof Timestamp ? fu.lastLogin.toDate().toISOString() : fu.lastLogin?.seconds ? new Date(fu.lastLogin.seconds * 1000).toISOString() : fu.lastLogin,
            stats: fu.stats || {
              totalViews: 0,
              watchTimeMinutes: 0,
              currentStreak: 0,
              badges: []
            }
          });
        });
      }

      // Sort by total views for most active
      const sortedMostActive = [...combinedUsers]
        .sort((a, b) => (b.stats?.totalViews || 0) - (a.stats?.totalViews || 0))
        .slice(0, 5);

      setData({
        ...statsData,
        ...systemData,
        ...adminConfigObj, // Overwrite with real firebase config
        totalUsers: firebaseUserCount || statsData.totalUsers,
        activeUsers: activeUserCount || statsData.activeUsers,
        allUsers: combinedUsers,
        mostActive: sortedMostActive,
        advancedStats,
        globalAnalytics,
        supportTickets
      });
      if (adminConfigObj?.broadcastMessage) setBroadcastInput(adminConfigObj.broadcastMessage);
      else if (systemData.broadcastMessage) setBroadcastInput(systemData.broadcastMessage);
    } catch (e: any) {
      console.error("Failed to load admin data:", e);
      setPageError(e.message || 'Failed to establish neural link. Reload module?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin]);

  const handleToggleMaintenance = async () => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const newStatus = !data.maintenanceMode;
      // Update Server State
      try {
        await fetch('/api/admin/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: newStatus })
        });
      } catch (err) {
        console.error("Failed to update server maintenance mode:", err);
      }
      
      // Update Firestore State
      await updateAdminConfig({ maintenanceMode: newStatus });
      await fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBroadcast = async () => {
    setIsUpdating(true);
    try {
      // Update Server State
      try {
        await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: broadcastInput, level: broadcastLevel })
        });
      } catch (err) {
        console.error("Failed to update server broadcast:", err);
      }

      await updateAdminConfig({ broadcastMessage: broadcastInput, broadcastLevel });
      await fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<AdminState['siteConfig']>) => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const updatedConfig = { ...data.siteConfig, ...newConfig };
      
      // Update Server State
      try {
        await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteConfig: updatedConfig })
        });
      } catch (err) {
        console.error("Failed to update server config:", err);
      }

      await updateAdminConfig({ siteConfig: updatedConfig });
      await fetchData();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReplyToTicket = async (ticketId: string) => {
    const text = replyInputs[ticketId];
    if (!text) return;
    
    setIsUpdating(true);
    try {
      await replyToSupportTicket(ticketId, text);
      showToast("Reply transmitted to user uplink", "success");
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
      await fetchData();
    } catch (e: any) {
      showToast("Reply failed to synchronize", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBanUser = async (userEmail: string, unban = false) => {
    const userToBan = data?.allUsers?.find(u => u.email === userEmail);
    if (!userToBan) return;
    if (!window.confirm(`Are you sure you want to ${unban ? 'unban' : 'ban'} ${userEmail}?`)) return;
    setIsUpdating(true);
    try {
      await updateBanStatus(userToBan.id, !unban);
      showToast(unban ? 'User unbanned' : 'User banned', 'success');
      await fetchData();
    } catch (e: any) {
      showToast('Failed to update user ban status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (uid: string, currentRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role?`)) return;
    setIsUpdating(true);
    try {
      await updateRole(uid, currentRole === 'admin' ? 'user' : 'admin');
      showToast('Role updated successfully', 'success');
      await fetchData();
    } catch (e: any) {
      showToast('Failed to change user role', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 flex items-center justify-center">
        {pageError ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500">{pageError}</h2>
            <button onClick={fetchData} className="mt-4 px-6 py-2 bg-white/10 rounded-full font-bold hover:bg-white/20 transition-all">Retry</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 text-brand animate-pulse mb-4" />
            <h2 className="text-xl font-bold">Connecting...</h2>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      
      <div className="pt-28 px-6 lg:px-12 max-w-[1400px] mx-auto text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <ShieldAlert className="w-10 h-10 text-brand" />
              AXIS TV COMMAND CENTER
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Full platform control and administrative intelligence.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'users', label: 'Directory', icon: <Users className="w-4 h-4" /> },
              { id: 'branding', label: 'Identity', icon: <Search className="w-4 h-4" /> },
              { id: 'content', label: 'Spotlight', icon: <Award className="w-4 h-4" /> },
              { id: 'database', label: 'Data Core', icon: <Database className="w-4 h-4" /> },
              { id: 'reports', label: 'Intel', icon: <ShieldAlert className="w-4 h-4" /> },
              { id: 'system', label: 'Operations', icon: <Activity className="w-4 h-4" /> },
              { id: 'logs', label: 'Audit', icon: <Clock className="w-4 h-4" /> },
              { id: 'support', label: 'Inbox', icon: <Mail className="w-4 h-4" /> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <PopcornLoader />
          </div>
        ) : data && (
          <div className="space-y-12">
            {activeTab === 'overview' && (
              <>
                {/* Visual Intelligence Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                   <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-8">
                         <div>
                            <h3 className="text-xl font-bold uppercase tracking-tighter italic">Registry Velocity</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Daily acquisition metrics</p>
                         </div>
                         <Activity className="w-5 h-5 text-brand" />
                      </div>
                      <div className="h-[250px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={
                               (() => {
                                  const last7Days = Array.from({length: 14}, (_, i) => {
                                     const d = new Date();
                                     d.setDate(d.getDate() - (13 - i));
                                     return d.toLocaleDateString();
                                  });
                                  return last7Days.map(date => ({
                                     name: date.split('/')[0] + '/' + date.split('/')[1],
                                     users: data.allUsers.filter(u => new Date(u.createdAt).toLocaleDateString() === date).length
                                  }));
                               })()
                            }>
                               <defs>
                                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#E50914" stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor="#E50914" stopOpacity={0}/>
                                  </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                               <XAxis dataKey="name" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                               <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                                  itemStyle={{ color: '#E50914' }}
                               />
                               <Area type="monotone" dataKey="users" stroke="#E50914" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <StatCard 
                        label="Total Registered" 
                        value={data.totalUsers} 
                        icon={<Users className="w-6 h-6" />}
                        color="text-brand"
                      />
                      <StatCard 
                        label="Visitors" 
                        value={data.globalAnalytics?.totalVisitors || 0} 
                        icon={<TrendingUp className="w-6 h-6" />}
                        color="text-green-500"
                      />
                      <StatCard 
                        label="Visitors Today" 
                        value={data.globalAnalytics?.todayVisitors || 0} 
                        icon={<Activity className="w-6 h-6" />}
                        color="text-blue-500"
                      />
                      <StatCard 
                        label="Total Watch Hours" 
                        value={Math.floor(((data.globalAnalytics?.totalAggregatedWatchTime || 0) / 60) + ((data.globalAnalytics?.totalWatchTimeSeconds || 0) / 3600))} 
                        icon={<Clock className="w-6 h-6" />}
                        color="text-yellow-500"
                      />
                   </div>
                </div>

                {/* Advanced Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                  <StatCard 
                    label="Joined (7 Days)" 
                    value={data.advancedStats?.last7Days || 0} 
                    icon={<Calendar className="w-6 h-6" />}
                    color="text-orange-500"
                  />
                  <StatCard 
                    label="Joined (30 Days)" 
                    value={data.advancedStats?.last30Days || 0} 
                    icon={<Calendar className="w-6 h-6" />}
                    color="text-blue-500"
                  />
                  <StatCard 
                    label="Active Sessions" 
                    value={data.allUsers.filter(u => {
                      if (!u.lastAction) return false;
                      const last = new Date(u.lastAction).getTime();
                      return Date.now() - last < 1000 * 60 * 10;
                    }).length} 
                    icon={<Activity className="w-6 h-6" />}
                    color="text-green-500"
                  />
                  <StatCard 
                    label="Growth Rate" 
                    value={Math.floor((data.newToday / Math.max(1, data.totalUsers - data.newToday)) * 100)} 
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="text-blue-400"
                    isPercent
                  />
                  <StatCard 
                    label="Binge Rate" 
                    value={Math.floor((data.allUsers.filter(u => (u.stats?.totalViews || 0) > 10).length / Math.max(1, data.totalUsers)) * 100)} 
                    icon={<Award className="w-6 h-6" />}
                    color="text-purple-500"
                    isPercent
                  />
                  <StatCard 
                    label="Retention" 
                    value={Math.floor((data.allUsers.filter(u => u.stats?.currentStreak > 0).length / Math.max(1, data.totalUsers)) * 100)} 
                    icon={<Clock className="w-6 h-6" />}
                    color="text-yellow-500"
                    isPercent
                  />
                  <StatCard 
                    label="Search Momentum" 
                    value={data.searchVelocity || 0} 
                    icon={<Search className="w-6 h-6" />}
                    color="text-brand"
                  />
                  <StatCard 
                    label="Intel Reports" 
                    value={data.openReports || 0} 
                    icon={<ShieldAlert className="w-6 h-6" />}
                    color="text-orange-500"
                  />
                </div>

                {/* Most Active Users Table */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-8 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-brand" />
                      Platform elites
                    </h2>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Global Ranking</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] bg-white/2">
                          <th className="px-8 py-4">Rank</th>
                          <th className="px-8 py-4">Identity</th>
                          <th className="px-8 py-4">Binge Stats</th>
                          <th className="px-8 py-4 text-right">Achievements</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.mostActive.map((user, idx) => (
                          <tr key={`${user.id}-${idx}`} className="hover:bg-white/2 transition-colors group">
                            <td className="px-8 py-6 font-black text-brand italic">#{idx + 1}</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <img src={user.avatar || undefined} className="w-10 h-10 rounded-2xl bg-black border border-white/10" alt="" loading="lazy" />
                                <div>
                                  <p className="font-bold">{user.username}</p>
                                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="space-y-1">
                                <p className="text-sm font-bold flex items-center gap-2">
                                  {user.stats?.totalViews || 0} <span className="text-[10px] text-gray-600 font-black uppercase tracking-tighter">Views</span>
                                </p>
                                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand" style={{ width: `${Math.min(100, (user.stats?.totalViews || 0) * 2)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {user.stats?.badges?.slice(0, 4).map(b => (
                                  <div key={b} className="w-6 h-6 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center" title={b}>
                                    <Award className="w-3.5 h-3.5 text-brand" />
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'branding' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-brand/10 rounded-2xl">
                          <Activity className="w-6 h-6 text-brand" />
                       </div>
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter">Site Identity</h2>
                    </div>
                    <div className="space-y-6">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-3 px-1">Brand Name</label>
                          <input 
                             type="text" 
                             defaultValue={data.siteConfig?.siteName}
                             onBlur={(e) => handleUpdateConfig({ siteName: e.target.value })}
                             className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand outline-none font-bold placeholder:opacity-20"
                             placeholder="Platform designation..."
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-3 px-1">Tagline / Intel</label>
                          <input 
                             type="text" 
                             defaultValue={data.siteConfig?.tagline}
                             onBlur={(e) => handleUpdateConfig({ tagline: e.target.value })}
                             className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand outline-none font-bold placeholder:opacity-20"
                             placeholder="Slogan / Strategic detail..."
                          />
                       </div>
                    </div>
                 </div>

                 <ApiHealthMonitor />
                 <ServerHealthMonitor />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-brand" />
                    Registry
                  </h2>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Identify user..."
                      className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-12 pr-6 focus:outline-none focus:border-brand transition-colors text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.allUsers.map((user, idx) => (
                    <motion.div 
                      key={`${user.id}-${idx}`} 
                      className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:border-brand/30 transition-all group relative overflow-hidden"
                    >
                      {((user as any).isBanned) && (
                        <div className="absolute top-0 right-0 p-2 bg-brand text-[8px] font-black uppercase tracking-widest rotate-45 translate-x-4 -translate-y-1 w-20 text-center shadow-lg">
                          Banned
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <img src={user.avatar || undefined} className="w-14 h-14 rounded-2xl bg-black border border-white/10 shadow-xl" alt="" loading="lazy" />
                          <div>
                            <h4 className="font-bold text-lg leading-tight uppercase tracking-tighter">{user.username}</h4>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1 italic">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                        <div className="text-center">
                          <p className="text-sm font-black italic">{user.stats?.totalViews || 0}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Views</p>
                        </div>
                        <div className="text-center border-x border-white/10">
                          <p className="text-sm font-black italic">{user.stats?.currentStreak || 0}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Streak</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black italic">{user.stats?.badges?.length || 0}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Badges</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-[9px] text-gray-500 font-black uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          {user.lastAction && (
                            <div className="flex items-center gap-1 text-[9px] text-brand/60 font-black uppercase tracking-widest mt-0.5">
                              <Activity className="w-3 h-3" />
                              Active {new Date(user.lastAction).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                            disabled={isUpdating}
                            onClick={() => handleRoleChange(user.id, (user as any).role)}
                            className={`p-2 transition-colors rounded-lg ${(user as any).role === 'admin' ? 'text-blue-500 hover:bg-blue-500/10' : 'text-gray-700 hover:text-blue-500 hover:bg-blue-500/10'}`}
                            title={(user as any).role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                           >
                            <Key className="w-5 h-5" />
                           </button>
                           <button 
                            disabled={isUpdating}
                            onClick={() => handleBanUser(user.email, (user as any).isBanned)}
                            className={`p-2 transition-colors rounded-lg ${(user as any).isBanned ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-700 hover:text-brand hover:bg-brand/10'}`}
                            title={(user as any).isBanned ? 'Unban User' : 'Ban User'}
                           >
                            <ShieldAlert className="w-5 h-5" />
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

             {activeTab === 'content' && (
               <div className="space-y-8">
                  <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-orange-500/10 rounded-2xl">
                              <Award className="w-8 h-8 text-orange-500" />
                           </div>
                           <div>
                              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Content Hub</h2>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pin priority media to global discovery</p>
                           </div>
                        </div>
                     </div>
                     <SpotlightManager currentData={data} onUpdate={fetchData} />
                  </div>
               </div>
            )}

            {activeTab === 'database' && (
               <div className="space-y-8">
                  <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-blue-500/10 rounded-2xl">
                              <Database className="w-8 h-8 text-blue-500" />
                           </div>
                           <div>
                              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Data Core</h2>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Database records and deep analytics</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center mb-8">
                        <div className="p-6 bg-black/40 border border-white/5 rounded-3xl">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                              <Users className="w-4 h-4" /> User Profiles
                           </p>
                           <p className="text-3xl font-black italic text-blue-500">{data.allUsers.length}</p>
                        </div>
                        <div className="p-6 bg-black/40 border border-white/5 rounded-3xl">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                              <Search className="w-4 h-4" /> Global Searches
                           </p>
                           <p className="text-3xl font-black italic text-purple-500">{data.globalAnalytics?.totalSearches || 0}</p>
                        </div>
                        <div className="p-6 bg-black/40 border border-white/5 rounded-3xl">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                              <Clock className="w-4 h-4" /> Total User Sessions
                           </p>
                           <p className="text-3xl font-black italic text-orange-500">{data.globalAnalytics?.totalVisitors || 0}</p>
                        </div>
                        <div className="p-6 bg-black/40 border border-white/5 rounded-3xl">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                              <Award className="w-4 h-4" /> Admin Roles
                           </p>
                           <p className="text-3xl font-black italic text-brand">{data.allUsers.filter(u => u.role === 'admin').length}</p>
                        </div>
                     </div>

                     <div className="bg-black/50 border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-xl font-bold uppercase tracking-tighter italic mb-6">Database Schema & Collections</h3>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] bg-white/2">
                                    <th className="px-8 py-4">Collection</th>
                                    <th className="px-8 py-4">Est. Doc Count</th>
                                    <th className="px-8 py-4">Read Frequency</th>
                                    <th className="px-8 py-4 text-right">Access Level</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-sm font-medium">
                                 <tr className="hover:bg-white/2 transition-colors">
                                    <td className="px-8 py-6 font-bold flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" /> /users</td>
                                    <td className="px-8 py-6">{data.allUsers.length}</td>
                                    <td className="px-8 py-6 text-green-500">Very High</td>
                                    <td className="px-8 py-6 text-right"><span className="bg-white/10 px-2 py-1 rounded text-xs">Auth Required</span></td>
                                 </tr>
                                 <tr className="hover:bg-white/2 transition-colors">
                                    <td className="px-8 py-6 font-bold flex items-center gap-2"><Database className="w-4 h-4 text-orange-500" /> /analytics/global</td>
                                    <td className="px-8 py-6">1</td>
                                    <td className="px-8 py-6 text-yellow-500">Moderate</td>
                                    <td className="px-8 py-6 text-right"><span className="bg-white/10 px-2 py-1 rounded text-xs">Public Read</span></td>
                                 </tr>
                                 <tr className="hover:bg-white/2 transition-colors">
                                    <td className="px-8 py-6 font-bold flex items-center gap-2"><Database className="w-4 h-4 text-brand" /> /admin/config</td>
                                    <td className="px-8 py-6">1</td>
                                    <td className="px-8 py-6 text-yellow-500">Moderate</td>
                                    <td className="px-8 py-6 text-right"><span className="bg-brand/20 text-brand px-2 py-1 rounded text-xs outline outline-1 outline-brand/30">Admin Only</span></td>
                                 </tr>
                                 <tr className="hover:bg-white/2 transition-colors">
                                    <td className="px-8 py-6 font-bold flex items-center gap-2"><Database className="w-4 h-4 text-purple-500" /> /supportTickets</td>
                                    <td className="px-8 py-6">{data.supportTickets?.length || 0}</td>
                                    <td className="px-8 py-6 text-red-500">Low</td>
                                    <td className="px-8 py-6 text-right"><span className="bg-white/10 px-2 py-1 rounded text-xs">Auth Required</span></td>
                                 </tr>
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'system' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Broadcast Control */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl h-fit">
                  <div className="flex items-center gap-3 mb-8">
                    <Mail className="w-6 h-6 text-brand" />
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">Global Broadcast</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-6 font-medium">Send a critical message to all connected sessions across the platform.</p>
                  
                  <div className="space-y-4">
                    <textarea 
                      value={broadcastInput}
                      onChange={(e) => setBroadcastInput(e.target.value)}
                      placeholder="Type priority transmission... (Leave blank to clear)"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 focus:outline-none focus:border-brand transition-colors text-sm min-h-[150px] font-medium resize-none"
                    />
                    <button 
                      disabled={isUpdating}
                      onClick={handleUpdateBroadcast}
                      className="w-full py-4 bg-brand hover:bg-brand-hover text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 transition-all disabled:opacity-50"
                    >
                      {isUpdating ? 'Synchronizing...' : 'Transmit Broadcast'}
                    </button>
                    {data.broadcastMessage && (
                      <button 
                         onClick={() => { setBroadcastInput(''); }}
                         className="w-full text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                      >
                         Clear Message
                      </button>
                    )}
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl h-fit">
                   <div className="flex items-center gap-3 mb-8">
                    <Activity className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">Emergency Lockdown</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-8 font-medium">Instantly put the platform into Maintenance Mode. New sessions will be blocked.</p>
                  
                  <div className="flex flex-col gap-6 p-8 bg-black/40 rounded-3xl border border-white/5 text-center">
                    <div className="flex items-center justify-center gap-4 mb-2">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${data.maintenanceMode ? 'text-gray-600' : 'text-green-500'}`}>Operational</span>
                       <div className="w-12 h-6 bg-white/5 rounded-full p-1 relative">
                          <div className={`w-4 h-4 rounded-full transition-all ${data.maintenanceMode ? 'translate-x-6 bg-brand' : 'translate-x-0 bg-gray-500'}`} />
                       </div>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${data.maintenanceMode ? 'text-brand' : 'text-gray-600'}`}>Locked</span>
                    </div>
                    
                    <h3 className={`text-4xl font-black italic tracking-tighter ${data.maintenanceMode ? 'text-brand' : 'text-white'}`}>
                       {data.maintenanceMode ? 'SYSTEM LOCKED' : 'SYSTEM ONLINE'}
                    </h3>
                    
                    <button 
                      disabled={isUpdating}
                      onClick={handleToggleMaintenance}
                      className={`mt-4 py-4 px-10 rounded-2xl font-black uppercase tracking-[0.2em] transition-all self-center ${data.maintenanceMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-brand/10 text-brand border border-brand/30 hover:bg-brand hover:text-white'}`}
                    >
                      {data.maintenanceMode ? 'Restore Normal Ops' : 'Initiate Lockdown'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-brand" />
                    Support Intel
                  </h2>
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{data.supportTickets?.length || 0} Active Tickets</span>
                </div>

                <div className="space-y-6">
                  {data.supportTickets?.map((ticket, idx) => (
                    <motion.div 
                      key={ticket.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/2 border border-white/5 rounded-[2rem] p-8 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                         <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${ticket.status === 'open' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                               <Mail className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="text-lg font-black uppercase tracking-tighter italic">{ticket.subject}</h4>
                               <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">From: {ticket.userName} ({ticket.userEmail})</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${ticket.status === 'open' ? 'bg-orange-600/20 text-orange-400' : 'bg-green-600/20 text-green-400'}`}>
                               {ticket.status}
                            </span>
                            <span className="text-[10px] font-bold text-gray-700">{new Date(ticket.createdAt?.toDate ? ticket.createdAt.toDate() : ticket.createdAt).toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="bg-black/30 border border-white/5 rounded-2xl p-6 mb-6">
                         <p className="text-sm font-medium text-gray-300 leading-relaxed italic">"{ticket.message}"</p>
                      </div>

                      {ticket.status === 'open' ? (
                        <div className="flex gap-4">
                           <input 
                              type="text" 
                              value={replyInputs[ticket.id] || ''}
                              onChange={(e) => setReplyInputs(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Type administrative response..."
                              className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 focus:border-brand outline-none text-sm font-medium"
                           />
                           <button 
                              onClick={() => handleReplyToTicket(ticket.id)}
                              disabled={isUpdating}
                              className="px-8 py-4 bg-brand hover:bg-brand-hover text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-brand/20 active:scale-95"
                           >
                              Reply
                           </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-[10px] font-black text-green-500 uppercase tracking-widest text-center">
                           Response transmitted. Awaiting user acknowledgment.
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {(!data.supportTickets || data.supportTickets.length === 0) && (
                    <div className="py-20 text-center opacity-20">
                       <Mail className="w-12 h-12 mx-auto mb-4" />
                       <p className="text-sm uppercase font-black tracking-widest">Support buffer empty</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden p-8">
                 <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6 text-brand" />
                    Audit Log Transmission
                  </h2>
                  <button onClick={fetchData} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Refresh Feed
                  </button>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                  {data.auditLogs?.map((log, idx) => (
                    <div key={`${log.id}-${idx}`} className="flex gap-4 p-5 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        log.type === 'BAN' ? 'bg-red-500' : 
                        log.type === 'MAINTENANCE' ? 'bg-yellow-500' : 
                        log.type === 'BROADCAST' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{log.type}</span>
                            <span className="text-[10px] font-bold text-gray-700">{new Date(log.timestamp).toLocaleString()}</span>
                         </div>
                         <p className="text-sm font-medium text-gray-300 break-words">{log.detail}</p>
                      </div>
                    </div>
                  ))}
                  {(!data.auditLogs || data.auditLogs.length === 0) && (
                    <div className="py-20 text-center opacity-20">
                       <Clock className="w-12 h-12 mx-auto mb-4" />
                       <p className="text-sm uppercase font-black tracking-widest">No transmissions recorded</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, isPercent }: { label: string, value: number, icon: React.ReactNode, color: string, isPercent?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:border-brand/30 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 opacity-5">
        {icon}
      </div>
      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-4xl font-black italic tracking-tighter">
          {value}{isPercent && '%'}
        </p>
      </div>
    </div>
  );
}
