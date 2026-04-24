import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Clock, Bookmark, ArrowLeft, 
  Award, ListVideo, Trophy, Settings,
  Edit2, ChevronRight, Play, Plus, X,
  Search, Bell, Menu, Star, MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MovieImage } from '../components/MovieImage';
import { useToast } from '../contexts/ToastContext';

const AVATARS = [
  { id: 'f1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria', gender: 'female' },
  { id: 'f2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia', gender: 'female' },
  { id: 'm1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', gender: 'male' },
  { id: 'm2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver', gender: 'male' },
];

const BG_POSTERS = [
  'https://picsum.photos/seed/wick/200/300',
  'https://picsum.photos/seed/expanse/200/300',
  'https://picsum.photos/seed/matrix/200/300',
  'https://picsum.photos/seed/marvel/200/300',
  'https://picsum.photos/seed/interstellar/200/300',
  'https://picsum.photos/seed/inception/200/300',
  'https://picsum.photos/seed/dune/200/300',
  'https://picsum.photos/seed/batman/200/300',
];

export default function Profile() {
  const { user, login, logout, watchlist, history, clearHistory, stats, preferences, updatePreferences, playlists, createPlaylist, deletePlaylist, removeFromHistory } = useAuth();
  const { showToast } = useToast();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const navigate = useNavigate();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const openEditProfile = () => {
    if (user) {
      setEditUsername(user.username);
      setEditEmail(user.email);
      setEditAvatar(user.avatar || '');
      setIsEditProfileOpen(true);
    }
  };

  const handleSaveProfile = () => {
    if (editUsername && editEmail) {
      login(editUsername, editEmail, editAvatar);
      setIsEditProfileOpen(false);
      showToast("Profile updated successfully!");
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email) return;
    login(username, email, selectedAvatar);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCreatePlaylist = () => {
    const name = window.prompt("Enter Playlist Name:");
    if (name && name.trim().length > 0) {
      createPlaylist(name.trim());
      showToast("Playlist created successfully!", "success");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
        {/* Animated Background Collage */}
        <div className="absolute inset-0 z-0 opacity-20 filter blur-[2px]">
          <div className="grid grid-cols-4 gap-2 rotate-12 scale-125 -translate-y-20">
            {BG_POSTERS.concat(BG_POSTERS).map((url, i) => (
              <img key={i} src={url} alt="" className="w-full aspect-[2/3] object-cover rounded-lg" loading="lazy" referrerPolicy="no-referrer" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <button 
            onClick={handleBack}
            className="absolute top-8 left-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-medium uppercase tracking-widest">Back</span>
          </button>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
          >
            <h2 className="text-3xl font-black text-center mb-8 italic tracking-tighter uppercase">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </h2>

            <div className="flex flex-col items-center mb-10">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Choose your avatar</p>
              <div className="flex gap-4">
                {AVATARS.map((av) => (
                  <button 
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`relative w-14 h-14 rounded-full overflow-hidden transition-all duration-300 ring-2 ${selectedAvatar === av.url ? 'ring-brand scale-110 shadow-[0_0_15px_rgba(255,45,45,0.4)]' : 'ring-white/10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:ring-white/30'}`}
                  >
                    <img src={av.url} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                  placeholder="e.g. Great"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                  placeholder="great@example.com"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand hover:bg-brand/90 text-white font-black py-4 rounded-2xl transition-all mt-4 shadow-[0_10px_20px_rgba(255,45,45,0.3)] uppercase tracking-widest text-sm active:scale-[0.98]"
              >
                {isLoginMode ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-8 text-center text-xs text-gray-500 font-medium">
              {isLoginMode ? "First time here?" : "Joined before?"}
              <button 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="ml-2 text-brand hover:underline font-bold"
              >
                {isLoginMode ? 'Create Account' : 'Sign In Now'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative pb-32">
      {/* Background Poster Collage */}
      <div className="fixed inset-0 z-0 opacity-10 filter blur-[1px]">
        <div className="grid grid-cols-4 gap-4 rotate-6 scale-110">
          {[...Array(12)].map((_, i) => (
            <img key={i} src={BG_POSTERS[i % BG_POSTERS.length]} alt="" className="w-full aspect-[2/3] object-cover rounded-xl" loading="lazy" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
      </div>

      {/* Custom Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-8 md:pl-[280px]">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-3">
          <ArrowLeft className="w-6 h-6" />
          <h1 className="text-2xl font-black tracking-tight italic uppercase">My Profile</h1>
        </button>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
            <Search className="w-5 h-5" />
          </button>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 p-0.5">
            <img src={user.avatar || undefined} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-brand border-2 border-black rounded-full" />
          </div>
          <button className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 pt-28 px-6 max-w-[800px] mx-auto space-y-8">
        
        {/* PREMIUM PROFILE HEADER CARD */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group ring-1 ring-white/5"
        >
          {/* Card Poster Background Overlay */}
          <div className="absolute inset-x-0 bottom-0 top-0 z-0 opacity-20 pointer-events-none overflow-hidden">
             <div className="grid grid-cols-4 gap-2 -rotate-3 scale-110 opacity-40">
                {BG_POSTERS.slice(0, 4).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-[2/3] object-cover rounded-lg blur-[1px]" loading="lazy" />
                ))}
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Profile Image with Glow Ring */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-brand via-brand/40 to-transparent animate-pulse shadow-[0_0_30px_rgba(255,45,45,0.5)]">
                <div className="w-full h-full rounded-full bg-black overflow-hidden border-[2px] border-black">
                  <img src={user.avatar || undefined} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
              <button onClick={openEditProfile} className="absolute bottom-1 right-1 w-9 h-9 bg-brand text-white rounded-full flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 active:scale-95 transition-all">
                <Edit2 className="w-4 h-4 fill-white" />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="space-y-1 mb-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h2 className="text-4xl font-black tracking-tight">{user.username}</h2>
                  <div className="inline-flex items-center px-4 py-1.5 bg-brand text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_5px_15px_rgba(255,45,45,0.4)] md:mt-1">
                    Axis Premium
                  </div>
                </div>
                <p className="text-gray-400 font-medium">{user.email}</p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 px-8 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-full transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button onClick={openEditProfile} className="flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-full transition-all text-xs font-black uppercase tracking-widest active:scale-95">
                  <Settings className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="relative z-10 mt-10 pt-8 border-t border-white/10 flex items-center bg-black/20 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex-1 flex flex-col items-center gap-2 border-r border-white/5">
              <Bookmark className="w-6 h-6 text-brand drop-shadow-[0_0_8px_rgba(255,45,45,0.4)]" />
              <div className="flex flex-col items-center">
                 <span className="text-2xl font-black leading-none">{watchlist?.length || 0}</span>
                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Watchlist</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(255,45,45,0.4)]" />
              <div className="flex flex-col items-center">
                 <span className="text-2xl font-black leading-none">{history?.length || 0}</span>
                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">History</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ACHIEVEMENTS SECTION */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Award className="w-5 h-5 text-brand" /> Achievements
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-brand uppercase tracking-widest">1 Earned</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-brand/40 border border-white/10 rounded-3xl p-5 flex items-center gap-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Trophy className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-black tracking-tight leading-tight">7-day streak</h4>
              <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mt-1 italic">Achieved</p>
            </div>
          </div>

          <div className="mt-8 px-2 space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Current Streak</p>
                <div className="flex items-center gap-2">
                   <span className="text-brand font-black text-xl italic tracking-tighter">9 DAYS</span>
                </div>
             </div>
             
             {/* Custom Progress Bar */}
             <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 flex w-full">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-1 border-r border-black/40 last:border-none" />
                  ))}
                </div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  className="h-full bg-brand relative shadow-[0_0_10px_rgba(255,45,45,0.8)]"
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]" />
                </motion.div>
             </div>
             <p className="text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-wide">
               Keep the vibes going! Watch daily to maintain your streak.
             </p>
          </div>
        </div>

        {/* PREFERENCES SECTION */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-2xl">
          <button className="w-full flex items-center justify-between mb-6 px-2 group">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-400" /> Preferences
            </h3>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand transition-colors" />
          </button>
          
          <div className="space-y-6 px-2">
            {[
              { label: 'Auto-Play Next Episode', key: 'autoPlayNext' },
              { label: 'Auto-Skip Intro', key: 'skipIntro' },
              { label: 'Enable Trailers', key: 'showTrailers' }
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-200 uppercase tracking-widest">{pref.label}</span>
                <button 
                  onClick={() => updatePreferences({ [pref.key]: !preferences[pref.key as keyof typeof preferences] })}
                  className={`relative w-14 h-7 rounded-full transition-all duration-500 p-1 ${preferences[pref.key as keyof typeof preferences] ? 'bg-brand' : 'bg-gray-800'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-500 transform ${preferences[pref.key as keyof typeof preferences] ? 'translate-x-[28px]' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MY WATCHLIST SECTION */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-2xl">
          <button className="w-full flex items-center justify-between mb-8 px-2 group">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Bookmark className="w-5 h-5 text-brand" /> My Watchlist ({watchlist?.length || 0})
            </h3>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand transition-colors" />
          </button>
          
          {watchlist && watchlist.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {watchlist.map((item, index) => (
                <motion.div 
                  key={`${item.id}-${index}`}
                  whileHover={{ y: -5 }}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/details?subjectId=${item.id}`)}
                >
                  <MovieImage src={item.poster} alt={item.title} className="aspect-[2/3] w-full" />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-white text-[10px] font-black truncate">{item.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-black/20 border border-white/5 rounded-3xl p-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto mb-4">
                  <Bookmark className="w-full h-full text-white/5 stroke-[0.5]" />
                  <Bookmark className="absolute inset-0 w-full h-full text-gray-800 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-gray-200 uppercase tracking-widest">Nothing in your watchlist yet.</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Add movies and series to watch later.</p>
            </div>
          )}
        </div>

        {/* WATCH HISTORY SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Clock className="w-5 h-5 text-red-500" /> Watch History
            </h3>
            <button onClick={clearHistory} className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline active:scale-95 transition-all">
              Clear All
            </button>
          </div>
          
          {history?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.slice(0, 4).map((item, index) => (
                <motion.div 
                  key={`${item.id}-${index}`}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden flex items-center group relative cursor-pointer"
                  onClick={() => navigate(`/details?subjectId=${item.id}`)}
                >
                  <div className="w-28 aspect-[3/4] overflow-hidden">
                    <MovieImage src={item.poster} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="flex-1 p-5 pr-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h4 className="text-[15px] font-black tracking-tight leading-tight line-clamp-1 mb-2">{item.title}</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-black text-brand uppercase tracking-tighter">
                        <Star className="w-3 h-3 fill-brand" /> {item.rating}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.year}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromHistory(item.id); showToast("Removed from history", "success"); }} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-brand transition-colors z-20">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-16 text-center space-y-4">
               <Clock className="w-12 h-12 text-gray-800 mx-auto opacity-50" />
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No history yet</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#121212] border border-white/10 rounded-[32px] p-8 max-w-md w-full relative"
            >
              <button 
                onClick={() => setIsEditProfileOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6">Edit Profile</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-2">Avatar</label>
                  <div className="flex gap-4">
                    {AVATARS.map((av) => (
                      <button 
                        key={av.id}
                        onClick={() => setEditAvatar(av.url)}
                        className={`relative w-12 h-12 rounded-full overflow-hidden transition-all duration-300 ring-2 ${editAvatar === av.url ? 'ring-brand scale-110 shadow-[0_0_15px_rgba(255,45,45,0.4)]' : 'ring-white/10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:ring-white/30'}`}
                      >
                        <img src={av.url} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Username</label>
                  <input 
                    type="text" 
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Email (Changing this resets history)</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-sm font-medium"
                    placeholder="Email"
                  />
                </div>
                
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-brand hover:bg-brand/90 text-white font-black py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,45,45,0.3)] uppercase tracking-widest text-sm"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
