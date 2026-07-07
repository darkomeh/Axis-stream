import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ListVideo, X, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Playlist() {
 const { playlists, createPlaylist, deletePlaylist } = useAuth();
 const { showToast } = useToast();
 const navigate = useNavigate();

 const handleCreatePlaylist = () => {
 const name = window.prompt("Enter Playlist Name:");
 if (name && name.trim().length > 0) {
 createPlaylist(name.trim());
 showToast("Playlist created successfully!", "success");
 }
 };

 return (
 <div className="min-h-screen bg-transparent text-white relative pb-32">
 <Navbar />

 <div className="relative z-10 pt-28 px-6 max-w-[1200px] mx-auto space-y-8">
 <div className="flex items-center gap-4 mb-8">
 <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
 <ArrowLeft className="w-5 h-5 text-gray-400" />
 </button>
 <h1 className="text-fluid-3xl font-semibold tracking-tight">My <span className="text-brand">Playlists</span></h1>
 </div>

 <div className="glass-panel p-6 lg:p-12">
 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
 <h3 className="text-fluid-sm font-semibold tracking-wide flex items-center gap-3">
 <ListVideo className="w-6 h-6 text-brand" /> Your Collections
 </h3>
 <button onClick={handleCreatePlaylist} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-full text-fluid-sm font-semibold tracking-wide transition-all group active:scale-95 shadow-lg shadow-brand/20">
 <Plus className="w-4 h-4" /> Create Playlist
 </button>
 </div>
 
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 md:p-10 text-center space-y-6">
 {playlists && playlists.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
 {playlists.map(p => (
 <div key={p.id} className="bg-white/5 border border-white/10 hover:border-brand/40 rounded-2xl p-6 flex items-start justify-between transition-colors group">
 <div>
 <h4 className="font-semibold text-fluid-xl text-white tracking-tight mb-2">{p.name}</h4>
 <p className="text-fluid-sm text-gray-500 font-bold tracking-wide">{p.items.length} Items</p>
 </div>
 <button onClick={() => deletePlaylist(p.id)} className="p-2 bg-black/40 backdrop-blur-3xl text-gray-400 hover:text-brand hover:bg-black/40 backdrop-blur-3xl rounded-full transition-all opacity-0 group-hover:opacity-100">
 <X className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-20 text-center space-y-4">
 <ListVideo className="w-12 h-12 text-gray-800 mx-auto opacity-50" />
 <p className="text-fluid-xs font-bold text-gray-500 tracking-wide">No custom playlists created yet.</p>
 <p className="text-fluid-sm font-medium text-gray-600">Start organizing your favorite movies and series.</p>
 </div>
 )}
 </div>
 </div>
 </div>
 <Footer />
 </div>
 );
}
