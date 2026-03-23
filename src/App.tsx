/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import BottomNav from "./components/BottomNav";
import PopcornLoader from "./components/PopcornLoader";

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

function AppContent() {
  const location = useLocation();
  
  // Routes where BottomNav should be visible
  const showNavRoutes = ["/", "/search", "/browse", "/anime", "/toons", "/profile", "/downloads", "/ranking", "/live"];
  const shouldShowNav = showNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/30 selection:text-white font-sans antialiased pb-20">
      <main>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#050505]">
            <PopcornLoader />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/details/:id" element={<Details />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/anime" element={<Anime />} />
            <Route path="/actor/:id" element={<ActorPage />} />
            <Route path="/toons" element={<Toons />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/live" element={<Live />} />
            <Route path="/offline-play/:id" element={<OfflinePlayer />} />
            {/* Fallback routes for movies/series/trending to browse for now */}
            <Route path="/movies" element={<Browse />} />
            <Route path="/series" element={<Browse />} />
            <Route path="/trending" element={<Anime />} />
          </Routes>
        </Suspense>
      </main>
      {shouldShowNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
