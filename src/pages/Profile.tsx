import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import TopTenGrid from '../components/TopTenGrid';
import { User, LogOut, Settings, Clock, Bookmark, Film, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, login, logout, watchlist, history, clearHistory } = useAuth();
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
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
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
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
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
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
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
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-6"
              >
                {isLoginMode ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-red-500 hover:text-red-400 font-medium"
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
    <div className="min-h-screen bg-[#050505] text-white pb-20">
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
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{user.username}</h1>
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
              <div className="text-3xl font-bold text-white mb-1">{watchlist.length}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Watchlist</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">{history.length}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">History</div>
            </div>
          </div>
        </div>

        {/* Watchlist Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Bookmark className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold">My Watchlist</h2>
          </div>
          {watchlist.length > 0 ? (
            <TopTenGrid items={watchlist.slice(0, 10)} showNumbers={false} />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Your watchlist is empty.</p>
            </div>
          )}
        </div>

        {/* History Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold">Viewing History</h2>
            </div>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
          {history.length > 0 ? (
            <TopTenGrid items={history.slice(0, 10)} showNumbers={false} />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No viewing history yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
