import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import TopTenGrid from '../components/TopTenGrid';
import { 
  User, LogOut, Settings, Clock, Bookmark, Film, ArrowLeft, 
  Award, ListVideo, Trash2, Zap, Flame, Trophy, Ghost, Heart, Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Profile() {
  const { user, login, logout, watchlist, history, clearHistory, stats, preferences, updatePreferences, customPlaylists, deletePlaylist } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email) return;
    login(username, email);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const hoursWatched = Math.floor((stats?.watchTimeMinutes || 0) / 60);

  const badgeIcons: Record<string, any> = {
    '7-day movie streak': <Flame className="w-6 h-6" />,
    'Horror Master': <Ghost className="w-6 h-6" />,
    'Romance King': <Heart className="w-6 h-6" />,
    'Weekend Binger': <Zap className="w-6 h-6" />,
    'Cinemania': <Trophy className="w-6 h-6" />,
    'Genre Explorer': <Compass className="w-6 h-6" />,
  };

  const badgeColors: Record<string, string> = {
    '7-day movie streak': 'from-orange-500 to-red-600',
    'Horror Master': 'from-gray-700 to-black',
    'Romance King': 'from-pink-400 to-rose-600',
    'Weekend Binger': 'from-yellow-400 to-orange-500',
    'Cinemania': 'from-yellow-400 to-orange-300',
    'Genre Explorer': 'from-blue-400 to-teal-500',
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <button 
            onClick={handleBack}
            className="absolute top-8 left-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white z-50"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.5)]">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-8">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-lg transition-colors mt-6 shadow-[0_0_15px_rgba(229,9,20,0.4)]"
              >
                {isLoginMode ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-brand hover:text-brand-hover font-medium"
              >
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <div className="pt-28 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-4xl font-bold">My Profile</h1>
        </div>
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 bg-white/5 border border-white/10 p-8 rounded-2xl">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 bg-black">
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold">{user.username}</h1>
              {stats && stats.currentStreak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-brand/20 border border-brand/50 rounded-full">
                  <Flame className="w-4 h-4 text-brand" />
                  <span className="text-xs font-bold text-brand uppercase tracking-tighter">{stats.currentStreak} DAY STREAK</span>
                </div>
              )}
            </div>
            
            <p className="text-gray-400 mb-6">{user.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
          
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-1">{watchlist?.length || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">Watchlist</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">{history?.length || 0}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">History</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Stats & Badges */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Achievements
                </h3>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stats?.badges?.length || 0} Earned</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {stats?.badges?.map(badge => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={badge} 
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${badgeColors[badge] || 'from-gray-500 to-gray-700'} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      {badgeIcons[badge] || <Trophy className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{badge}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Achieved</p>
                    </div>
                  </motion.div>
                ))}

                {(!stats || !stats.badges || stats.badges.length === 0) && (
                  <div className="text-center py-8 space-y-4 opacity-50">
                    <Trophy className="w-12 h-12 mx-auto text-gray-700" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">No badges earned yet</p>
                  </div>
                )}
              </div>
              
              {/* Daily Streak Tracker */}
              <div className="mt-8 pt-8 border-t border-white/5">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Current Streak</h4>
                    <span className="text-brand font-black text-xl italic tracking-tighter">{stats?.currentStreak || 0}</span>
                 </div>
                 <div className="flex items-center gap-1.5 h-1">
                    {[...Array(7)].map((_, i) => (
                       <div key={i} className={`flex-1 h-full rounded-full ${i < (stats?.currentStreak || 0) % 8 ? 'bg-brand' : 'bg-white/10'}`} />
                    ))}
                 </div>
                 <p className="text-[10px] text-gray-600 mt-4 leading-relaxed uppercase font-bold tracking-wider">
                   {stats?.currentStreak && stats.currentStreak > 0 
                     ? "Keep the vibes going! Watch daily to maintain your streak." 
                     : "Start watching today to begin your streak!"}
                 </p>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto-Play Next Episode</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={preferences?.autoPlayNext} onChange={(e) => updatePreferences({ autoPlayNext: e.target.checked })} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto-Skip Intro</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={preferences?.skipIntro} onChange={(e) => updatePreferences({ skipIntro: e.target.checked })} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-12">
            {/* Playlists Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <ListVideo className="w-6 h-6 text-brand" />
                <h2 className="text-2xl font-bold tracking-tight">MY PLAYLISTS</h2>
              </div>
              {customPlaylists && customPlaylists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customPlaylists.map(playlist => (
                    <div key={playlist.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:border-brand/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand/10 transition-colors">
                           <Film className="w-6 h-6 text-gray-500 group-hover:text-brand transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-bold tracking-tight">{playlist.name}</h4>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{playlist.items?.length || 0} items</p>
                        </div>
                      </div>
                      <button onClick={() => deletePlaylist(playlist.id)} className="p-2 text-gray-700 hover:text-brand transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center border-dashed">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">No custom playlists created</p>
                </div>
              )}
            </div>

            {/* Watchlist Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Bookmark className="w-6 h-6 text-brand" />
                <h2 className="text-2xl font-bold tracking-tight">MY WATCHLIST</h2>
              </div>
              {watchlist?.length > 0 ? (
                <TopTenGrid items={watchlist.slice(0, 10)} showNumbers={false} />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
                  <Film className="w-12 h-12 text-gray-700 mx-auto mb-6" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Nothing to see here</p>
                </div>
              )}
            </div>

            {/* History Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-brand" />
                  <h2 className="text-2xl font-bold tracking-tight">WATCH HISTORY</h2>
                </div>
                {history?.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-black text-gray-700 hover:text-brand uppercase tracking-widest transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {history?.length > 0 ? (
                <TopTenGrid items={history.slice(0, 10)} showNumbers={false} />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
                  <Clock className="w-12 h-12 text-gray-700 mx-auto mb-6" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Your history is clear</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
