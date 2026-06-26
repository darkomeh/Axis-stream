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
  PartyMessage 
} from "../services/watchPartyService";
import { movieService } from "../services/movieService";
import VideoPlayer from "../components/VideoPlayer";
import PopcornLoader from "../components/PopcornLoader";
import { SEO } from "../components/SEO";
import { ArrowLeft, Send, Users, Crown, Minimize2, Maximize2, Share2, Copy, MonitorPlay } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function WatchPartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [isDesktop, setIsDesktop] = useState(() => {
    try {
      return typeof window !== "undefined" && window.innerWidth >= 768;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [party, setParty] = useState<WatchParty | null>(null);
  const [participants, setParticipants] = useState<PartyParticipant[]>([]);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [mediaData, setMediaData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(isDesktop);
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
                String(mData.type)
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
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden items-center justify-center p-6">
        <SEO title="Join Watch Party" />
        <div className="absolute inset-0 z-0 opacity-20 bg-gradient-to-br from-brand/20 via-black to-purple-900/20" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0d0d0d] border border-white/10 p-8 rounded-3xl backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-10 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center mb-6 text-brand">
            <MonitorPlay className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Join the Watch Party</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            You've been invited to a live watch party! To join, chat with friends, and watch together, please sign in or create an account.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 tracking-wide text-sm active:scale-[0.98]"
          >
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <PopcornLoader />
      </div>
    );
  }

  // Determine if lobby or watching (could just show player immediately if ready)
  const isPlaying = party.playbackState.status === 'PLAYING';

  return (
    <div className="h-[100dvh] w-full bg-black flex flex-col md:flex-row overflow-hidden relative">
      <SEO title={`Watch Party: ${party.mediaTitle}`} />

      {/* Main Player Area */}
      <div className={`relative flex flex-col bg-black z-40 transition-all duration-300 ${
        isChatOpen 
          ? 'w-full aspect-video md:h-full md:aspect-auto md:flex-1' 
          : 'w-full h-full md:flex-grow md:flex-1 flex justify-center items-center'
      }`}>
        
        {/* Top Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 md:p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 md:gap-4 pointer-events-auto">
            <button 
              onClick={() => {
                if (party?.mediaId && party?.mediaType) {
                  navigate(`/details/${party.mediaType}/${party.mediaId}`);
                } else {
                  navigate("/");
                }
              }}
              className="p-2 md:p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
            >
              <ArrowLeft className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-brand text-white text-[9px] md:text-[10px] uppercase tracking-wider font-bold rounded-md">Live</span>
                <h1 className="text-white font-semibold text-sm md:text-xl truncate max-w-[150px] md:max-w-md">{party.mediaTitle}</h1>
              </div>
              <p className={`text-white/60 text-[10px] md:text-sm font-medium mt-0.5 ${isChatOpen ? 'hidden md:block' : ''}`}>
                Host: {participants.find(p => p.uid === party.hostId)?.displayName || 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            {!isChatOpen && (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="p-2.5 md:p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-all border border-white/10 hidden md:flex"
              >
                <Users className="w-4 md:w-5 h-4 md:h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 text-xs md:text-sm font-semibold"
            >
              <Share2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
              <span className="hidden md:inline">Invite</span>
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className={`w-full relative bg-black ${isChatOpen ? 'h-full' : 'aspect-video max-h-full'}`}>
          <VideoPlayer 
            mediaData={mediaData} 
            poster={party.posterUrl}
            title={party.mediaTitle}
            description={""}
            id={party.mediaId}
            onClose={() => {
              if (party?.mediaId && party?.mediaType) {
                navigate(`/details/${party.mediaType}/${party.mediaId}`);
              } else {
                navigate("/");
              }
            }}
            watchPartyState={party}
            onWatchPartySync={(action, time) => {
              if (isHost && partyId) {
                updatePlaybackState(partyId, { status: action === 'PLAY' ? 'PLAYING' : 'PAUSED', position: time });
              }
            }}
            isHost={isHost}
          />
        </div>
      </div>

      {/* Floating Chat / Attendees Panel for Desktop */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:flex flex-col bg-[#0f0f0f] border-l border-white/5 h-full flex-shrink-0 z-50 relative"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <MonitorPlay className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    Party Room 
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">{participants.length}</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="p-2 text-brand hover:text-brand-hover bg-brand/10 hover:bg-brand/20 rounded-full transition-all flex items-center justify-center"
                  title="Invite friends"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors flex items-center justify-center"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Participants scroller */}
            <div className="p-4 border-b border-white/5 flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {participants.map(p => (
                <div key={p.uid} className="flex flex-col items-center gap-1.5 flex-shrink-0" title={p.displayName}>
                  <div className="relative">
                    <img 
                      src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
                      alt={p.displayName} 
                      className="w-10 h-10 rounded-full border border-white/20 object-cover"
                    />
                    {party.hostId === p.uid && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 border-2 border-[#0f0f0f]">
                        <Crown className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0f0f0f] rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-gray-400 max-w-[48px] truncate">{p.displayName.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, i) => {
                const isMe = msg.uid === user?.id;
                const showAvatar = i === 0 || messages[i-1].uid !== msg.uid;
                
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {showAvatar ? (
                      <img 
                        src={msg.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.uid}`} 
                        alt="" 
                        className="w-8 h-8 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="w-8" />
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      {showAvatar && <span className="text-[10px] text-gray-500 mb-1">{isMe ? 'You' : msg.displayName}</span>}
                      <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${isMe ? 'bg-brand text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-brand/50 focus:bg-white/10 transition-all font-medium"
                />
                <button 
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="absolute right-2 p-2 bg-brand text-white rounded-full disabled:opacity-50 hover:bg-brand-hover transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Chat Toggle Button */}
      {!isChatOpen && (
        <div className="md:hidden absolute bottom-6 right-4 z-50">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="p-4 rounded-full shadow-2xl bg-brand hover:bg-brand-hover text-white border border-white/20 flex items-center justify-center active:scale-95 transition-all"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile Chat Container (Inline split layout below VideoPlayer) */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden w-full flex-1 min-h-0 bg-[#0a0a0a] border-t border-white/10 z-50 flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
              <span className="text-white font-semibold text-sm">Live Chat ({participants.length})</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="p-1.5 text-brand bg-brand/10 hover:bg-brand/20 rounded-full transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>
                <button 
                  onClick={() => setIsChatOpen(false)} 
                  className="text-white/50 p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                >
                  <Minimize2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
            
            {/* Mobile Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#070707]">
              {messages.map((msg, i) => {
                const isMe = msg.uid === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 max-w-[85%] ${isMe ? 'ml-auto' : ''}`}>
                    <span className="text-[10px] text-white/40">{msg.displayName}</span>
                    <div className={`px-4 py-2 rounded-2xl text-[13px] ${isMe ? 'bg-brand text-white' : 'bg-white/15 text-white'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Input */}
            <div className="p-3 border-t border-white/10 bg-black/40">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Chat with the party..."
                  className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none"
                />
                <button type="submit" className="p-2.5 bg-brand text-white rounded-full"><Send className="w-4 h-4"/></button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full relative shadow-2xl"
            >
              <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white p-1">✕</button>
              <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center mb-4 border border-brand/30">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Invite Friends</h3>
              <p className="text-sm text-gray-400 mb-6">Send this link to your friends. They need to be logged in to join the party.</p>
              
              <div className="bg-black border border-white/10 rounded-xl p-3 flex items-center gap-3 mb-6">
                <div className="text-gray-300 text-sm truncate flex-1 font-mono">{window.location.href}</div>
                <button onClick={handleCopyInvite} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <button onClick={handleCopyInvite} className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl transition-all">
                Copy Party Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
