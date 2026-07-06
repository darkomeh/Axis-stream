import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bell, Film, Tv, Shield, Trophy, Users, Image as ImageIcon, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import { broadcastNotification, sendNotificationToUser } from '../../services/notificationService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { NotificationType } from '../../pages/NotificationCenter';

export default function NotificationCommandCenter() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState<NotificationType>('announcement');
  const [priority, setPriority] = useState<'normal'|'high'|'critical'>('normal');
  const [target, setTarget] = useState<'all'|'developers'|'specific'>('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  const TYPES = [
    { value: 'announcement', label: 'Announcement', icon: Bell },
    { value: 'new_movie', label: 'New Movie', icon: Film },
    { value: 'new_episode', label: 'New Episode', icon: Tv },
    { value: 'system_update', label: 'System Update', icon: CheckCircle2 },
    { value: 'security', label: 'Security Alert', icon: Shield },
    { value: 'developer', label: 'Developer Message', icon: Trophy },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        title,
        subtitle,
        type,
        priority,
        posterUrl: posterUrl || undefined,
        actionUrl: actionUrl || undefined,
      };

      if (target === 'all' || target === 'developers') {
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let targetUsers = [];
        usersSnapshot.forEach(doc => {
           const data = doc.data();
           if (target === 'all' || (target === 'developers' && data.role === 'admin')) {
             targetUsers.push(doc.id);
           }
        });

        // Send in batches or individually (individually here for simplicity, typically use a Cloud Function)
        // Let's use broadcastNotification to add to a broadcast collection if it's 'all'
        // But for actual delivery to in-app, we iterate users:
        await Promise.all(targetUsers.map(uid => sendNotificationToUser(uid, payload)));
        
        setSuccessMessage(`Successfully sent to ${targetUsers.length} users.`);
      } else if (target === 'specific') {
        if (!specificUserId) throw new Error("User ID is required");
        await sendNotificationToUser(specificUserId, payload);
        setSuccessMessage('Successfully sent to user.');
      }
      
      // Reset form
      setTitle('');
      setSubtitle('');
      setPosterUrl('');
      setActionUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121212] rounded-3xl border border-white/10 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
         <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
           <Bell className="w-6 h-6 text-brand" />
           Notification Command Center
         </h2>
      </div>

      <form onSubmit={handleSend} className="p-6 md:p-8 space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Notification Title</label>
              <input 
                required
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Dune: Part Two is now streaming"
                className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Message Description</label>
              <textarea 
                required
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Keep it brief and actionable..."
                rows={3}
                className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand appearance-none"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand appearance-none"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setTarget('all')} className={`py-3 rounded-xl border text-sm font-medium transition-colors ${target === 'all' ? 'bg-brand/20 border-brand text-brand' : 'bg-[#080808] border-white/10 text-gray-400 hover:text-white'}`}>
                  Everyone
                </button>
                <button type="button" onClick={() => setTarget('developers')} className={`py-3 rounded-xl border text-sm font-medium transition-colors ${target === 'developers' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-[#080808] border-white/10 text-gray-400 hover:text-white'}`}>
                  Developers
                </button>
                <button type="button" onClick={() => setTarget('specific')} className={`py-3 rounded-xl border text-sm font-medium transition-colors ${target === 'specific' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-[#080808] border-white/10 text-gray-400 hover:text-white'}`}>
                  Specific User
                </button>
              </div>
            </div>

            {target === 'specific' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
                <input 
                  type="text" 
                  value={specificUserId}
                  onChange={e => setSpecificUserId(e.target.value)}
                  placeholder="Paste User UID..."
                  className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand"
                />
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Optional Poster URL
              </label>
              <input 
                type="url" 
                value={posterUrl}
                onChange={e => setPosterUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Action URL (Deep Link)
              </label>
              <input 
                type="text" 
                value={actionUrl}
                onChange={e => setActionUrl(e.target.value)}
                placeholder="/play?subjectId=..."
                className="w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={loading || !title || !subtitle}
            className="px-8 py-3 bg-brand hover:bg-brand/80 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Broadcast Notification
          </button>
        </div>
      </form>
    </div>
  );
}
