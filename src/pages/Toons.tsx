import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { Search, ArrowLeft, Loader2 } from "lucide-react";

const BAD_KEYWORDS = ['family guy', 'south park', 'rick and morty', 'adult', 'hentai', 'bojack', 'archer', 'big mouth'];

const isToon = (item: MediaItem) => {
 const title = item.title.toLowerCase();
 const isBad = BAD_KEYWORDS.some(keyword => title.includes(keyword));
 return !isBad;
};

import { ErrorMessage } from "../components/ErrorMessage";
import { ListSkeleton } from "../components/Skeleton";

export default function Toons() {
 const navigate = useNavigate();
 const [query, setQuery] = useState("");
 const [items, setItems] = useState<MediaItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [loadingMore, setLoadingMore] = useState(false);
 const [page, setPage] = useState(1);
 const [hasMore, setHasMore] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const observer = useRef<IntersectionObserver | null>(null);
 const lastElementRef = useCallback((node: HTMLDivElement) => {
 if (loading || loadingMore || query.trim() !== "") return;
 if (observer.current) observer.current.disconnect();
 
 observer.current = new IntersectionObserver(entries => {
 if (entries[0].isIntersecting && hasMore) {
 setPage(prevPage => prevPage + 1);
 }
 });
 
 if (node) observer.current.observe(node);
 }, [loading, loadingMore, hasMore, query]);

 useEffect(() => {
 loadToons(1, true);
 }, []);

 useEffect(() => {
 if (page > 1 && query.trim() === "") {
 loadToons(page, false);
 }
 }, [page, query]);

 const handleBack = () => {
 if (window.history.length > 2) {
 navigate(-1);
 } else {
 navigate('/');
 }
 };

 const loadToons = async (p: number, reset: boolean = false) => {
 if (reset) {
 if (items.length === 0) setLoading(true);
 setError(null);
 } else {
 setLoadingMore(true);
 }
 try {
 // Fetch Animation from United States (typically Toons)
 const data = await movieService.browse('Animation', 'United States', p, 30, 0);
 const toons = data.filter(isToon);
 
 if (reset) {
 setItems(toons);
 } else {
 const unique = Array.from(new Map([...items, ...toons].map(item => [item.id, item])).values());
 setItems(unique);
 }
 setHasMore(data.length > 0);
 } catch (e) {
 console.error("Failed to load toons", e);
 if (reset) setError("Failed to load Toons. Please try again.");
 } finally {
 setLoading(false);
 setLoadingMore(false);
 }
 };

 const handleSearch = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!query.trim()) {
 setPage(1);
 loadToons(1, true);
 return;
 }
 setLoading(true);
 setError(null);
 try {
 // Just search directly, but filter out adult cartoons
 const data = await movieService.search(query);
 setItems(data.filter(isToon));
 setHasMore(false);
 } catch (e) {
 console.error("Failed to search toons", e);
 setError("Search failed. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-transparent text-white pb-20">
 <Navbar />
 <div className="pt-28 px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto">
 <button 
 onClick={handleBack}
 className="mb-8 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
 >
 <ArrowLeft className="w-6 h-6" />
 <span className="text-fluid-sm font-medium">Back</span>
 </button>
 <h1 className="text-fluid-3xl font-bold mb-6 sm:mb-8 tracking-tight">Toons</h1>
 <form onSubmit={handleSearch} className="mb-8 sm:mb-12">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
 <input
 type="text"
 value={query}
 onChange={(e) => {
 setQuery(e.target.value);
 if (e.target.value === "") {
 setPage(1);
 loadToons(1, true);
 }
 }}
 placeholder="Search cartoons..."
 className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl py-4 pl-14 pr-6 text-fluid-lg text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
 />
 </div>
 </form>

 {error ? (
 <ErrorMessage message={error} onRetry={() => loadToons(1, true)} />
 ) : loading && items.length === 0 ? (
 <ListSkeleton count={12} />
 ) : items.length > 0 ? (
 <div className="space-y-8">
 <PosterGrid items={items} variant="grid" />
 
 {hasMore && query.trim() === "" && (
 <div ref={lastElementRef} className="flex justify-center pt-8 h-20">
 {loadingMore && (
 <div className="flex items-center gap-3 text-brand">
 <Loader2 className="w-5 h-5 animate-spin" />
 <span className="text-fluid-sm font-medium">Loading more...</span>
 </div>
 )}
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-20 text-gray-500">No cartoons found.</div>
 )}
 </div>
 <Footer />
 </div>
 );
}
