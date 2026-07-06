import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  listenToParty,
  listenToParticipants,
  listenToMessages,
  sendPartyMessage,
  updatePlaybackState,
  leaveWatchParty,
  joinWatchParty,
  WatchParty,
  PartyParticipant,
  PartyMessage,
} from "../services/watchPartyService";
import { movieService } from "../services/movieService";
import VideoPlayer from "../components/VideoPlayer";
import { WatchPartySkeleton } from "../components/Skeleton";
import { SEO } from "../components/SEO";
import { slugify } from "../types";
import { MetaVerifiedBadge } from "../components/MetaVerifiedBadge";
import {
  ArrowLeft,
  Share2,
  Users,
  MoreVertical,
  Settings,
  Heart,
  Smile,
  RefreshCcw,
  Pin,
  SlidersHorizontal,
  ChevronDown,
  Crown,
  VolumeX,
  Plus,
  Camera,
  Share,
  BarChart2,
  Minimize2,
  CheckCircle2,
  Send,
  MonitorPlay,
  Copy,
  Clock,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function WatchPartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [party, setParty] = useState<WatchParty | null>(null);
  const [participants, setParticipants] = useState<PartyParticipant[]>([]);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [mediaData, setMediaData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHost = party?.hostId === user?.id;

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle();
      showToast("Successfully signed in!", "success");
    } catch (error: any) {
      showToast(error.message || "Sign in failed", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Load and join Party
  useEffect(() => {
    if (!user || !partyId) {
      return;
    }

    let unsubParty = () => {};
    let unsubParticipants = () => {};
    let unsubMessages = () => {};

    const setupParty = async () => {
      try {
        await joinWatchParty(partyId);
        setHasJoined(true);

        unsubParty = listenToParty(partyId, async (p) => {
          if (!p) {
            showToast("Watch Party has ended or does not exist.", "info");
            navigate("/");
            return;
          }
          setParty(p);
          if (!mediaData) {
            // Load media data
            try {
              let mData = await movieService.getDetails(p.mediaId);
              let streamData = await movieService.getPlay(
                p.mediaId,
                undefined,
                undefined,
                mData.detailPath,
                mData.title,
                mData.year,
                String(mData.type),
              );
              setMediaData(streamData);
            } catch (err) {
              console.error("Failed to load media for watch party", err);
              showToast("Failed to load movie for this party.", "error");
            }
          }
          setLoading(false);
        });

        unsubParticipants = listenToParticipants(partyId, (ps) => {
          setParticipants(ps);
        });

        unsubMessages = listenToMessages(partyId, (ms) => {
          setMessages(ms);
        });
      } catch (err) {
        showToast("Error joining Watch Party.", "error");
        navigate("/");
      }
    };

    setupParty();

    const handleUnload = () => leaveWatchParty(partyId);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      unsubParty();
      unsubParticipants();
      unsubMessages();
      window.removeEventListener("beforeunload", handleUnload);
      leaveWatchParty(partyId);
    };
  }, [partyId, user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !partyId) return;
    try {
      await sendPartyMessage(partyId, chatMessage);
      setChatMessage("");
    } catch (e) {
      showToast("Failed to send message", "error");
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Invite link copied to clipboard!", "success");
    setShowInviteModal(false);
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#080808] text-[#F5F5F7] flex flex-col relative overflow-hidden items-center justify-center p-6">
        <SEO title="Join Watch Party" />
        <div className="absolute inset-0 z-0 opacity-30 bg-gradient-to-br from-[#FF453A]/10 via-[#080808] to-purple-900/10" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/[0.04] border border-white/10 p-8 rounded-[32px] backdrop-blur-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-10 flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-b from-[#FF453A]/20 to-transparent border border-[#FF453A]/30 rounded-[24px] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,69,58,0.2)]">
            <MonitorPlay className="w-10 h-10 text-[#FF453A]" />
          </div>
          <h2 className="text-3xl font-extrabold mb-3 tracking-tight text-white">
            Join the Party
          </h2>
          <p className="text-[#A1A1AA] text-sm mb-8 leading-relaxed px-4">
            You've been invited to a cinematic live event. Sign in to chat, react, and watch in perfect sync.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full bg-[#F5F5F7] hover:bg-white text-[#080808] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 tracking-wide text-[15px] active:scale-[0.98] shadow-lg"
          >
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading || !mediaData || !party || !hasJoined) {
    return <WatchPartySkeleton />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#080808] flex flex-col font-sans text-[#F5F5F7] selection:bg-[#FF453A]/30 pb-safe">
      <SEO title={`Watch Party: ${party.mediaTitle}`} />

      {/* Top section: Video Player area */}
      <div className="w-full relative bg-black z-40 md:rounded-b-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border-b border-white/[0.04] flex-shrink-0">
        
        {/* Apple TV / Liquid Glass Top Bar Overlay */}
        <div className="absolute top-0 left-0 right-0 pt-safe-top p-4 md:p-6 z-[60] flex items-center justify-between bg-gradient-to-b from-[#080808]/90 via-[#080808]/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => navigate(`/details/${slugify(party.mediaTitle)}`)} 
              className="p-3.5 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[24px] rounded-full transition-all border border-white/[0.08] text-white shadow-lg active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-white/[0.06] backdrop-blur-[24px] rounded-full pr-5 pl-2 py-2 border border-white/[0.08] shadow-lg">
              <span className="px-3 py-1 bg-[#FF453A] text-white text-[10px] uppercase tracking-widest font-black rounded-full animate-pulse shadow-[0_0_15px_rgba(255,69,58,0.5)]">
                LIVE
              </span>
              <span className="font-semibold text-sm tracking-wide">{party.mediaTitle}</span>
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span className="text-[#A1A1AA] text-xs font-medium">Playing</span>
              </div>
              <span className="ml-2 px-1.5 py-0.5 rounded border border-white/20 text-[#A1A1AA] text-[9px] font-bold">HD</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => setShowInviteModal(true)} className="p-3.5 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[24px] rounded-full transition-all border border-white/[0.08] text-white shadow-lg active:scale-95">
              <Share2 className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.08] backdrop-blur-[24px] rounded-full transition-all border border-white/[0.08] shadow-lg">
              <Users className="w-4 h-4 text-[#F5F5F7]" />
              <span className="text-sm font-semibold">{participants.length}</span>
            </div>
            <button className="p-3.5 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[24px] rounded-full transition-all border border-white/[0.08] text-white shadow-lg active:scale-95">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Existing VideoPlayer (Cinematic Player) */}
        <div className="w-full aspect-video max-h-[60vh] md:max-h-[70vh]">
          {mediaData ? (
            <VideoPlayer
              mediaData={mediaData}
              poster={party.posterUrl}
              title={party.mediaTitle}
              description={""}
              id={party.mediaId}
              onClose={() => navigate(`/details/${slugify(party.mediaTitle)}`)}
              watchPartyState={party}
              onWatchPartySync={(action, time) => {
                if (isHost && partyId) {
                  updatePlaybackState(partyId, {
                    status: action === "PLAY" ? "PLAYING" : "PAUSED",
                    position: time,
                  });
                }
              }}
              isHost={isHost}
            />
          ) : (
            <div className="w-full h-full bg-[#1C1C1E]/50 rounded-[24px] flex flex-col items-center justify-center border border-white/[0.04]">
              <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin mb-3" />
              <p className="text-[#A1A1AA] text-sm">Loading media stream...</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 md:gap-8 max-w-[1600px] mx-auto w-full">
        
        {/* Watch Party Toolbar */}
        <div className="w-full bg-white/[0.04] backdrop-blur-[32px] rounded-[32px] border border-white/[0.06] p-2 md:p-3 flex items-center justify-between md:justify-center md:gap-16 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative z-30">
          
          <button className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] hover:bg-white/[0.08] transition-all w-[72px] md:w-24 group">
            <div className="relative">
              <Users className="w-6 h-6 md:w-7 md:h-7 text-[#A1A1AA] group-hover:text-white transition-colors" />
              <span className="absolute -top-1.5 -right-2 bg-[#FF453A] text-white text-[9px] font-bold px-1.5 rounded-full shadow-sm">{participants.length}</span>
            </div>
            <span className="text-[11px] md:text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors">People</span>
          </button>

          <button className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] hover:bg-white/[0.08] transition-all w-[72px] md:w-24 group">
            <div className="relative">
              <Smile className="w-6 h-6 md:w-7 md:h-7 text-[#A1A1AA] group-hover:text-white transition-colors" />
              <div className="absolute -top-0.5 -right-1 w-2 h-2 bg-[#FF453A] rounded-full shadow-[0_0_8px_rgba(255,69,58,0.8)]" />
            </div>
            <span className="text-[11px] md:text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors">Reactions</span>
          </button>

          <button className="relative group mx-1 md:mx-4 active:scale-95 transition-transform duration-300">
            <div className="absolute inset-0 bg-[#FF453A] opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative w-16 h-16 md:w-[88px] md:h-[88px] bg-gradient-to-b from-[#FF453A]/20 to-[#FF453A]/5 border border-[#FF453A]/30 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(255,69,58,0.2)] group-hover:border-[#FF453A]/50 transition-colors">
              <Heart className="w-7 h-7 md:w-10 md:h-10 text-[#FF453A] group-hover:scale-110 transition-transform duration-300 ease-out" />
            </div>
          </button>

          <button className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] hover:bg-white/[0.08] transition-all w-[72px] md:w-24 group">
            <RefreshCcw className="w-6 h-6 md:w-7 md:h-7 text-[#32D74B]" />
            <div className="flex flex-col items-center leading-none mt-1 gap-1">
              <span className="text-[11px] md:text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors">Sync</span>
              <span className="text-[9px] font-bold text-[#32D74B] uppercase tracking-wider hidden md:block">Sync is on</span>
            </div>
          </button>

          <button className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] hover:bg-white/[0.08] transition-all w-[72px] md:w-24 group">
            <Settings className="w-6 h-6 md:w-7 md:h-7 text-[#A1A1AA] group-hover:text-white transition-colors" />
            <span className="text-[11px] md:text-xs font-medium text-[#A1A1AA] group-hover:text-white transition-colors">Settings</span>
          </button>

        </div>

        {/* Two Columns Layout */}
        <div className="flex flex-col xl:flex-row gap-6 md:gap-8 w-full flex-1 min-h-0">
          
          {/* Left Column: Live Chat */}
          <div className="flex-1 flex flex-col bg-white/[0.04] backdrop-blur-[32px] rounded-[32px] border border-white/[0.06] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative min-h-[400px]">
            {/* Chat Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-3">
                <h3 className="text-[17px] font-bold tracking-wide text-[#F5F5F7]">Live Chat</h3>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  <div className="w-2 h-2 bg-[#FF453A] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,69,58,0.8)]" />
                  <span className="text-xs font-bold text-white">{messages.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <Pin className="w-[18px] h-[18px]" />
                </button>
                <button className="p-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <SlidersHorizontal className="w-[18px] h-[18px]" />
                </button>
                <button className="p-2.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <ChevronDown className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar bg-gradient-to-b from-transparent to-black/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Smile className="w-12 h-12 text-[#A1A1AA] mb-4 opacity-50" />
                  <p className="text-[#F5F5F7] font-medium text-lg">Start the conversation.</p>
                  <p className="text-[#A1A1AA] text-sm mt-1">Be the first to react to this moment.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.uid === user?.id;
                  const showAvatar = i === 0 || messages[i - 1].uid !== msg.uid;
                  const isVerified = msg.email === 'greatmayuku2@gmail.com' || msg.displayName?.toLowerCase() === 'greatmayuku2' || (isMe && user?.email === 'greatmayuku2@gmail.com');
                  const displayNameToRender = msg.displayName;
                  
                  const colors = ["text-[#32D74B]", "text-[#0A84FF]", "text-[#BF5AF2]", "text-[#FF9F0A]", "text-[#FF375F]"];
                  const nameColor = colors[msg.uid.charCodeAt(0) % colors.length];

                  return (
                    <div key={msg.id} className="flex gap-4 group">
                      <div className="w-[42px] flex-shrink-0 flex justify-center">
                        {showAvatar ? (
                          <img
                            src={msg.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.uid}`}
                            alt=""
                            className="w-[42px] h-[42px] rounded-full border border-white/[0.15] object-cover shadow-lg"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 flex flex-col items-start gap-1">
                        {showAvatar && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className={`text-[15px] font-semibold tracking-wide ${isMe ? "text-white" : nameColor}`}>
                              {isMe ? "You" : displayNameToRender}
                            </span>
                            {isVerified && <MetaVerifiedBadge className="w-3.5 h-3.5 -ml-1" />}
                            <span className="text-[11px] text-[#A1A1AA] font-medium ml-1">
                              {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <div className="text-[15px] leading-[1.6] text-[#F5F5F7] opacity-90 break-words">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>



            {/* Input Area */}
            <div className="p-5 border-t border-white/[0.06] bg-black/60 backdrop-blur-xl">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Chat with the party..."
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-full px-6 py-4 pr-24 text-[15px] text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.1] transition-all font-medium placeholder-[#A1A1AA] shadow-inner"
                />
                <div className="absolute right-3 flex items-center gap-1">
                  <button type="button" className="p-2 text-[#A1A1AA] hover:text-white transition-colors rounded-full hover:bg-white/10">
                    <Smile className="w-[22px] h-[22px]" />
                  </button>
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="p-2.5 bg-[#FF453A] text-white rounded-full disabled:opacity-50 disabled:bg-white/10 disabled:text-[#A1A1AA] hover:bg-[#ff5a51] transition-colors shadow-[0_0_15px_rgba(255,69,58,0.4)] disabled:shadow-none ml-1"
                  >
                    <Send className="w-[18px] h-[18px] ml-0.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: People & Features */}
          <div className="w-full xl:w-[420px] flex flex-col gap-6 md:gap-8">
            
            {/* Party People Card */}
            <div className="bg-white/[0.04] backdrop-blur-[32px] rounded-[32px] border border-white/[0.06] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col max-h-[500px]">
              <div className="p-6 flex justify-between items-center border-b border-white/[0.06] bg-black/40">
                <h3 className="text-[17px] text-[#F5F5F7] font-bold tracking-wide">Party People</h3>
                <div className="flex items-center gap-2 text-sm font-bold text-[#A1A1AA] bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {participants.length} <span className="opacity-50">/</span> 50
                </div>
              </div>
              
              <div className="p-4 space-y-1.5 overflow-y-auto custom-scrollbar flex-1">
                {participants.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-[#A1A1AA] text-sm font-medium">Invite friends to enjoy together.</p>
                  </div>
                ) : (
                  participants.map((p) => {
                    const isMe = p.uid === user?.id;
                    const isHostUser = p.uid === party.hostId;
                    const isVerified = p.email === 'greatmayuku2@gmail.com' || p.displayName?.toLowerCase() === 'greatmayuku2' || (isMe && user?.email === 'greatmayuku2@gmail.com');
                    const displayNameToRender = p.displayName?.split(" ")[0];

                    return (
                      <div key={p.uid} className="flex items-center justify-between p-3 rounded-[20px] hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`}
                              alt=""
                              className="w-12 h-12 rounded-full border border-white/[0.15] object-cover shadow-md"
                            />
                            {isHostUser && (
                              <div className="absolute -top-1.5 -right-1.5 bg-[#FF453A] rounded-full p-1 border-2 border-[#1c1c1e] shadow-sm">
                                <Crown className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#32D74B] border-2 border-[#1c1c1e] rounded-full" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[16px] font-semibold tracking-wide ${isMe ? "text-white" : "text-[#F5F5F7]"}`}>
                                {isMe ? "You" : displayNameToRender}
                              </span>
                              {isVerified && <MetaVerifiedBadge className="w-4 h-4" />}
                            </div>
                            <span className="text-[12px] font-medium text-[#32D74B]">Online</span>
                          </div>
                        </div>
                        <button className="p-3 bg-white/5 rounded-full text-[#A1A1AA] group-hover:text-white transition-colors border border-white/5 hover:border-white/10">
                          <VolumeX className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-5 bg-black/20 border-t border-white/[0.06]">
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="w-full py-4 rounded-[18px] border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  <Plus className="w-[18px] h-[18px]" />
                  Invite Friends
                </button>
              </div>
            </div>

            {/* Watch Party Features Grid */}
            <div className="bg-white/[0.04] backdrop-blur-[32px] rounded-[32px] border border-white/[0.06] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col">
              <div className="p-6 flex justify-between items-center border-b border-white/[0.06] bg-black/40">
                <h3 className="text-[17px] text-[#F5F5F7] font-bold tracking-wide">Features</h3>
                <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />
              </div>
              <div className="p-6">
                <div className="mt-6 p-5 bg-[#32D74B]/10 border border-[#32D74B]/20 rounded-[24px] flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[#32D74B]/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-[#32D74B]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-bold text-[#F5F5F7]">Everyone is synced</span>
                    <span className="text-[13px] text-[#A1A1AA]">Playback is perfectly aligned.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#1c1c1e]/90 border border-white/10 p-8 rounded-[32px] max-w-md w-full relative shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
            >
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 right-6 text-[#A1A1AA] hover:text-white p-2 bg-white/5 rounded-full transition-colors"
              >
                ✕
              </button>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                Invite Friends
              </h3>
              <p className="text-[15px] text-[#A1A1AA] mb-8 leading-relaxed">
                Send this secure link to your friends. They must be signed in to join the private session.
              </p>

              <div className="bg-black/50 border border-white/10 rounded-[20px] p-4 flex items-center gap-4 mb-8">
                <div className="text-[#A1A1AA] text-sm truncate flex-1 font-mono tracking-tight">
                  {window.location.href}
                </div>
                <button
                  onClick={handleCopyInvite}
                  className="p-3 bg-white/10 rounded-xl hover:bg-white/20 text-white transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleCopyInvite}
                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-[20px] transition-all text-[16px] active:scale-95"
              >
                Copy Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
