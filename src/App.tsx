/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { MediaPreviewProvider } from "./contexts/MediaPreviewContext";
import BottomNav from "./components/BottomNav";
import MediaPreviewTray from "./components/MediaPreviewTray";
import SystemAlerts from "./components/SystemAlerts";
import PopcornLoader from "./components/PopcornLoader";
import LoginPopup from "./components/LoginPopup";
import { Analytics } from "./components/Analytics";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnimatePresence, motion } from "motion/react";

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
const Playlist = lazyWithRetry(() => import("./pages/Playlist"));
const Ranking = lazyWithRetry(() => import("./pages/Ranking"));
const Legal = lazyWithRetry(() => import("./pages/Legal"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));

import { useAuth } from "./contexts/AuthContext";

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
  const { siteConfig } = useAuth();
  const location = useLocation();
  
  // Apply dynamic brand color and title
  useEffect(() => {
    if (siteConfig) {
      document.documentElement.style.setProperty('--color-brand', siteConfig.brandColor);
      document.title = siteConfig.siteName;
    }
  }, [siteConfig]);

  // Routes where BottomNav should be visible
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/playlist", "/profile", "/ranking", "/live"];
  const shouldShowNav = showNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand/30 selection:text-white font-sans antialiased pb-20">
      <LoginPopup />
      <Analytics />
      <SystemAlerts />
      <MediaPreviewTray />
      <main>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-black">
            <PopcornLoader />
          </div>
        }>
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/details/:id" element={<Details />} />
            <Route path="/watch/:id/:slug?" element={<Details />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/anime" element={<Anime />} />
            <Route path="/actor/:id" element={<ActorPage />} />
            <Route path="/toons" element={<Toons />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/legal/:type" element={<Legal />} />
            {/* Fallback routes for movies/series/trending to browse for now */}
            <Route path="/movies" element={<Browse />} />
            <Route path="/movie" element={<Browse />} />
            <Route path="/series" element={<Browse />} />
            <Route path="/trending" element={<Anime />} />
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
        <ToastProvider>
          <MediaPreviewProvider>
            <Router>
              <AppContent />
            </Router>
          </MediaPreviewProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
