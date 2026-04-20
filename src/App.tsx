/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import BottomNav from "./components/BottomNav";
import PopcornLoader from "./components/PopcornLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnimatePresence, motion } from "motion/react";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const Details = lazy(() => import("./pages/Details"));
const Browse = lazy(() => import("./pages/Browse"));
const Anime = lazy(() => import("./pages/Anime"));
const ActorPage = lazy(() => import("./pages/Actor"));
const Toons = lazy(() => import("./pages/Toons"));
const Profile = lazy(() => import("./pages/Profile"));
const Downloads = lazy(() => import("./pages/Downloads"));
const OfflinePlayer = lazy(() => import("./pages/OfflinePlayer"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Live = lazy(() => import("./pages/Live"));

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
  const location = useLocation();
  
  // Routes where BottomNav should be visible
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/profile", "/downloads", "/ranking", "/live"];
  const shouldShowNav = showNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand/30 selection:text-white font-sans antialiased pb-20">
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
                <Route path="/downloads" element={<PageWrapper><Downloads /></PageWrapper>} />
                <Route path="/ranking" element={<PageWrapper><Ranking /></PageWrapper>} />
                <Route path="/live" element={<PageWrapper><Live /></PageWrapper>} />
                <Route path="/offline-play/:id" element={<PageWrapper><OfflinePlayer /></PageWrapper>} />
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
