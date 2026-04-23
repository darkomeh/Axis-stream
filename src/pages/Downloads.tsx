import React, { useEffect, useState } from 'react';
import { localDownloadService, DownloadedVideo, ActiveDownload } from '../services/localDownloadService';
import Navbar from '../components/Navbar';
import PopcornLoader from '../components/PopcornLoader';
import { Play, Trash2, Film, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { MovieImage } from "../components/MovieImage";

export default function Downloads() {
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<ActiveDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadVideos();
    
    // Subscribe to active downloads
    const unsubscribe = localDownloadService.subscribe((downloads) => {
      setActiveDownloads(downloads);
      // If a download finished, reload the videos list
      if (downloads.length === 0) {
        loadVideos();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await localDownloadService.getAllVideos();
      setVideos(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error("Failed to load downloads", e);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await localDownloadService.deleteVideo(deleteConfirmId);
      setVideos(videos.filter(v => v.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Failed to delete video", e);
    }
  };

  const cancelDownload = (id: string) => {
    localDownloadService.cancelDownload(id);
  };

  const handlePlay = (video: DownloadedVideo) => {
    const url = URL.createObjectURL(video.blob);
    navigate(`/offline-play/${video.id}`, { state: { url, title: video.title, poster: video.poster } });
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

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
          <h1 className="text-4xl font-bold tracking-tight">My Downloads</h1>
        </div>
        
        {/* Active Downloads Section */}
        {activeDownloads.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <PopcornLoader />
              </div>
              Downloading...
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeDownloads.map((download, index) => (
                <div key={`${download.id}-${index}`} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold line-clamp-1 flex-1 mr-2">{download.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-brand font-mono text-sm">{download.progress}%</span>
                      <button 
                        onClick={() => cancelDownload(download.id)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        title="Cancel download"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${download.progress}%` }}
                      className="h-full bg-brand"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <PopcornLoader />
          </div>
        ) : videos.length === 0 && activeDownloads.length === 0 ? (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center">
            <Film className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium text-gray-400">No downloads yet</p>
            <p className="mt-2">Videos you download will appear here for offline viewing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <div 
                key={`${video.id}-${index}`} 
                onClick={() => handlePlay(video)}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-video bg-black">
                  <MovieImage src={video.poster} alt={video.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-black ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1">{video.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{video.quality} • {new Date(video.timestamp).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{(video.blob.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(video.id);
                    }}
                    className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-8 h-8 text-brand" />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Download?</h3>
                <p className="text-gray-400 mb-8">This action cannot be undone. You will need to download the video again to watch it offline.</p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-brand hover:bg-brand-hover rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(229,9,20,0.4)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
