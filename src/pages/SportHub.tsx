import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Trophy, 
  Activity, 
  Clock, 
  Play, 
  ChevronRight,
  TrendingUp,
  X,
  Newspaper,
  Radio
} from 'lucide-react';
import Navbar from '../components/Navbar';
import HlsPlayer from '../components/HlsPlayer';
import LiveChat from '../components/LiveChat';
import axios from 'axios';

export default function SportHub() {
  const [feeds, setFeeds] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeNews, setActiveNews] = useState<any>(null);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [matchDetail, setMatchDetail] = useState<any>(null);
  const [loadingMatchDetail, setLoadingMatchDetail] = useState(false);
  const [newsProgress, setNewsProgress] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [activeVideoStream, setActiveVideoStream] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [feedsRes, trendsRes] = await Promise.all([
          axios.get('/api/sport/feeds'),
          axios.get('/api/sport/trend')
        ]);
        setFeeds(feedsRes.data);
        setTrends(trendsRes.data);
      } catch (err) {
        console.error('Failed to load sport data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Cycle Top Stories every 10 seconds with progress tracking
  useEffect(() => {
    if (!trends?.news || trends.news.length === 0) return;
    const maxIndex = Math.min(trends.news.length, 5);
    
    setNewsProgress(0);
    const progressInterval = setInterval(() => {
      setNewsProgress(prev => {
        if (prev >= 100) {
          setHeroIndex(current => (current + 1) % maxIndex);
          return 0;
        }
        return prev + 1; // 1% every 100ms = 10s total
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [trends, heroIndex]);

  const loadMatchDetail = async (match: any) => {
    setActiveMatch(match);
    setLoadingMatchDetail(true);
    setMatchDetail(null);
    setActiveVideoStream(match.playPath || null);
    try {
      const { data } = await axios.get(`/api/sport/detail?id=${match.id}`);
      if (data.success) {
        setMatchDetail(data);
        if (data.stream?.main) {
          setActiveVideoStream(data.stream.main);
        } else if (data.stream?.channels?.length > 0) {
          setActiveVideoStream(data.stream.channels[0].url);
        }
      }
    } catch (err) {
      console.error('Failed to load match detail', err);
    } finally {
      setLoadingMatchDetail(false);
    }
  };

  const getMatchState = (match: any) => {
    const isLive = match.statusLive === 'Living' || match.status === 'MatchIng' || String(match.status).toLowerCase().includes('live');
    const isEnded = match.status === 'MatchEnded' || String(match.status).toLowerCase().includes('end');
    
    let text = match.status;
    if (isLive) text = 'LIVE NOW';
    else if (isEnded) text = 'FULL TIME';
    else if (match.status === 'MatchNotStart') {
      if (match.arrangedTime) {
        text = new Date(Number(match.arrangedTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        text = 'UPCOMING';
      }
    }

    return { isLive, isEnded, text };
  };

  const topNewsList = trends?.news?.slice(0, 5) || [];
  const heroNews = topNewsList[heroIndex];
  const regularNews = trends?.news?.slice(5) || [];
  
  const filteredHighlights = (feeds?.highlights || [])
    .filter((h: any) => !/[\u4E00-\u9FA5]/.test(h.title))
    .sort((a: any, b: any) => Number(b.stat?.viewCount || 0) - Number(a.stat?.viewCount || 0));

  const uniqueLeagues = Array.from(new Set((feeds?.matches || []).map((m: any) => m.league).filter(Boolean)));
  const displayedMatches = (feeds?.matches || []).filter((m: any) => !selectedLeague || m.league === selectedLeague);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand/30">
      <Helmet>
        <title>Axis Sport | Live Matches & Feeds</title>
      </Helmet>
      <Navbar />

      <main className="pb-20">
        {loading ? (
          <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
            <div className="h-[65vh] w-full bg-white/5 animate-pulse rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-2xl border border-white/10" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            {heroNews && (
              <section className="relative h-[65vh] min-h-[500px] w-full mb-16 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={heroNews.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={heroNews.cover?.url} 
                      alt={heroNews.title} 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                  </motion.div>
                </AnimatePresence>
                
                <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 lg:p-16 max-w-7xl mx-auto z-10 w-full flex items-end justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={heroNews.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6 }}
                      className="max-w-3xl"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-brand text-black font-black uppercase tracking-wider text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Top Story
                        </span>
                        <span className="text-gray-300 text-sm font-medium">
                          {new Date(Number(heroNews.createdAt)).toLocaleDateString()}
                        </span>
                      </div>
                      <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-4 leading-tight">
                        {heroNews.title}
                      </h1>
                      <p className="text-lg text-gray-300 line-clamp-2 md:line-clamp-3 mb-8 max-w-2xl font-medium">
                        {heroNews.summary}
                      </p>
                      <button 
                        onClick={() => setActiveNews(heroNews)}
                        className="bg-white text-black font-bold px-8 py-3.5 rounded-full flex items-center gap-2 hover:bg-brand hover:text-black transition-colors"
                      >
                        <Newspaper className="w-5 h-5" />
                        Read Full Story
                      </button>
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Indicators */}
                  <div className="hidden md:flex gap-3">
                    {topNewsList.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          setHeroIndex(i);
                          setNewsProgress(0);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 relative overflow-hidden ${i === heroIndex ? 'w-12 bg-white/30' : 'w-4 bg-white/30 hover:bg-white/50'}`}
                      >
                        {i === heroIndex && (
                          <div 
                            className="absolute top-0 left-0 bottom-0 bg-brand rounded-full transition-all duration-100 ease-linear"
                            style={{ width: `${newsProgress}%` }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
              
              {/* Matches Section */}
              {feeds?.matches?.length > 0 && (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tight">
                      <Activity className="w-8 h-8 text-brand" /> Live & Upcoming
                    </h2>
                    <button className="text-brand text-sm font-bold uppercase tracking-wider hover:text-white transition-colors flex items-center gap-1">
                      View full schedule <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {uniqueLeagues.length > 0 && (
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
                      <button
                        onClick={() => setSelectedLeague(null)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-colors shrink-0 ${
                          selectedLeague === null 
                            ? 'bg-brand text-black' 
                            : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      {uniqueLeagues.map((league: any) => (
                        <button
                          key={league}
                          onClick={() => setSelectedLeague(league)}
                          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-colors shrink-0 ${
                            selectedLeague === league 
                              ? 'bg-brand text-black' 
                              : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          {league}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedMatches.slice(0, 9).map((match: any) => {
                      const { isLive, isEnded, text } = getMatchState(match);
                      const hasStream = match.playType === 'PlayTypeVideo' && match.playPath;
                      
                      return (
                        <motion.div
                          key={match.id}
                          whileHover={{ scale: 1.02, y: -5 }}
                          onClick={() => loadMatchDetail(match)}
                          className="bg-zinc-900 border border-white/5 rounded-2xl p-6 relative overflow-hidden group cursor-pointer shadow-lg"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold px-3 py-1 bg-white/10 text-white rounded-full uppercase tracking-wider group-hover:bg-brand/20 group-hover:text-brand transition-colors">
                              {match.league}
                              {match.matchRound && ` • ${match.matchRound}`}
                            </span>
                            <span className={`text-xs font-black flex items-center gap-1.5 uppercase px-2 py-1 rounded-md ${
                              isLive ? 'bg-red-500/20 text-red-500 animate-pulse' : 
                              isEnded ? 'bg-zinc-800 text-gray-400' : 'bg-brand/20 text-brand'
                            }`}>
                              {isLive ? <Radio className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {text}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col items-center flex-1">
                              <img src={match.team1.avatar} alt={match.team1.name} className="w-16 h-16 object-contain mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                              <span className="text-sm font-bold text-center line-clamp-1">{match.team1.name}</span>
                              <span className={`text-3xl font-black mt-2 tracking-tighter ${isLive || isEnded ? 'opacity-100' : 'opacity-40'}`}>
                                {match.team1.score || '-'}
                              </span>
                            </div>
                            
                            <div className="text-gray-600 font-black text-xl italic px-2">VS</div>

                            <div className="flex flex-col items-center flex-1">
                              <img src={match.team2.avatar} alt={match.team2.name} className="w-16 h-16 object-contain mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                              <span className="text-sm font-bold text-center line-clamp-1">{match.team2.name}</span>
                              <span className={`text-3xl font-black mt-2 tracking-tighter ${isLive || isEnded ? 'opacity-100' : 'opacity-40'}`}>
                                {match.team2.score || '-'}
                              </span>
                            </div>
                          </div>
                          
                          {(isLive || hasStream) && (
                             <div className="absolute bottom-0 left-0 right-0 p-3 bg-red-600/10 flex items-center justify-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                                <Play className="w-3 h-3" /> Watch Action Live
                             </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Highlights Section */}
              {filteredHighlights?.length > 0 && (
                <section>
                  <h2 className="text-3xl font-black flex items-center gap-3 mb-8 uppercase tracking-tight">
                    <Play className="w-8 h-8 text-brand" /> Trending Highlights
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredHighlights.slice(0, 8).map((highlight: any) => (
                      <motion.div
                        key={highlight.id}
                        whileHover={{ scale: 1.05 }}
                        className="relative aspect-video rounded-xl overflow-hidden group cursor-pointer bg-zinc-900 border border-white/10 shadow-xl"
                        onClick={() => highlight.path && setActiveVideo(highlight.path)}
                      >
                        <img 
                          src={highlight.cover?.url || highlight.coverImg} 
                          alt={highlight.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-brand/90 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1">
                          {Math.floor(Number(highlight.duration) / 60)}:{(Number(highlight.duration) % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-sm font-bold line-clamp-2 text-white">{highlight.title}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            {highlight.tag && (
                              <p className="text-xs text-brand uppercase font-black tracking-wider bg-brand/10 px-2 py-0.5 rounded">{highlight.tag}</p>
                            )}
                            {highlight.stat?.viewCount && (
                              <p className="text-xs text-gray-300 font-medium">{Number(highlight.stat.viewCount).toLocaleString()} views</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Latest News */}
              {regularNews.length > 0 && (
                <section>
                  <h2 className="text-3xl font-black flex items-center gap-3 mb-8 uppercase tracking-tight">
                    <Newspaper className="w-8 h-8 text-brand" /> Trending News
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {regularNews.map((article: any) => (
                      <motion.div 
                        key={article.id}
                        whileHover={{ x: 5 }}
                        onClick={() => setActiveNews(article)}
                        className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/10"
                      >
                        <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden relative">
                          <img 
                            src={article.cover?.url} 
                            alt={article.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-brand font-bold bg-brand/10 px-2 py-0.5 rounded">
                              {article.category === 0 ? 'Football' : 'Sport'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(Number(article.createdAt)).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-brand transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {article.summary}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </>
        )}
      </main>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          >
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50 text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/10"
            >
              <HlsPlayer 
                src={activeVideo} 
                controls 
                autoPlay 
                className="w-full h-full object-contain bg-black"
                controlsList="nodownload"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* News Reader Modal */}
      <AnimatePresence>
        {activeNews && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-3xl bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setActiveNews(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-brand hover:text-black rounded-full transition-colors z-10 text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="overflow-y-auto w-full custom-scrollbar">
                {activeNews.cover?.url && (
                  <div className="w-full h-64 sm:h-80 relative">
                    <img src={activeNews.cover.url} alt={activeNews.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                  </div>
                )}
                <div className="p-6 sm:p-10 -mt-20 relative z-10">
                  <div className="flex gap-4 items-center mb-6">
                    <span className="bg-brand text-black font-black uppercase tracking-wider text-sm px-4 py-1.5 rounded-full shadow-lg">
                      {activeNews.category === 0 ? 'Football' : 'Sport'}
                    </span>
                    <span className="text-gray-200 font-bold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand" /> {new Date(Number(activeNews.createdAt)).toLocaleDateString()}
                    </span>
                    {activeNews.stat?.viewCount > 0 && (
                      <span className="text-gray-200 font-bold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-sm">
                        {activeNews.stat.viewCount.toLocaleString()} Reads
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black mb-8 leading-tight text-white drop-shadow-md">{activeNews.title}</h1>
                  
                  <div className="prose prose-invert max-w-none">
                     <p className="text-xl text-gray-300 leading-relaxed font-medium mb-10 border-l-4 border-brand pl-6">
                       {activeNews.summary}
                     </p>
                     
                     <div className="mt-8 p-8 bg-zinc-900 border border-white/10 rounded-3xl relative overflow-hidden flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mb-4">
                          <Newspaper className="w-8 h-8 text-brand" />
                        </div>
                        <h4 className="text-2xl font-black mb-2">Read Full Article</h4>
                        <p className="text-gray-400 mb-6 max-w-md">Get full access to all detailed articles and premium sports reporting inside our dedicated mobile experience.</p>
                        <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                          Unlock Full Content
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Detail Modal */}
      <AnimatePresence>
        {activeMatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setActiveMatch(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10 text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 sm:p-10 flex-1 overflow-y-auto custom-scrollbar">
                {loadingMatchDetail ? (
                   <div className="h-64 flex flex-col items-center justify-center space-y-4">
                     <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                     <p className="text-gray-400 font-bold animate-pulse">Loading Match Room...</p>
                   </div>
                ) : matchDetail?.match || activeMatch ? (
                  <>
                    <div className="text-center mb-10">
                      <span className="inline-block px-6 py-2 bg-zinc-900 border border-white/10 rounded-full text-sm font-black uppercase tracking-widest text-brand mb-8 shadow-inner">
                        {matchDetail?.match?.league || activeMatch.league} • {matchDetail?.match?.round || activeMatch.matchRound || 'Regular Season'}
                      </span>
                      
                      <div className="flex items-center justify-center gap-4 sm:gap-12 bg-zinc-900/50 p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent" />
                        <div className="flex flex-col items-center flex-1 relative z-10 w-1/3">
                          <div className="bg-white p-4 rounded-full shadow-2xl shadow-black/50 mb-4">
                            <img src={matchDetail?.match?.team1.avatar || activeMatch.team1.avatar} alt={matchDetail?.match?.team1.name || activeMatch.team1.name} className="w-20 h-20 sm:w-28 sm:h-28 object-contain" />
                          </div>
                          <h3 className="text-lg sm:text-2xl font-black text-center">{matchDetail?.match?.team1.name || activeMatch.team1.name}</h3>
                          <div className="text-6xl sm:text-8xl font-black mt-2 text-white tracking-tighter">
                            {matchDetail?.match?.team1.score || activeMatch.team1.score || '0'}
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center px-2 z-10">
                           <span className={`px-5 py-2 rounded-lg uppercase font-black tracking-widest text-xs sm:text-sm mb-6 ${
                             getMatchState(matchDetail?.match || activeMatch).isLive ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-zinc-800 text-gray-300'
                           }`}>
                             {getMatchState(matchDetail?.match || activeMatch).text}
                           </span>
                           <div className="text-zinc-600 font-black text-3xl italic">VS</div>
                        </div>

                        <div className="flex flex-col items-center flex-1 relative z-10 w-1/3">
                          <div className="bg-white p-4 rounded-full shadow-2xl shadow-black/50 mb-4">
                            <img src={matchDetail?.match?.team2.avatar || activeMatch.team2.avatar} alt={matchDetail?.match?.team2.name || activeMatch.team2.name} className="w-20 h-20 sm:w-28 sm:h-28 object-contain" />
                          </div>
                          <h3 className="text-lg sm:text-2xl font-black text-center">{matchDetail?.match?.team2.name || activeMatch.team2.name}</h3>
                          <div className="text-6xl sm:text-8xl font-black mt-2 text-white tracking-tighter">
                             {matchDetail?.match?.team2.score || activeMatch.team2.score || '0'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Stream Section */}
                    {activeVideoStream ? (
                      <div className="mt-10 space-y-6">
                        <div className="rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black aspect-video relative group">
                           <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full text-sm font-black uppercase shadow-lg shadow-red-900/50">
                             <Radio className="w-4 h-4 animate-pulse" /> Live Broadcast
                           </div>
                           <HlsPlayer 
                             src={activeVideoStream} 
                             controls 
                             autoPlay 
                             className="w-full h-full object-contain"
                           />
                        </div>

                        {/* Channel Switcher */}
                        {matchDetail?.stream?.channels?.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                             {matchDetail.stream.channels.map((chan: any, i: number) => (
                               <button
                                 key={i}
                                 onClick={() => setActiveVideoStream(chan.url)}
                                 className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-3 border shadow-sm ${
                                   activeVideoStream === chan.url
                                     ? 'bg-brand text-black border-brand'
                                     : 'bg-zinc-900 text-gray-400 border-white/5 hover:border-brand/50 hover:text-white'
                                 }`}
                               >
                                  <Play className="w-4 h-4" /> Feed {i + 1}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-10 p-12 text-center bg-zinc-900 border border-white/5 rounded-3xl">
                         <Play className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                         <h4 className="text-2xl font-black text-zinc-300 mb-2">No Stream Available</h4>
                         <p className="text-zinc-500 font-medium">
                           {getMatchState(matchDetail?.match || activeMatch).isEnded
                             ? 'Match has ended. Live feeds are no longer active.' 
                             : 'Streaming link will be automatically available here when match coverage starts.'}
                         </p>
                      </div>
                    )}
                    
                    {/* Fake Live Stats Feature */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                       <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                         <h4 className="font-black text-xl mb-6 text-white tracking-widest uppercase text-center border-b border-white/5 pb-4">Match Stats</h4>
                         <div className="space-y-4">
                           {[
                             { label: 'Ball Possession', val1: '48%', val2: '52%' },
                             { label: 'Total Shots', val1: '12', val2: '9' },
                             { label: 'Shots on Target', val1: '4', val2: '5' },
                             { label: 'Pass Accuracy', val1: '86%', val2: '89%' },
                             { label: 'Fouls', val1: '11', val2: '8' }
                           ].map(stat => (
                             <div key={stat.label} className="flex flex-col gap-2">
                               <div className="flex justify-between text-xs font-bold text-gray-400">
                                 <span>{stat.val1}</span>
                                 <span className="uppercase text-[10px] tracking-wider">{stat.label}</span>
                                 <span>{stat.val2}</span>
                               </div>
                               <div className="w-full h-2 bg-black rounded-full flex overflow-hidden">
                                 <div className="h-full bg-brand" style={{ width: stat.val1.includes('%') ? stat.val1 : `${(Number(stat.val1) / (Number(stat.val1) + Number(stat.val2) || 1)) * 100}%` }}></div>
                                 <div className="h-full bg-blue-500" style={{ width: stat.val2.includes('%') ? stat.val2 : `${(Number(stat.val2) / (Number(stat.val1) + Number(stat.val2) || 1)) * 100}%` }}></div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                       
                       <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-32 h-32" />
                          </div>
                          <Radio className="w-12 h-12 text-brand mb-4 mx-auto" />
                          <h4 className="font-black text-xl mb-2 text-white">Live Match Tracker</h4>
                          <p className="text-sm text-gray-400 max-w-sm">
                            Advanced real-time statistics, positional heatmaps, and player performance metrics will be available when tracking data connects.
                          </p>
                          <button className="mt-6 border border-brand/50 text-brand px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand hover:text-black transition-colors">
                            Enable Analytics
                          </button>
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                     <p className="text-gray-400">Failed to load match details.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <LiveChat />
    </div>
  );
}

