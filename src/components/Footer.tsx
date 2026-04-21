import { Link } from "react-router-dom";
import { Play, Github, Twitter, Instagram } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Footer() {
  const { siteConfig } = useAuth();
  return (
    <footer className="bg-black border-t border-white/5 pt-16 pb-8 mt-20">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              {siteConfig?.logoUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white/5 shadow-[0_0_15px_var(--color-brand)]">
                  <img src={siteConfig.logoUrl} alt={siteConfig.siteName || "Logo"} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                  <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                </div>
              )}
              <span className="text-2xl font-bold tracking-tight text-white uppercase" style={{ color: siteConfig?.brandColor || 'var(--color-brand)' }}>
                {siteConfig?.siteName || 'Λ𝗫𝗜𝗦 𝗦TREAM'}
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              {siteConfig?.tagline || 'Experience the ultimate premium streaming platform. Watch the latest movies, series, and exclusive content in high quality with our seamless cinematic interface.'}
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold tracking-wider uppercase text-sm mb-4">Explore</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Home</Link></li>
              <li><Link to="/browse" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Browse</Link></li>
              <li><Link to="/ranking" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Rankings</Link></li>
              <li><Link to="/live" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Live Sports</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold tracking-wider uppercase text-sm mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand transition-colors text-sm font-medium">DMCA</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} {siteConfig?.siteName || 'Λ𝗫𝗜𝗦 𝗦TREAM'}. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs max-w-xl text-center md:text-right">
            This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
        </div>
      </div>
    </footer>
  );
}
