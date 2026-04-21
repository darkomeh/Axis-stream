import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, ListVideo, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { MediaItem } from "../types";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem;
}

export function PlaylistModal({ isOpen, onClose, item }: PlaylistModalProps) {
  const { customPlaylists, createPlaylist, addToPlaylist, removeFromPlaylist } = useAuth();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    // Check if it exists
    let existingId = customPlaylists?.find(p => p.name.toLowerCase() === newPlaylistName.trim().toLowerCase())?.id;
    if (!existingId) {
      existingId = createPlaylist(newPlaylistName.trim());
    }
    
    if (existingId) {
      addToPlaylist(existingId, item);
      setNewPlaylistName("");
      setIsCreating(false);
    }
  };

  const handleToggle = (playlistId: string, isInList: boolean) => {
    if (isInList) {
      removeFromPlaylist(playlistId, item.id);
    } else {
      addToPlaylist(playlistId, item);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center border border-brand/30">
              <ListVideo className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Save to Playlist</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest line-clamp-1">{item.title}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto hide-scrollbar mb-6">
            {customPlaylists && customPlaylists.length > 0 ? (
              customPlaylists.map(playlist => {
                const isInList = playlist.items?.some(i => i.id === item.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleToggle(playlist.id, isInList)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                  >
                    <span className="font-medium text-sm text-gray-200">{playlist.name}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isInList ? 'bg-brand' : 'bg-white/10 group-hover:bg-white/20'}`}>
                      {isInList ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white p-0.5" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-xs text-gray-500 font-medium py-4 uppercase tracking-widest leading-relaxed">
                You don't have any custom playlists yet. Create one below to get started!
              </p>
            )}
          </div>

          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-3">
              <input
                autoFocus
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Name your playlist..."
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-brand transition-colors text-sm text-white placeholder-gray-600 font-medium"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 py-3 px-4 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-[0_0_15px_rgba(229,9,20,0.4)]"
                >
                  Create & Save
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-white/10 hover:border-brand/50 hover:bg-brand/5 transition-colors group"
            >
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" />
              <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">New Playlist</span>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
