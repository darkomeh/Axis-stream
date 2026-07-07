/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { MediaPreviewProvider, useMediaPreview } from "./contexts/MediaPreviewContext";
import MediaPreviewTray from "./components/MediaPreviewTray";
import SystemAlerts from "./components/SystemAlerts";
import NotificationListener from "./components/NotificationListener";
import WhatsAppBubble from "./components/WhatsAppBubble";
// import LoginPopup from "./components/LoginPopup"; // Removing as per request
import { Analytics } from "./components/Analytics";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnimatePresence, motion } from "motion/react";
import { TasteProfiler } from "./components/TasteProfiler";
import { OfflineBanner } from "./components/OfflineBanner";

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
const Trails = lazyWithRetry(() => import("./pages/Trails"));
const WatchPartyPage = lazyWithRetry(() => import("./pages/WatchParty"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Achievements = lazyWithRetry(() => import("./pages/Achievements"));
const NotificationCenter = lazyWithRetry(() => import("./pages/NotificationCenter"));
const LiveTV = lazyWithRetry(() => import("./pages/LiveTV"));
const LiveTVPlayerScreen = lazyWithRetry(() => import("./pages/LiveTVPlayerScreen"));

import { useAuth } from "./contexts/AuthContext";
import BottomNav from "./components/BottomNav";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const { siteConfig } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { previewId, triggerSource, closePreview } = useMediaPreview();

  // Redirect any previewId trigger directly to details page or watch page
  useEffect(() => {
    if (previewId) {
      if (triggerSource === 'continue-watching' || triggerSource === 'watchlist') {
        navigate(`/watch/${previewId}`);
      } else {
        navigate(`/details/${previewId}`);
      }
      closePreview();
    }
  }, [previewId, triggerSource, navigate, closePreview]);
  
  // Apply dynamic brand color and title, and User Theme Preferences
  const { preferences } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply Site Config & Title
    if (siteConfig) {
      document.title = siteConfig.siteName;
    }

    // Apply Accent Color (overrides site config if user selected one)
    const colors: Record<string, string> = {
      "Red": "#FF3B30",
      "Blue": "#007AFF",
      "Purple": "#AF52DE",
      "Orange": "#FF9500",
      "Green": "#34C759",
      "Gold": "#FFCC00"
    };

    if (preferences.accentColor && colors[preferences.accentColor]) {
      root.style.setProperty('--color-brand', colors[preferences.accentColor]);
    } else if (siteConfig) {
      root.style.setProperty('--color-brand', siteConfig.brandColor);
    } else {
      root.style.setProperty('--color-brand', '#FF3B30'); // Default
    }

    // Apply Theme
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = preferences.theme || "Dark";
    
    if (theme === "System") {
      theme = isSystemDark ? "Dark" : "Light";
    }

    if (theme === "OLED Black") {
      body.style.backgroundColor = "#000000";
    } else if (theme === "Midnight Black") {
      body.style.backgroundColor = "#0A0A10";
    } else if (theme === "Light") {
      body.style.backgroundColor = "#F5F5F7";
      body.style.color = "#000000";
    } else {
      // Default Dark
      body.style.backgroundColor = "#080808";
      body.style.color = "#F5F5F7";
    }
  }, [siteConfig, preferences.theme, preferences.accentColor]);

  // Routes where BottomNav should be visible
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/playlist", "/profile", "/ranking", "/live", "/sports", "/series", "/movies"];
  const shouldShowNav = showNavRoutes.includes(location.pathname) && !location.pathname.startsWith("/trails") && !location.pathname.startsWith("/live/");

  return (
    <div className={`min-h-screen bg-transparent text-white selection:bg-brand/30 selection:text-white font-sans antialiased ${shouldShowNav ? "pb-20" : ""}`}>
      {/* <LoginPopup /> */}
      <OfflineBanner />
      <Analytics />
      <NotificationListener />
      <SystemAlerts />
      <WhatsAppBubble />
      <main>
        <Suspense fallback={
          <div className="min-h-screen bg-[#080808] text-white pb-20 overflow-hidden">
            <div className="relative w-full aspect-[21/9] bg-transparent overflow-hidden mb-12">
              <div className="animate-pulse bg-white/5 rounded-md absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%' }} />
            </div>
            <div className="max-w-[1400px] mx-auto px-6 space-y-12">
              <div className="animate-pulse bg-white/5 rounded-md h-8 w-48" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%' }} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="animate-pulse bg-white/5 rounded-xl aspect-[2/3] w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        }>
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
            <Route path="/details/:id" element={<PageWrapper><Details /></PageWrapper>} />
            <Route path="/watch/:id" element={<PageWrapper><Details /></PageWrapper>} />
            <Route path="/browse" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="/anime" element={<PageWrapper><Anime /></PageWrapper>} />
            <Route path="/actor/:id" element={<PageWrapper><ActorPage /></PageWrapper>} />
            <Route path="/toons" element={<PageWrapper><Toons /></PageWrapper>} />
            <Route path="/playlist" element={<PageWrapper><Playlist /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="/achievements" element={<PageWrapper><Achievements /></PageWrapper>} />
            <Route path="/ranking" element={<PageWrapper><Ranking /></PageWrapper>} />
            <Route path="/trails" element={<PageWrapper><Trails /></PageWrapper>} />
            <Route path="/trails/:movieSlug" element={<PageWrapper><Trails /></PageWrapper>} />
            <Route path="/sports" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="/live" element={<PageWrapper><LiveTV /></PageWrapper>} />
            <Route path="/live/:channelId" element={<PageWrapper><LiveTVPlayerScreen /></PageWrapper>} />
            <Route path="/watch-party/:partyId" element={<PageWrapper><WatchPartyPage /></PageWrapper>} />
            <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
            <Route path="/legal/:type" element={<PageWrapper><Legal /></PageWrapper>} />
            <Route path="/notifications" element={<PageWrapper><NotificationCenter /></PageWrapper>} />
            {/* Fallback routes for movies/series/trending to browse for now */}
            <Route path="/movies" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="/movie" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="/series" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="/trending" element={<PageWrapper><Anime /></PageWrapper>} />
          </Routes>
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
              <TasteProfiler />
            </Router>
          </MediaPreviewProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
