/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { MediaPreviewProvider } from "./contexts/MediaPreviewContext";
import BottomNav from "./components/BottomNav";
import MediaPreviewTray from "./components/MediaPreviewTray";
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
const Legal = lazyWithRetry(() => import("./pages/Legal"));

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
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/profile", "/ranking", "/live"];
  const shouldShowNav = showNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand/30 selection:text-white font-sans antialiased pb-20">
      <MediaPreviewTray />
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
                <Route path="/legal/:type" element={<PageWrapper><Legal /></PageWrapper>} />
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
