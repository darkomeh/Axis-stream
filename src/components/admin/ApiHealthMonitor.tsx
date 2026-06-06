import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ApiEndpoint {
 name: string;
 url: string;
 type: 'GET' | 'POST';
 critical: boolean;
}

const endpoints: ApiEndpoint[] = [
 { name: 'XCasper Primary API', url: 'https://movieapi.xcasper.space/api/category/latest?page=1', type: 'GET', critical: true },
 { name: 'VidSrc Source', url: 'https://vidsrc.to/', type: 'GET', critical: true },
];

export default function ApiHealthMonitor() {
 const [healthMap, setHealthMap] = useState<Record<string, { status: 'checking' | 'online' | 'offline', latency?: number, lastChecked: Date }>>({});

 const checkEndpoint = async (ep: ApiEndpoint) => {
 setHealthMap(prev => ({ ...prev, [ep.name]: { status: 'checking', lastChecked: new Date() } }));
 const startTime = performance.now();
 try {
 // Use no-mode or just let it fail CORS to test network reachability
 const res = await fetch(ep.url, { method: ep.type, mode: 'no-cors' });
 const latency = Math.round(performance.now() - startTime);
 setHealthMap(prev => ({ ...prev, [ep.name]: { status: 'online', latency, lastChecked: new Date() } }));
 } catch (error) {
 setHealthMap(prev => ({ ...prev, [ep.name]: { status: 'offline', lastChecked: new Date() } }));
 }
 };

 const checkAll = () => {
 endpoints.forEach(checkEndpoint);
 };

 useEffect(() => {
 checkAll();
 const interval = setInterval(checkAll, 60000); // Check every minute
 return () => clearInterval(interval);
 }, []);

 return (
 <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
 <div className="flex items-center justify-between border-b border-white/10 pb-6">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-blue-500/10 rounded-2xl">
 <Activity className="w-6 h-6 text-blue-500" />
 </div>
 <div>
 <h2 className="text-fluid-2xl font-semibold tracking-tight">API Health Monitor</h2>
 <p className="text-fluid-sm font-semibold text-gray-500 tracking-wide mt-1">Real-time External API Diagnostics</p>
 </div>
 </div>
 <button onClick={checkAll} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
 <Activity className="w-4 h-4 text-white" />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {endpoints.map((ep) => {
 const health = healthMap[ep.name];
 const isOnline = health?.status === 'online';
 const isChecking = health?.status === 'checking';
 const isOffline = health?.status === 'offline';

 return (
 <motion.div 
 key={ep.name}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className={`p-6 rounded-3xl border transition-all ${ isOffline ? 'bg-red-500/10 border-red-500/20' : isWait(health) ? 'bg-orange-500/10 border-orange-500/20' : isChecking ? 'bg-white/5 border-white/10' : 'bg-green-500/5 border-green-500/10' }`}
 >
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-bold text-fluid-sm tracking-wide flex items-center gap-2">
 {ep.name}
 {ep.critical && <span className="text-fluid-xs bg-red-500 text-white px-2 py-0.5 rounded-full">CRITICAL</span>}
 </h3>
 {isChecking ? (
 <Activity className="w-5 h-5 text-gray-500 animate-spin" />
 ) : isOnline ? (
 <CheckCircle className="w-5 h-5 text-green-500" />
 ) : (
 <XCircle className="w-5 h-5 text-red-500" />
 )}
 </div>
 <div className="flex items-end justify-between">
 <div>
 <p className="text-fluid-sm font-semibold tracking-wide text-gray-500 mb-1">Latency</p>
 <p className={`text-fluid-2xl font-semibold ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
 {isChecking ? '...' : isOnline ? `${health.latency}ms` : 'ERR'}
 </p>
 </div>
 <div className="text-right">
 <p className="text-fluid-xs font-semibold tracking-wide text-gray-600">Last Ping</p>
 <p className="text-fluid-sm font-semibold text-gray-400">
 {health?.lastChecked ? health.lastChecked.toLocaleTimeString() : '...'}
 </p>
 </div>
 </div>
 </motion.div>
 );
 })}
 <FirebaseHealthCheck />
 </div>
 </div>
 );
}

function isWait(health: any) {
 return health?.latency && health.latency > 1000;
}

function FirebaseHealthCheck() {
 const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
 const [latency, setLatency] = useState<number>(0);
 const [lastCheck, setLastCheck] = useState<Date | null>(null);

 const checkFirebase = async () => {
 setStatus('checking');
 try {
 const startTime = performance.now();
 const { db } = await import('../../lib/firebase');
 const { doc, getDocFromServer } = await import('firebase/firestore');
 
 // Ping global analytics
 await getDocFromServer(doc(db, 'analytics', 'global'));
 setLatency(Math.round(performance.now() - startTime));
 setStatus('online');
 setLastCheck(new Date());
 } catch(e) {
 setStatus('offline');
 setLastCheck(new Date());
 }
 };

 useEffect(() => {
 checkFirebase();
 const interval = setInterval(checkFirebase, 60000);
 return () => clearInterval(interval);
 }, []);

 const isOnline = status === 'online';
 const isChecking = status === 'checking';

 return (
 <motion.div 
 className={`p-6 rounded-3xl border transition-all ${ status === 'offline' ? 'bg-red-500/10 border-red-500/20' : isChecking ? 'bg-white/5 border-white/10' : 'bg-orange-500/5 border-orange-500/20' }`}
 >
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-bold text-fluid-sm tracking-wide flex items-center gap-2">
 Firestore Database
 <span className="text-fluid-xs bg-red-500 text-white px-2 py-0.5 rounded-full">CRITICAL</span>
 </h3>
 {isChecking ? (
 <Activity className="w-5 h-5 text-gray-500 animate-spin" />
 ) : isOnline ? (
 <CheckCircle className="w-5 h-5 text-orange-500" />
 ) : (
 <XCircle className="w-5 h-5 text-red-500" />
 )}
 </div>
 <div className="flex items-end justify-between">
 <div>
 <p className="text-fluid-sm font-semibold tracking-wide text-gray-500 mb-1">Latency</p>
 <p className={`text-fluid-2xl font-semibold ${isOnline ? 'text-orange-500' : 'text-red-500'}`}>
 {isChecking ? '...' : isOnline ? `${latency}ms` : 'ERR'}
 </p>
 </div>
 <div className="text-right">
 <p className="text-fluid-xs font-semibold tracking-wide text-gray-600">Last Ping</p>
 <p className="text-fluid-sm font-semibold text-gray-400">
 {lastCheck ? lastCheck.toLocaleTimeString() : '...'}
 </p>
 </div>
 </div>
 </motion.div>
 );
}
