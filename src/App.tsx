/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import BottomNav from "./components/BottomNav";
import PopcornLoader from "./components/PopcornLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff, AlertTriangle } from "lucide-react";

// Helper to gracefully handle Vite dynamic import failures (stale chunks after rebuild)
function lazyWithRetry(componentImport: () => Promise<any>) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}

// Lazy load pages
const Home = lazyWithRetry(() => import("./pages/Home"));
const Search = lazyWithRetry(() => import("./pages/Search"));
const Details = lazyWithRetry(() => import("./pages/Details"));
const Browse = lazyWithRetry(() => import("./pages/Browse"));
const Anime = lazyWithRetry(() => import("./pages/Anime"));
const ActorPage = lazyWithRetry(() => import("./pages/Actor"));
const Toons = lazyWithRetry(() => import("./pages/Toons"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Downloads = lazyWithRetry(() => import("./pages/Downloads"));
const OfflinePlayer = lazyWithRetry(() => import("./pages/OfflinePlayer"));
const Ranking = lazyWithRetry(() => import("./pages/Ranking"));
const Live = lazyWithRetry(() => import("./pages/Live"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));

import { useAuth } from "./contexts/AuthContext";
import SystemAlerts from "./components/SystemAlerts";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const { user, isMaintenance, isAdmin, siteConfig, systemMessage, broadcastLevel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Apply dynamic brand color and title
  useEffect(() => {
    if (siteConfig) {
      document.documentElement.style.setProperty('--color-brand', siteConfig.brandColor);
      document.title = siteConfig.siteName;
    }
  }, [siteConfig]);

  // Handle maintenance mode
  useEffect(() => {
    if (isMaintenance && !isAdmin && location.pathname !== '/') {
       // Allow home page purely for status info or just leave it
    }
  }, [isMaintenance, isAdmin, location.pathname]);

  // Routes where BottomNav should be visible
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/profile", "/ranking", "/live"];
  const shouldShowNav = showNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand/30 selection:text-white font-sans antialiased pb-20 lg:pl-64">
      <SystemAlerts />
      
      {systemMessage && (
        <div className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] shadow-xl ${
          broadcastLevel === 'critical' ? 'bg-red-600 animate-pulse text-white' : 
          broadcastLevel === 'warning' ? 'bg-orange-500 text-white' : 
          'bg-brand text-white'
        }`}>
          <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-3">
             <AlertTriangle className="w-3 h-3" />
             {systemMessage}
          </div>
        </div>
      )}

      {isMaintenance && !isAdmin && location.pathname !== '/admin' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
            <WifiOff className="w-20 h-20 text-brand mb-8 animate-pulse" />
            <h1 className="text-4xl font-black italic tracking-tighter mb-4 uppercase">Lockdown Initiated</h1>
            <p className="max-w-md text-gray-500 font-medium leading-relaxed">
              Platform is currently undergoing high-priority tactical updates. 
              Status: <span className="text-brand">Encrypted</span>.
            </p>
            <div className="mt-12 p-8 border border-white/5 bg-white/2 rounded-3xl">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-2">Estimated Restoration</p>
               <p className="text-2xl font-black italic">STANDBY</p>
            </div>
        </div>
      )}
      <main>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-black">
            <PopcornLoader />
          </div>
        }>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
                <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
                <Route path="/details/:id" element={<PageWrapper><Details /></PageWrapper>} />
                <Route path="/browse" element={<PageWrapper><Browse /></PageWrapper>} />
                <Route path="/anime" element={<PageWrapper><Anime /></PageWrapper>} />
                <Route path="/actor/:id" element={<PageWrapper><ActorPage /></PageWrapper>} />
                <Route path="/toons" element={<PageWrapper><Toons /></PageWrapper>} />
                <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
                <Route path="/ranking" element={<PageWrapper><Ranking /></PageWrapper>} />
                <Route path="/live" element={<PageWrapper><Live /></PageWrapper>} />
                <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
                {/* Fallback routes for movies/series/trending to browse for now */}
                <Route path="/movies" element={<PageWrapper><Browse /></PageWrapper>} />
                <Route path="/series" element={<PageWrapper><Browse /></PageWrapper>} />
                <Route path="/trending" element={<PageWrapper><Anime /></PageWrapper>} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {shouldShowNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
