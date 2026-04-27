import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Info, Radio, Shield } from 'lucide-react';

interface HlsPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export default function HlsPlayer({ src, ...props }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProxied, setIsProxied] = useState(false);
  const [useFrame, setUseFrame] = useState(false);

  useEffect(() => {
    if (useFrame) return; // Don't setup HLS if in frame mode

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let recoveryAttempts = 0;
    let hasTriedProxy = false;

    setError(null);
    setIsProxied(false);

    const loadStream = (url: string, useProxy: boolean = false) => {
      if (hls) {
        hls.destroy();
      }
      
      const targetUrl = useProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
      setIsProxied(useProxy);

      if (Hls.isSupported()) {
        hls = new Hls({
          maxLoadingDelay: 4,
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 15000,
          levelLoadingMaxRetry: 2,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        
        hls.loadSource(targetUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setError(null);
          if (props.autoPlay) {
            video.play().catch(() => {});
          }
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (!hasTriedProxy && (data.response?.code === 403 || data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR)) {
                  console.log("Direct stream failed, attempting via secure proxy...");
                  hasTriedProxy = true;
                  loadStream(url, true);
                } else if (recoveryAttempts < 2) {
                  recoveryAttempts++;
                  hls?.startLoad();
                } else {
                  setError(hasTriedProxy ? "ACCESS_DENIED" : "Stream connection failed.");
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                if (recoveryAttempts < 2) {
                  recoveryAttempts++;
                  hls?.recoverMediaError();
                } else {
                  setError("Stream media format is not supported.");
                }
                break;
              default:
                setError("An error occurred while playing the broadcast.");
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = targetUrl;
        video.addEventListener('loadedmetadata', () => {
          setError(null);
          if (props.autoPlay) {
            video.play().catch(() => {});
          }
        });
        video.addEventListener('error', () => {
          if (!hasTriedProxy) {
             hasTriedProxy = true;
             loadStream(url, true);
          } else {
             setError("ACCESS_DENIED");
          }
        });
      } else {
        setError("HLS is not supported in this browser.");
      }
    };

    loadStream(src);

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, props.autoPlay, useFrame]);

  if (useFrame) {
    const playerUrl = `/api/sport/player?url=${encodeURIComponent(src)}`;
    return (
      <div className="relative w-full h-full bg-black group">
        <iframe 
          src={playerUrl} 
          className="w-full h-full border-0" 
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          title="Internal Hub Player"
        />
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/50">
          <Shield className="w-3 h-3" /> HUB Player Active
        </div>
        <button 
           onClick={() => setUseFrame(false)}
           className="absolute bottom-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-colors"
        >
          Exit Hub Mode
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-white/10 p-6 text-center rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-brand/5 animate-pulse" />
        <div className="bg-brand/20 p-4 rounded-full mb-4 relative z-10">
          <AlertCircle className="w-12 h-12 text-brand" />
        </div>
        <h3 className="text-xl font-black text-white mb-2 relative z-10 uppercase tracking-widest">
           {error === 'ACCESS_DENIED' ? 'Broadcast Restricted' : 'Playback Error'}
        </h3>
        <p className="text-gray-400 text-sm max-w-md relative z-10 leading-relaxed font-medium">
          {error === 'ACCESS_DENIED' 
            ? "This broadcast is protected by the provider. The owner suggests using the 'Frame Player' or watching directly on the source."
            : error}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 relative z-10">
          <button 
            onClick={() => setUseFrame(true)}
            className="px-6 py-2 bg-brand text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-transform"
          >
            Alternative Player (Frame)
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-white/5 transition-all"
          >
            Retry
          </button>
          <a 
            href={src} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-2 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-white/20 transition-all"
          >
            Watch at Source
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black group">
      <video ref={videoRef} className="w-full h-full object-contain" {...props} />
      {isProxied && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-brand/90 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <Shield className="w-3 h-3" />
          Secure Proxy Active
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="bg-red-600 text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest animate-pulse">
          LIVE
        </div>
      </div>
    </div>
  );
}

