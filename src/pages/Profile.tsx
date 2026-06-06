import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
 LogOut, Clock, Bookmark, ArrowLeft, 
 Award, ListVideo, Trophy, Settings,
 Edit2, ChevronRight, Play, Plus, X,
 Search, Bell, Menu, Star, MoreVertical,
 Flame, Zap, Heart, Ghost, Shield, Mail
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MovieImage } from '../components/MovieImage';
import { useToast } from '../contexts/ToastContext';

import Admin from './Admin';

const AVATARS = [
 { id: 'f1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria', gender: 'female' },
 { id: 'f2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia', gender: 'female' },
 { id: 'm1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', gender: 'male' },
 { id: 'm2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver', gender: 'male' },
];

export default function Profile() {
 const { 
 user, 
 loginWithGoogle, 
 sendMagicLink, 
 updateProfile,
 logout, 
 watchlist, 
 history, 
 clearHistory, 
 stats, 
 preferences, 
 updatePreferences, 
 removeFromHistory,
 submitSupportTicket
 } = useAuth();
 const { showToast } = useToast();
 const [mode, setMode] = useState<'signin' | 'signup' | 'magic-sent'>('signin');
 const [username, setUsername] = useState('');
 const [email, setEmail] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
 const navigate = useNavigate();
 const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
 const [isSupportOpen, setIsSupportOpen] = useState(false);
 const [supportSubject, setSupportSubject] = useState('');
 const [supportMessage, setSupportMessage] = useState('');
 const [editUsername, setEditUsername] = useState('');
 const [editBio, setEditBio] = useState('');
 const [editAvatar, setEditAvatar] = useState('');
 const [viewAdmin, setViewAdmin] = useState(false);

 const openEditProfile = () => {
 if (user) {
 setEditUsername(user.username || user.name);
 setEditBio(user.bio || '');
 setEditAvatar(user.avatar || '');
 setIsEditProfileOpen(true);
 }
 };

 const handleSaveProfile = async () => {
 if (editUsername) {
 setIsLoading(true);
 try {
 await updateProfile({ 
 username: editUsername, 
 bio: editBio,
 photoURL: editAvatar,
 name: editUsername // Sync name with username for simplicity
 });
 showToast("Profile updated successfully", "success");
 setIsEditProfileOpen(false);
 } catch (error: any) {
 showToast(error.message || "Failed to update profile", "error");
 } finally {
 setIsLoading(false);
 }
 }
 };

 const handleAuth = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email) return;
 if (mode === 'signup' && !username) {
 showToast("Please provide a username", "info");
 return;
 }

 setIsLoading(true);
 try {
 if (mode === 'signin') {
 await sendMagicLink(email);
 setMode('magic-sent');
 showToast("Magic link sent!", "success");
 } else if (mode === 'signup') {
 await sendMagicLink(email, username);
 setMode('magic-sent');
 showToast("Registration link sent!", "success");
 }
 } catch (error: any) {
 if (error.code === 'auth/invalid-credential' || error.message?.includes('invalid-credential')) {
 showToast("No account found. Check your email or sign up below!", "error");
 setMode('signup');
 } else {
 showToast(error.message || "Authentication failed", "error");
 }
 } finally {
 setIsLoading(false);
 }
 };

 const handleGoogleLogin = async () => {
 setIsLoading(true);
 try {
 await loginWithGoogle();
 showToast("Signed in with Google", "success");
 } catch (error: any) {
 showToast(error.message || "Google sign in failed", "error");
 } finally {
 setIsLoading(false);
 }
 };

 const handleSubmitTicket = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!supportSubject || !supportMessage) return;

 setIsLoading(true);
 try {
 await submitSupportTicket(supportSubject, supportMessage);
 showToast("Bug report sent! Our tech team is on it.", "success");
 setIsSupportOpen(false);
 setSupportSubject('');
 setSupportMessage('');
 } catch (error: any) {
 showToast("Uplink failed. Try again soon.", "error");
 } finally {
 setIsLoading(false);
 }
 };

 const handleBack = () => {
 if (window.history.length > 2) {
 navigate(-1);
 } else {
 navigate('/');
 }
 };

 if (!user) {
 return (
 <div className="min-h-screen bg-transparent text-white flex flex-col relative overflow-hidden">
 {/* Abstract Background for Login */}
 <div className="absolute inset-0 z-0 opacity-20 bg-gradient-to-br from-brand/20 via-black to-purple-900/20" />

 <div className="flex-1 flex items-center justify-center p-6 relative z-10">
 <button 
 onClick={handleBack}
 className="absolute top-8 left-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
 >
 <ArrowLeft className="w-6 h-6" />
 <span className="text-fluid-sm font-medium tracking-wide">Back</span>
 </button>

 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
 >
 <h2 className="text-fluid-3xl font-semibold text-center mb-8 tracking-tight ">
 {mode === 'magic-sent' ? 'Check Inbox' : (mode === 'signin' ? 'Welcome Back' : 'Create Account')}
 </h2>

 {mode === 'magic-sent' ? (
 <div className="space-y-6 text-center">
 <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto border border-brand/20">
 <Mail className="w-10 h-10 text-brand animate-pulse" />
 </div>
 <div className="space-y-2">
 <p className="text-fluid-sm font-bold text-white">Verification Link Sent!</p>
 <p className="text-fluid-sm text-gray-500 tracking-wide leading-relaxed">
 We sent a link to <span className="text-brand font-bold">{email}</span>. Click it to sign in.
 </p>
 </div>
 <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl">
 <p className="text-fluid-sm text-yellow-500 font-semibold tracking-wide mb-1">Important</p>
 <p className="text-fluid-sm text-yellow-200/80 leading-relaxed">
 If you don't see the email, check your <span className="text-white font-bold underline">Spam</span> or <span className="text-white font-bold underline">Promotions</span> folder.
 </p>
 </div>
 <button 
 onClick={() => setMode('signin')}
 className="text-fluid-sm font-semibold text-gray-500 tracking-wide hover:text-white transition-colors"
 >
 Back to Sign In
 </button>
 </div>
 ) : (
 <form onSubmit={handleAuth} className="space-y-5">
 {mode === 'signup' && (
 <div className="space-y-1">
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Username</label>
 <input 
 type="text" 
 value={username}
 onChange={e => setUsername(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
 placeholder="e.g. Great"
 required
 />
 </div>
 )}
 <div className="space-y-1">
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Email</label>
 <input 
 type="email" 
 value={email}
 onChange={e => setEmail(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
 placeholder="great@example.com"
 required
 />
 </div>
 <button 
 type="submit"
 disabled={isLoading}
 className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all mt-4 shadow-[0_10px_20px_rgba(255,45,45,0.3)] tracking-wide text-fluid-sm active:scale-[0.98]"
 >
 {isLoading ? 'Processing...' : (mode === 'signin' ? 'Send Magic Link' : 'Create Account')}
 </button>

 <div className="relative py-4">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-white/10"></div>
 </div>
 <div className="relative flex justify-center text-fluid-sm font-semibold tracking-wide">
 <span className="bg-black/40 backdrop-blur-3xl px-2 text-gray-500">Or continue with</span>
 </div>
 </div>

 <button 
 type="button"
 onClick={handleGoogleLogin}
 disabled={isLoading}
 className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-4 rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 tracking-wide text-fluid-sm active:scale-[0.98]"
 >
 <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
 </svg>
 Google
 </button>
 </form>
 )}
 
 {mode !== 'magic-sent' && (
 <div className="mt-8 text-center text-fluid-xs text-gray-500 font-medium">
 {mode === 'signin' ? "First time here?" : "Joined before?"}
 <button 
 onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
 className="ml-2 text-brand hover:underline font-bold"
 >
 {mode === 'signin' ? 'Create Account' : 'Sign In Now'}
 </button>
 </div>
 )}
 </motion.div>
 </div>
 </div>
 );
 }

 if (viewAdmin) {
 return (
 <div className="relative min-h-screen bg-transparent">
 <button 
 onClick={() => setViewAdmin(false)}
 className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-brand text-white rounded-full border border-white/20 flex items-center justify-center gap-2 hover:bg-brand/80 transition-all shadow-[0_0_20px_rgba(255,45,45,0.4)] group"
 >
 <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
 <span className="text-fluid-xs font-semibold tracking-wide">Exit Command Center</span>
 </button>
 <Admin />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-transparent text-white relative pb-32">
 {/* Background Gradient */}
 <div className="fixed inset-0 z-0 bg-gradient-to-b from-brand/5 to-black" />

 {/* Custom Top Navigation */}
 <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-8 md:px-12 backdrop-blur-sm bg-black/40 backdrop-blur-3xl">
 <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-3">
 <ArrowLeft className="w-6 h-6" />
 <h1 className="text-fluid-2xl font-semibold tracking-tight ">My Profile</h1>
 </button>
 <div className="flex items-center gap-4">
 <Link to="/search" className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
 <Search className="w-5 h-5" />
 </Link>
 <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 p-0.5">
 <img src={user.avatar || undefined} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
 <div className="absolute top-0 right-0 w-3 h-3 bg-brand border-2 border-black rounded-full" />
 </div>
 </div>
 </div>

 <div className="relative z-10 pt-28 px-4 sm:px-6 max-w-[800px] mx-auto space-y-6 sm:space-y-8">
 
 {/* PREMIUM PROFILE HEADER CARD */}
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="relative glass-card rounded-3xl overflow-hidden p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group border border-white/10"
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none mix-blend-overlay" />
 <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
 {/* Profile Image with Glow Ring */}
 <div className="relative">
 <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-brand via-brand/40 to-transparent animate-pulse shadow-[0_0_30px_rgba(255,45,45,0.5)]">
 <div className="w-full h-full rounded-full bg-transparent overflow-hidden border-[2px] border-black">
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
 <h2 className="text-fluid-4xl font-semibold tracking-tight">{user.username}</h2>
 {user.isGuest && (
 <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-fluid-sm font-semibold tracking-wide border border-yellow-500/20">Guest</span>
 )}
 </div>
 <p className="text-gray-400 font-medium">{user.email}</p>
 {user.bio && (
 <p className="text-gray-300 text-fluid-sm font-medium mt-4 md:max-w-[400px] bg-white/5 p-3 rounded-2xl border border-white/5">
 {user.bio}
 </p>
 )}
 </div>

 <div className="flex flex-wrap justify-center md:justify-start gap-4">
 {user.isGuest ? (
 <button 
 onClick={handleGoogleLogin}
 className="flex items-center gap-2 px-8 py-3.5 bg-white text-black hover:bg-white/90 rounded-full transition-all text-fluid-base font-semibold tracking-wide shadow-[0_10px_20px_rgba(255,255,255,0.2)] active:scale-95"
 >
 <Award className="w-4 h-4" /> Migrate Account to Google
 </button>
 ) : (
 <button 
 onClick={logout}
 className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 glass-button px-6 py-3 text-white"
 >
 <LogOut className="w-4 h-4" /> Sign Out
 </button>
 )}
 <button onClick={openEditProfile} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 glass-button border border-white/10 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-all text-fluid-base font-semibold tracking-wide active:scale-95">
 <Settings className="w-4 h-4" /> Edit Profile
 </button>
 {user?.email === 'greatmayuku2@gmail.com' && (
 <button 
 onClick={() => setViewAdmin(true)} 
 className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-full transition-all text-fluid-xs font-semibold tracking-wide active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
 >
 <Shield className="w-4 h-4" /> Command Center
 </button>
 )}
 </div>
 </div>
 </div>

 <div className="relative z-10 mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/10 flex items-center bg-black/40 backdrop-blur-3xl rounded-3xl p-4 sm:p-6 backdrop-blur-md">
 <div className="flex-1 flex flex-col items-center gap-2 border-r border-white/5">
 <Bookmark className="w-6 h-6 text-brand drop-shadow-[0_0_8px_rgba(255,45,45,0.4)]" />
 <div className="flex flex-col items-center">
 <span className="text-fluid-2xl font-semibold leading-none">{watchlist?.length || 0}</span>
 <span className="text-fluid-xs font-semibold text-gray-500 tracking-wide">Watchlist</span>
 </div>
 </div>
 <div className="flex-1 flex flex-col items-center gap-2">
 <Clock className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(255,45,45,0.4)]" />
 <div className="flex flex-col items-center">
 <span className="text-fluid-2xl font-semibold leading-none">{history?.length || 0}</span>
 <span className="text-fluid-xs font-semibold text-gray-500 tracking-wide">History</span>
 </div>
 </div>
 </div>
 </motion.div>

 <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl">
 <div className="flex items-center justify-between mb-6 px-2">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <Award className="w-5 h-5 text-brand" /> Achievements
 </h3>
 <div className="flex items-center gap-2">
 <span className="text-fluid-sm font-semibold text-brand tracking-wide">{stats?.badges?.length || 0} Earned</span>
 <ChevronRight className="w-4 h-4 text-gray-500" />
 </div>
 </div>

 {stats?.badges && stats.badges.length > 0 ? (
 <div className="space-y-4">
 {stats.badges.map((badge, idx) => {
 const badgeInfo = {
 '7-day streak': { icon: Flame, color: 'text-orange-500', bg: 'from-orange-600/20', desc: 'Watched 7 days in a row' },
 'Horror Master': { icon: Ghost, color: 'text-purple-500', bg: 'from-purple-600/20', desc: 'Expert of the dark arts' },
 'Romance King': { icon: Heart, color: 'text-pink-500', bg: 'from-pink-600/20', desc: 'True romantic at heart' },
 'Weekend Binger': { icon: Zap, color: 'text-yellow-500', bg: 'from-yellow-600/20', desc: 'Marathon viewer' },
 'Pro Member': { icon: Shield, color: 'text-blue-500', bg: 'from-blue-600/20', desc: 'Official Axis TV Elite' }
 }[badge] || { icon: Trophy, color: 'text-brand', bg: 'from-brand/20', desc: 'Earned milestone' };

 const Icon = badgeInfo.icon;

 return (
 <div key={idx} className={`bg-gradient-to-br ${badgeInfo.bg} to-black/20 border border-white/10 rounded-3xl p-4 sm:p-5 flex items-center gap-4 sm:gap-5 shadow-2xl`}>
 <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-lg">
 <Icon className={`w-7 h-7 ${badgeInfo.color} fill-current/10`} />
 </div>
 <div className="flex-1">
 <h4 className="text-fluid-lg font-semibold tracking-tight leading-tight ">{badge}</h4>
 <p className="text-fluid-xs font-semibold text-white/40 tracking-wide mt-1">{badgeInfo.desc}</p>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 text-center">
 <p className="text-fluid-xs font-bold text-gray-500 tracking-wide">No achievements yet. Start watching to earn badges!</p>
 </div>
 )}

 <div className="mt-8 px-2 space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-fluid-sm font-semibold text-gray-400 tracking-wide">Current Streak</p>
 <div className="flex items-center gap-2">
 <span className="text-brand font-semibold text-fluid-xl tracking-tight">{stats?.currentStreak || 0} DAYS</span>
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
 animate={{ width: `${Math.min(((stats?.currentStreak || 0) / 10) * 100, 100)}%` }}
 className="h-full bg-brand relative shadow-[0_0_10px_rgba(255,45,45,0.8)]"
 >
 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]" />
 </motion.div>
 </div>
 <p className="text-fluid-sm text-gray-500 font-bold leading-relaxed tracking-wide">
 {stats?.currentStreak > 0 ? "You're on fire! Keep it up." : "Start your journey today. Watch any movie to start a streak!"}
 </p>
 </div>
 </div>


 {/* PREFERENCES SECTION */}
 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
 <div className="w-full flex items-center justify-between mb-6 px-2">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <Settings className="w-5 h-5 text-brand" /> Preferences
 </h3>
 </div>
 
 <div className="space-y-6 px-2">
 {[
 { label: 'Auto-Play Next Episode', key: 'autoPlayNext' },
 { label: 'Auto-Skip Intro', key: 'skipIntro' },
 { label: 'Enable Trailers', key: 'showTrailers' }
 ].map((pref) => (
 <div key={pref.key} className="flex items-center justify-between">
 <span className="text-fluid-sm font-semibold text-gray-200 tracking-wide">{pref.label}</span>
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

 {/* SUPPORT & HELP SECTION */}
 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
 <div className="w-full flex items-center justify-between mb-8 px-2 group">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <Shield className="w-5 h-5 text-gray-400" /> Support & Bug Report
 </h3>
 <button 
 onClick={() => setIsSupportOpen(true)}
 className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-xl text-fluid-sm font-semibold tracking-wide transition-all"
 >
 Open Ticket
 </button>
 </div>
 <p className="text-fluid-sm text-gray-500 font-bold tracking-wide leading-relaxed px-2">
 Spotted a glitch? Need help with your account? Our tech team is on standby 24/7. Send us a message and we'll reply to your notification board.
 </p>
 </div>

 {/* MY WATCHLIST SECTION */}
 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
 <div className="w-full flex items-center justify-between mb-8 px-2 group">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <Bookmark className="w-5 h-5 text-brand" /> My Watchlist ({watchlist?.length || 0})
 </h3>
 <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand transition-colors" />
 </div>
 
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
 <p className="text-white text-fluid-sm font-semibold truncate">{item.title}</p>
 </div>
 </motion.div>
 ))}
 </div>
 ) : (
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-12 text-center space-y-4">
 <div className="relative w-16 h-16 mx-auto mb-4">
 <Bookmark className="w-full h-full text-white/5 stroke-[0.5]" />
 <Bookmark className="absolute inset-0 w-full h-full text-gray-800 animate-pulse" />
 </div>
 <p className="text-fluid-xs font-bold text-gray-200 tracking-wide">Nothing in your watchlist yet.</p>
 <p className="text-fluid-sm text-gray-500 font-medium tracking-tight">Add movies and series to watch later.</p>
 </div>
 )}
 </div>

 {/* WATCH HISTORY SECTION */}
 <div className="space-y-6">
 <div className="flex items-center justify-between px-2">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <Clock className="w-5 h-5 text-red-500" /> Watch History
 </h3>
 <button onClick={clearHistory} className="text-fluid-sm font-semibold text-brand tracking-wide hover:underline active:scale-95 transition-all">
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
 <h4 className="text-fluid-lg font-semibold tracking-tight leading-tight line-clamp-1 mb-2">{item.title}</h4>
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1 text-fluid-sm font-semibold text-brand tracking-tight">
 <Star className="w-3 h-3 fill-brand" /> {item.rating}
 </div>
 <span className="text-fluid-sm font-bold text-gray-500 tracking-wide">{item.year}</span>
 </div>
 </div>
 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromHistory(item.id); showToast("Removed from history", "success"); }} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-brand transition-colors z-20">
 <X className="w-4 h-4" />
 </button>
 </motion.div>
 ))}
 </div>
 ) : (
 <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center space-y-4">
 <Clock className="w-12 h-12 text-gray-800 mx-auto opacity-50" />
 <p className="text-fluid-xs font-bold text-gray-500 tracking-wide">No history yet</p>
 </div>
 )}
 </div>
 </div>

 <AnimatePresence>
 {isSupportOpen && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl"
 >
 <motion.div 
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="glass-panel rounded-3xl p-8 max-w-md w-full relative"
 >
 <button 
 onClick={() => setIsSupportOpen(false)}
 className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 
 <h2 className="text-fluid-2xl font-semibold tracking-tight mb-2">Technical Support</h2>
 <p className="text-fluid-sm font-semibold text-gray-500 tracking-wide mb-6 px-1">Bug reports & account help</p>
 
 <form onSubmit={handleSubmitTicket} className="space-y-6">
 <div className="space-y-1">
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Subject</label>
 <input 
 type="text" 
 value={supportSubject}
 onChange={e => setSupportSubject(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
 placeholder="e.g. Video buffering issue"
 required
 />
 </div>
 <div className="space-y-1">
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Message</label>
 <textarea 
 value={supportMessage}
 onChange={e => setSupportMessage(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium min-h-[150px] resize-none"
 placeholder="Describe the issue in detail..."
 required
 />
 </div>
 
 <button 
 type="submit"
 disabled={isLoading}
 className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,45,45,0.3)] tracking-wide text-fluid-sm"
 >
 {isLoading ? 'Uplinking...' : 'Submit Bug Report'}
 </button>
 </form>
 </motion.div>
 </motion.div>
 )}

 {isEditProfileOpen && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl"
 >
 <motion.div 
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="glass-panel rounded-3xl p-8 max-w-md w-full relative"
 >
 <button 
 onClick={() => setIsEditProfileOpen(false)}
 className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 
 <h2 className="text-fluid-2xl font-semibold tracking-tight mb-6">Edit Profile</h2>
 
 <div className="space-y-6">
 <div>
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2 mb-2">Avatar</label>
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
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Username</label>
 <input 
 type="text" 
 value={editUsername}
 onChange={e => setEditUsername(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
 placeholder="Username"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">Bio</label>
 <textarea 
 value={editBio}
 onChange={e => setEditBio(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium min-h-[100px] resize-none"
 placeholder="Tell us about yourself..."
 />
 </div>
 
 <button 
 onClick={handleSaveProfile}
 disabled={isLoading}
 className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,45,45,0.3)] tracking-wide text-fluid-sm"
 >
 {isLoading ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
