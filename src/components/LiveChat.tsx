import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { Send, User, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LiveChat() {
  const { user, sendChatMessage } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'globalChat'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    try {
      await sendChatMessage(inputText.trim());
      setInputText('');
    } catch (error) {
      console.error("Chat error", error);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-brand text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/20 border border-white/20"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-50 w-[350px] h-[500px] bg-[#121212] border border-white/10 rounded-3xl flex flex-col shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
                  <MessageCircle className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest italic">Global Chat</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Live Updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live</span>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                    <img 
                      src={msg.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userId}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className={`max-w-[70%] space-y-1 ${msg.userId === user?.id ? 'items-end' : ''}`}>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                      {msg.userName}
                    </p>
                    <div className={`p-3 rounded-2xl text-xs font-medium ${
                      msg.userId === user?.id 
                        ? 'bg-brand text-white rounded-tr-none' 
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/40">
              {user ? (
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sign in to chat</p>
                  <button 
                    onClick={() => window.location.href = '/profile'}
                    className="text-xs font-black text-brand uppercase hover:underline"
                  >
                    Go to Profile
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
