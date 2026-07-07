import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  LogOut,
  Clock,
  Bookmark,
  ArrowLeft,
  Award,
  ListVideo,
  Trophy,
  Settings,
  Edit2,
  ChevronRight,
  Play,
  Plus,
  X,
  Search,
  Bell,
  Menu,
  Star,
  MoreVertical,
  Flame,
  Zap,
  Heart,
  Ghost,
  Shield,
  Mail,
  Trash2,
  Download,
  Smile,
  Gamepad2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "../components/MovieImage";
import { useToast } from "../contexts/ToastContext";
import { slugify, MediaItem } from "../types";

import Admin from "./Admin";
import { MetaVerifiedBadge } from "../components/MetaVerifiedBadge";
import { getAchievementsList } from "./Achievements";
import KidsGameHub from "../components/KidsGameHub";

const isItemKidSafe = (item: any) => {
  if (!item) return false;
  const title = (item.title || item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  const blockedKeywords = [
    'horror', 'thriller', 'crime', 'murder', 'slasher', 'gore', 'sexy', 'erotic', 'adult', 'rated r', 'restricted', 'violence',
    'zombie', 'demonic', 'evil', 'blood', 'scary', 'psycho', 'killer', 'drugs', 'mafia', 'gangster', 'sex', 'kill', 'devil',
    'satan', 'demon', 'vampire', 'ghost', 'haunt', 'dead', 'death', 'sinister', 'nightmare', 'paranormal', 'insidious', 'scream',
    'conjuring', 'purge', 'saw', 'annabelle', 'dracula', 'frankenstein', 'witch', 'occult', 'brutal', 'slay', 'suicide', 'lucifer'
  ];
  
  for (const keyword of blockedKeywords) {
    if (title.includes(keyword) || category.includes(keyword)) {
      return false;
    }
  }
  return true;
};

const AVATARS = [
  {
    id: "f1",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
    gender: "female",
  },
  {
    id: "f2",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    gender: "female",
  },
  {
    id: "m1",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    gender: "male",
  },
  {
    id: "m2",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    gender: "male",
  },
];

export default function Profile() {
  const {
    user,
    loginWithGoogle,
    updateProfile,
    logout,
    deleteProfileData,
    watchlist,
    history,
    clearHistory,
    stats,
    preferences,
    updatePreferences,
    removeFromHistory,
    submitSupportTicket,
    isAdmin,
    continueWatching,
    featuredCollection,
    updateFeaturedCollection,
    playlists,
  } = useAuth();
  const isKids = preferences?.kidsMode;
  const filteredWatchlist = isKids ? (watchlist || []).filter(isItemKidSafe) : (watchlist || []);
  const filteredHistory = isKids ? (history || []).filter(isItemKidSafe) : (history || []);
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);
  const navigate = useNavigate();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [viewAdmin, setViewAdmin] = useState(false);
  const [isEditFeaturedOpen, setIsEditFeaturedOpen] = useState(false);
  const [tempFeatured, setTempFeatured] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (isEditFeaturedOpen) {
      setTempFeatured(featuredCollection || []);
    }
  }, [isEditFeaturedOpen, featuredCollection]);

  const openEditProfile = () => {
    if (user) {
      setEditUsername(user.username || user.name);
      setEditBio(user.bio || "");
      setEditAvatar(user.avatar || "");
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
          name: editUsername, // Sync name with username for simplicity
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be smaller than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Basic resize
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        setEditAvatar(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
      setSupportSubject("");
      setSupportMessage("");
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
      navigate("/");
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
            <span className="text-fluid-sm font-medium tracking-wide">
              Back
            </span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
          >
            <h2 className="text-fluid-3xl font-semibold text-center mb-8 tracking-tight ">
              Join the Elite
            </h2>
            <p className="text-fluid-sm text-gray-400 font-medium text-center mb-8">
              Sign in with Google to access premium features and see your
              profile.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 tracking-wide text-fluid-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
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
          <span className="text-fluid-xs font-semibold tracking-wide">
            Exit Command Center
          </span>
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
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-3xl bg-black/40 border-b border-white/5">
        <button
          onClick={handleBack}
          className="flex items-center gap-3 transition-colors group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            My Profile
          </h1>
        </button>
        <div className="flex items-center gap-4">
          <Link
            to="/search"
            className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all"
          >
            <Search className="w-5 h-5" />
          </Link>
          <button className="relative w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
            <Bell className="w-5 h-5" />
            <div className="absolute top-2 right-2.5 w-2 h-2 bg-brand rounded-full border border-black" />
          </button>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img
              src={user.avatar || undefined}
              alt=""
              className="w-full h-full object-cover rounded-full"
              loading="lazy"
            />
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-28 px-4 sm:px-6 max-w-[800px] mx-auto space-y-6 sm:space-y-8">
        {/* PREMIUM PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white/[0.03] backdrop-blur-[30px] rounded-3xl overflow-hidden p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group border border-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent opacity-30 pointer-events-none mix-blend-overlay" />
          
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={openEditProfile}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all text-xs font-medium tracking-wide active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            {/* Profile Image with Glow Ring */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-brand via-brand/40 to-transparent shadow-[0_0_30px_rgba(255,45,45,0.4)]">
                <div className="w-full h-full rounded-full bg-black overflow-hidden border-4 border-black">
                  <img
                    src={user.avatar || undefined}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <button
                onClick={openEditProfile}
                className="absolute bottom-1 right-1 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>

            <div className="flex-1 text-left">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {user.username}
                  </h2>
                  {isAdmin && (
                    <MetaVerifiedBadge className="w-6 h-6 drop-shadow-[0_0_8px_rgba(0,149,246,0.4)]" />
                  )}
                </div>
                
                {user.email === "greatmayuku2@gmail.com" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand/20 text-brand rounded-full text-[10px] font-bold tracking-wider border border-brand/30 uppercase">
                      <Shield className="w-3 h-3 text-brand fill-current" />
                      Verified Dev
                    </span>
                  </div>
                )}
                
                <p className="text-gray-400 text-sm font-medium">{user.email}</p>
                
                {user.bio && (
                  <div className="mt-3 inline-flex bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    <p className="text-gray-300 text-sm font-medium">
                      {user.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-sm font-semibold tracking-wide active:scale-95"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            
            {user?.email === "greatmayuku2@gmail.com" && (
              <button
                onClick={() => setViewAdmin(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-2xl transition-all text-sm font-semibold tracking-wide active:scale-95"
              >
                <Shield className="w-4 h-4" /> Command Center
              </button>
            )}
          </div>
        </motion.div>

        {isKids && (
          <KidsGameHub />
        )}

        {/* QUICK ACCESS GRID */}
        <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold tracking-wide mb-6">Quick Access</h3>
          <div className="grid grid-cols-5 gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <div onClick={() => navigate('/series')} className="flex flex-col items-center gap-3 min-w-[60px] group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Download className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Downloads</span>
            </div>
            <div onClick={() => navigate('/playlist')} className="flex flex-col items-center gap-3 min-w-[60px] group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Heart className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Liked</span>
            </div>
            <div onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="flex flex-col items-center gap-3 min-w-[60px] group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Play className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-white text-center leading-tight">Continue<br/>Watching</span>
            </div>
            <div onClick={() => navigate('/settings')} className="flex flex-col items-center gap-3 min-w-[60px] group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors relative">
                <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
                <div className="absolute top-3 right-3 w-2 h-2 bg-brand rounded-full" />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Notifications</span>
            </div>
            <div onClick={() => navigate('/settings')} className="flex flex-col items-center gap-3 min-w-[60px] group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">Settings</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* ACHIEVEMENTS CARD */}
          <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                <Award className="w-5 h-5 text-brand" /> Achievements
              </h3>
              <button onClick={() => navigate('/achievements')} className="text-xs font-semibold text-brand tracking-wide hover:underline">
                View All &gt;
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {(() => {
                const earned = getAchievementsList(stats, watchlist || [], playlists || [], user)
                  .filter(a => a.condition())
                  .slice(0, 6);
                if (earned.length > 0) {
                  return (
                    <div className="flex gap-4 overflow-x-auto w-full pb-2 scrollbar-hide">
                      {earned.map((achievement, idx) => {
                        const Icon = achievement.icon;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 min-w-[70px] select-none">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${achievement.bg} border ${achievement.border} flex items-center justify-center shadow-[0_0_15px_rgba(255,45,45,0.15)]`}>
                              <Icon className={`w-6 h-6 ${achievement.color}`} />
                            </div>
                            <span className="text-[10px] text-center text-gray-300 font-semibold leading-tight truncate w-16">{achievement.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full border border-white/10 flex items-center justify-center">
                        <Award className="w-8 h-8 text-white/20" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">No achievements yet</p>
                        <p className="text-xs text-gray-500 mt-1">Start watching to earn badges!</p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* CURRENT STREAK CARD */}
          <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                <Flame className="w-5 h-5 text-brand" /> Current Streak
              </h3>
              <button onClick={() => navigate('/achievements')} className="text-xs font-semibold text-brand tracking-wide hover:underline">
                Details &gt;
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center mb-6">
                <span className="text-4xl sm:text-5xl font-bold tracking-tighter text-brand drop-shadow-[0_0_10px_rgba(255,45,45,0.4)]">
                  {stats?.currentStreak || 0} <span className="text-2xl sm:text-3xl">DAYS</span>
                </span>
                <p className="text-xs sm:text-sm text-gray-400 font-medium mt-2">
                  Keep watching daily to build your streak!
                </p>
              </div>

              {/* 7-day progress bar */}
              <div className="flex items-center justify-between w-full max-w-[240px] mt-auto">
                {(() => {
                  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  const last7Days = [];
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;
                  
                  // Calculate yesterday string
                  const yesterdayDate = new Date();
                  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                  const yYear = yesterdayDate.getFullYear();
                  const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
                  const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
                  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
                  
                  const lastWatch = stats?.lastWatchDate;
                  const streak = stats?.currentStreak || 0;
                  
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    
                    let isActive = false;
                    if (streak > 0 && lastWatch) {
                      if (lastWatch === todayStr) {
                        isActive = i < streak;
                      } else if (lastWatch === yesterdayStr) {
                        isActive = i >= 1 && i <= streak;
                      }
                    }
                    
                    last7Days.push({
                      name: daysOfWeek[d.getDay()],
                      isToday: i === 0,
                      isActive,
                    });
                  }
                  
                  return last7Days.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${
                        day.isActive 
                          ? 'bg-brand shadow-[0_0_8px_rgba(255,45,45,0.8)]' 
                          : day.isToday 
                            ? 'ring-2 ring-brand ring-offset-2 ring-offset-black bg-white/10' 
                            : 'bg-white/10'
                      }`} />
                      <span className={`text-[10px] font-bold ${day.isToday ? 'text-brand' : 'text-gray-500'}`}>{day.name}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* MY WATCHLIST CARD */}
        <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
              <Bookmark className="w-5 h-5 text-brand" /> {isKids ? "My Kids Watchlist" : "My Watchlist"} ({filteredWatchlist?.length || 0})
            </h3>
            <button onClick={() => navigate('/playlist')} className="text-xs font-semibold text-brand tracking-wide hover:underline">
              View All &gt;
            </button>
          </div>

          {filteredWatchlist && filteredWatchlist.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
              {filteredWatchlist.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  whileHover={{ y: -5 }}
                  className="group relative rounded-xl overflow-hidden cursor-pointer min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px] snap-start border border-white/5"
                  onClick={() => navigate(`/watch/${slugify(item.title)}`)}
                >
                  <MovieImage
                    src={item.poster}
                    alt={item.title}
                    className="aspect-[2/3] w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <p className="text-white text-xs font-bold truncate mb-1">
                      {item.title}
                    </p>
                    <p className="text-gray-400 text-[9px] truncate">
                      {item.type || 'Movie'} • {item.year || ''}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-brand text-brand rounded-full text-[10px] font-bold backdrop-blur-md hover:bg-brand hover:text-white transition-colors">
                      <Play className="w-3 h-3 fill-current" /> Play Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 flex items-center justify-center text-center">
              <div className="space-y-2">
                <Bookmark className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-xs text-gray-400">Your watchlist is empty. Add something to watch later.</p>
              </div>
            </div>
          )}
        </div>

        {/* FEATURED COLLECTION */}
        <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
              <Star className="w-5 h-5 text-brand" /> Featured Collection
            </h3>
            <button
              onClick={() => setIsEditFeaturedOpen(true)}
              className="text-xs font-semibold text-brand tracking-wide hover:underline transition-all"
            >
              Edit &gt;
            </button>
          </div>

          {featuredCollection?.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {featuredCollection.map((item) => (
                <div key={item.id} onClick={() => navigate(`/watch/${slugify(item.title)}`)} className="relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group">
                  <MovieImage src={item.poster} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[10px] font-bold text-white line-clamp-2 leading-tight drop-shadow-md">{item.title}</span>
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - featuredCollection.length) }).map((_, i) => (
                <div key={`empty-${i}`} onClick={() => setIsEditFeaturedOpen(true)} className="relative aspect-[2/3] rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                  <Plus className="w-6 h-6 text-white/20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsEditFeaturedOpen(true)}>
              <Star className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-xs text-gray-400 mb-1">Your collection is empty.</p>
              <p className="text-[10px] text-gray-500">Feature up to 6 of your favorite movies or series.</p>
            </div>
          )}
        </div>

        {/* WATCH HISTORY SECTION */}
        <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-brand" /> {isKids ? "My Cartoon Watch History" : "Watch History"}
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand tracking-wide hover:underline active:scale-95 transition-all"
            >
              Clear All <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {filteredHistory?.length > 0 ? (
            <div className="space-y-3">
              {filteredHistory.slice(0, 4).map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  whileHover={{ x: 5 }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-4 group relative cursor-pointer"
                  onClick={() => navigate(`/watch/${slugify(item.title)}`)}
                >
                  <div className="w-24 aspect-[16/9] rounded-lg overflow-hidden shrink-0 relative bg-black/50">
                    <MovieImage
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold tracking-tight text-white line-clamp-1 mb-2">
                      {item.title}
                    </h4>
                    
                    {/* Progress Bar from continueWatching data */}
                    {(() => {
                      const cwItem = continueWatching.find(i => i.id === item.id);
                      if (!cwItem) {
                        return (
                          <div className="w-full max-w-[200px] flex items-center gap-3">
                            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-brand" style={{ width: '100%' }} />
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium shrink-0">
                              Watched
                            </span>
                          </div>
                        );
                      }
                      const progress = Math.min((cwItem.progress / Math.max(cwItem.duration, 1)) * 100, 100);
                      const timeLeft = Math.ceil((cwItem.duration - cwItem.progress) / 60);
                      return (
                        <div className="w-full max-w-[200px] flex items-center gap-3">
                          <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium shrink-0">
                            {timeLeft > 0 ? `${timeLeft}m left` : 'Completed'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromHistory(item.id);
                      showToast("Removed from history", "success");
                    }}
                    className="p-2 text-gray-500 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-xs text-gray-400">No watch history yet. Start watching to build your history.</p>
            </div>
          )}
        </div>

        {/* SETTINGS LINK */}
        <div 
          onClick={() => navigate('/settings')}
          className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-white mb-1">
                All Settings
              </h3>
              <p className="text-xs text-gray-400">
                Playback, Experience, Appearance, Downloads, and more
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
        </div>

        {/* SUPPORT & HELP SECTION */}
        {!isKids && (
          <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-16 h-16 shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold tracking-wide text-white mb-1">
                Support & Bug Report
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                Spotted a glitch? Need help with your account? Our tech team is on
                standby 24/7. Send us a message and we'll reply to your notification
                board.
              </p>
            </div>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="px-5 py-2.5 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0"
            >
              Open Ticket
            </button>
          </div>
        )}
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

              <h2 className="text-fluid-2xl font-semibold tracking-tight mb-2">
                Technical Support
              </h2>
              <p className="text-fluid-sm font-semibold text-gray-500 tracking-wide mb-6 px-1">
                Bug reports & account help
              </p>

              <form onSubmit={handleSubmitTicket} className="space-y-6">
                <div className="space-y-1">
                  <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
                    placeholder="e.g. Video buffering issue"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">
                    Message
                  </label>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
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
                  {isLoading ? "Uplinking..." : "Submit Bug Report"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isEditFeaturedOpen && (
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
              className="glass-panel rounded-3xl p-6 md:p-8 max-w-2xl w-full relative max-h-[90vh] overflow-hidden flex flex-col"
            >
              <button
                onClick={() => setIsEditFeaturedOpen(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                Edit Featured Collection
              </h2>
              <p className="text-sm font-semibold text-gray-500 tracking-wide mb-6">
                Select up to 6 items from your watchlist. ({tempFeatured.length}/6 selected)
              </p>

              <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2 space-y-4">
                {watchlist.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {watchlist.map(item => {
                      const isSelected = tempFeatured.some(t => t.id === item.id);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            if (isSelected) {
                              setTempFeatured(prev => prev.filter(t => t.id !== item.id));
                            } else if (tempFeatured.length < 6) {
                              setTempFeatured(prev => [...prev, item]);
                            }
                          }}
                          className={`relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-brand ring-offset-2 ring-offset-black opacity-100 scale-95' : tempFeatured.length >= 6 ? 'opacity-30' : 'hover:scale-95 opacity-80'}`}
                        >
                          <MovieImage src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                            <span className="text-[10px] font-bold text-white line-clamp-2 leading-tight drop-shadow-md">{item.title}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-brand rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400">Your watchlist is empty.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-auto shrink-0 pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsEditFeaturedOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateFeaturedCollection(tempFeatured);
                    setIsEditFeaturedOpen(false);
                    showToast("Featured collection updated", "success");
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold tracking-wide transition-colors"
                >
                  Save Changes
                </button>
              </div>
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

              <h2 className="text-fluid-2xl font-semibold tracking-tight mb-6">
                Edit Profile
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-fluid-sm font-semibold text-gray-300 tracking-wide px-2 mb-3 flex items-center gap-2">
                    Profile Avatar
                    <span className="text-[9px] bg-brand/15 text-brand px-2.5 py-0.5 rounded-full border border-brand/20 font-bold uppercase tracking-wider animate-pulse">Custom Upload</span>
                  </label>
                  
                  {/* Highly Visible Custom Upload Panel */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          id="avatar-upload"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className={`cursor-pointer w-14 h-14 rounded-full border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 transition-all overflow-hidden relative group ${
                            !AVATARS.some((av) => av.url === editAvatar) && editAvatar
                              ? "ring-2 ring-brand scale-105 shadow-[0_0_15px_rgba(255,45,45,0.4)] border-none"
                              : ""
                          }`}
                        >
                          {!AVATARS.some((av) => av.url === editAvatar) && editAvatar ? (
                            <img
                              src={editAvatar}
                              alt="Custom Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Plus className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                          )}
                        </label>
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-white">Upload Custom Image</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">JPEG/PNG up to 2MB</p>
                      </div>
                    </div>
                    
                    <label
                      htmlFor="avatar-upload"
                      className="cursor-pointer px-3.5 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-xl text-[10px] font-bold tracking-wide transition-colors uppercase"
                    >
                      Choose File
                    </label>
                  </div>

                  <div className="flex items-center gap-2 px-2 mb-3">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Or Choose Preset Avatar</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => setEditAvatar(av.url)}
                        className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 transition-all duration-300 ring-2 ${editAvatar === av.url ? "ring-brand scale-110 shadow-[0_0_15px_rgba(255,45,45,0.4)]" : "ring-white/10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:ring-white/30"}`}
                      >
                        <img
                          src={av.url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium"
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-fluid-sm font-semibold text-gray-500 tracking-wide px-2">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-brand transition-all text-fluid-sm font-medium min-h-[100px] resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,45,45,0.3)] tracking-wide text-fluid-sm"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
