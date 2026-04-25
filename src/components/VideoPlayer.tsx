import { useEffect, useRef, useState, useCallback } from "react";
import type Hls from "hls.js";
import { MediaData, ItemDetails } from "../types";
import PopcornLoader from "./PopcornLoader";
import {
  Download,
  Settings,
  Check,
  ChevronDown,
  MonitorPlay,
  Gauge,
  Play,
  Pause,
  Volume2,
  X,
  ArrowLeft,
  Sun,
  Lock,
  FastForward,
  Keyboard,
  Clock,
  Type,
  RotateCcw,
  RotateCw,
  SkipForward,
  Maximize2,
  HelpCircle,
  Share2,
  Film,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { movieService } from "../services/movieService";
import { parseSRT, SubtitleItem } from "../lib/subtitleParser";

// Dynamically import Hls to reduce bundle size
const loadHls = () => import("hls.js").then((m) => m.default);

interface VideoPlayerProps {
  mediaData: MediaData;
  poster?: string;
  title: string;
  description: string;
  id: string;
  onClose?: () => void;
  isTrailer?: boolean;
  seasons?: ItemDetails["seasons"];
  selectedSeason?: number;
  selectedEpisode?: number;
  onEpisodeChange?: (s: number, e: number) => void;
  onAudioTrackChange?: (subjectId: string) => void;
  isOffline?: boolean;
  isMiniPlayer?: boolean;
  onCloseMiniPlayer?: () => void;
  initialTime?: number;
}

export default function VideoPlayer({
  mediaData,
  poster,
  title,
  description,
  id,
  onClose,
  isTrailer,
  seasons,
  selectedSeason,
  selectedEpisode,
  onEpisodeChange,
  onAudioTrackChange,
  isOffline,
  isMiniPlayer,
  onCloseMiniPlayer,
  initialTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const {
    preferences,
    addWatchTime,
    trackWatchTime,
    user,
    updateContinueWatching,
    updatePreferences,
  } = useAuth();
  const { showToast } = useToast();

  // Reference for tracking elapsed time for global analytics
  const lastTrackedTimeRef = useRef<number>(0);

  // Track if we need to fall back to an iframe instead of direct video play
  const useIframeFallback =
    isTrailer || (mediaData.sources.length === 0 && !!mediaData.embedUrl);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Quality
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState<number>(-1);

  // Audio & Subtitles
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);

  // Custom Subtitles (SRT)
  const [customSubtitles, setCustomSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleItem | null>(
    null,
  );
  const [subtitleSettings, setSubtitleSettings] = useState(
    preferences.subtitleSettings,
  );

  // Keep internal state in sync with context preferences
  useEffect(() => {
    setSubtitleSettings(preferences.subtitleSettings);
  }, [preferences.subtitleSettings]);

  const updateSubtitleSetting = (updates: Partial<typeof subtitleSettings>) => {
    const newSettings = { ...subtitleSettings, ...updates };
    setSubtitleSettings(newSettings);
    updatePreferences({ subtitleSettings: newSettings });
  };

  // Gestures & UI State
  const [activeMenu, setActiveMenu] = useState<
    | "settings"
    | "quality"
    | "subtitles"
    | "audio"
    | "speed"
    | "caption-settings"
    | "report"
    | null
  >(null);
  const [brightness, setBrightness] = useState(1);
  const [zoom, setZoom] = useState<"contain" | "cover" | "fill">("contain");
  const [playbackSpeed, setPlaybackSpeed] = useState(
    preferences?.playbackSpeed || 1,
  );
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: string;
    value: string | number;
    side?: "left" | "right";
  } | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Sorted tracks for consistent display (English + 4 random)
  const [sortedAudioTracks, setSortedAudioTracks] = useState<any[]>([]);
  const [sortedSubtitles, setSortedSubtitles] = useState<any[]>([]);

  useEffect(() => {
    const rawAudio =
      mediaData.audioTracks && mediaData.audioTracks.length > 0
        ? mediaData.audioTracks
        : audioTracks;
    if (rawAudio.length === 0) return;

    const languageMap: Record<string, string> = {
      en: "English",
      ar: "Arabic",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      hi: "Hindi",
      id: "Indonesian",
      tr: "Turkish",
      nl: "Dutch",
      pl: "Polish",
      vi: "Vietnamese",
      th: "Thai",
      ms: "Malay",
      tl: "Tagalog",
    };

    const processedAudio = [...rawAudio]
      .map((track, idx) => ({
        ...track,
        originalIdx: idx,
        displayName:
          track.language ||
          track.name ||
          languageMap[track.languageCode] ||
          "Unknown",
      }))
      .sort((a, b) => {
        if (isLanguageEnglish(a)) return -1;
        if (isLanguageEnglish(b)) return 1;
        return 0;
      });

    const enAudio = processedAudio.find(isLanguageEnglish);
    const others = processedAudio.filter((a) => a !== enAudio);
    const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 4);
    const finalAudio = enAudio
      ? [enAudio, ...randomOthers]
      : randomOthers.slice(0, 5);

    setSortedAudioTracks(finalAudio);
  }, [audioTracks, mediaData.audioTracks]);

  // Auto-select English audio if available on mount/track load
  useEffect(() => {
    if (currentAudioTrack === 0 && sortedAudioTracks.length > 0) {
      const enIdx = sortedAudioTracks.findIndex(isLanguageEnglish);
      if (enIdx >= 0 && sortedAudioTracks[enIdx].originalIdx !== undefined) {
        const track = sortedAudioTracks[enIdx];
        handleAudioTrackChangeInternal({ ...track, idx: track.originalIdx });
      }
    }
  }, [sortedAudioTracks]);

  useEffect(() => {
    const rawSubs =
      subtitleTracks.length > 0 ? subtitleTracks : mediaData.subtitles || [];
    // Map languageCodes to full names
    const languageMap: Record<string, string> = {
      en: "English",
      ar: "Arabic",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      hi: "Hindi",
      id: "Indonesian",
      tr: "Turkish",
      nl: "Dutch",
      pl: "Polish",
      vi: "Vietnamese",
      th: "Thai",
      ms: "Malay",
      tl: "Tagalog",
    };

    const processedSubs = [...rawSubs]
      .map((sub, idx) => ({
        ...sub,
        originalIdx: idx,
        displayName:
          languageMap[sub.languageCode] ||
          sub.language ||
          sub.name ||
          sub.languageCode ||
          "Unknown",
      }))
      .sort((a, b) => {
        if (isLanguageEnglish(a)) return -1;
        if (isLanguageEnglish(b)) return 1;
        return 0;
      });

    // Limit to English + 4 random others (max 5)
    const enSub = processedSubs.find(isLanguageEnglish);
    const others = processedSubs.filter((s) => s !== enSub);
    const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 4);
    const finalSubs = enSub
      ? [enSub, ...randomOthers]
      : randomOthers.slice(0, 5);

    setSortedSubtitles(finalSubs);
  }, [subtitleTracks, mediaData.subtitles]);

  const [hasAutoSelectedSubs, setHasAutoSelectedSubs] = useState(false);

  // Auto-select English subtitles
  useEffect(() => {
    if (
      !hasAutoSelectedSubs &&
      currentSubtitleTrack === -1 &&
      sortedSubtitles.length > 0
    ) {
      const enIdx = sortedSubtitles.findIndex(isLanguageEnglish);
      if (enIdx >= 0) {
        setCurrentSubtitleTrack(enIdx);
      }
      setHasAutoSelectedSubs(true);
    }
  }, [sortedSubtitles, hasAutoSelectedSubs, currentSubtitleTrack]);

  // Ambient backlighting canvas loop
  useEffect(() => {
    let animationFrameId: number;
    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        }
      }
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    if (!useIframeFallback) {
      renderFrame();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [useIframeFallback, isPlaying]);

  useEffect(() => {
    if (
      currentSubtitleTrack >= 0 &&
      sortedSubtitles[currentSubtitleTrack]?.url
    ) {
      const url = sortedSubtitles[currentSubtitleTrack].url;
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;

      const fetchSubs = (retry = true) => {
        fetch(proxyUrl)
          .then((res) => res.text())
          .then((text) => {
            setCustomSubtitles(parseSRT(text));
          })
          .catch((err) => {
            if (retry) {
              console.warn("Retrying subtitles fetch...");
              fetch(url)
                .then((res) => res.text())
                .then((text) => setCustomSubtitles(parseSRT(text)))
                .catch((e) =>
                  console.error("Total failure loading subtitles:", e),
                );
            } else {
              console.error("Failed to load subtitles:", err);
            }
          });
      };

      fetchSubs();
    } else {
      setCustomSubtitles([]);
    }
  }, [currentSubtitleTrack, sortedSubtitles]);

  // Sync Subtitles
  useEffect(() => {
    if (customSubtitles.length > 0) {
      const sub = customSubtitles.find(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime,
      );
      setActiveSubtitle(sub || null);
    } else {
      setActiveSubtitle(null);
    }
  }, [currentTime, customSubtitles]);

  // Handle Controls Visibility
  const showControlsTemporarily = useCallback(() => {
    if (isLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeMenu) setShowControls(false);
    }, 3000);
  }, [isPlaying, isLocked, activeMenu]);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, activeMenu, showControlsTemporarily]);

  // Track watch time and update on unmount
  useEffect(() => {
    return () => {
      // Upon unmounting, if we've watched something, record it
      if (videoRef.current) {
        const timeWatched = videoRef.current.currentTime;
        if (timeWatched > 60) {
          // Add watch time in minutes
          addWatchTime(Math.floor(timeWatched / 60));
        }
      }
    };
  }, [addWatchTime]);

  // Video State Handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      if (!videoRef.current) return;
      const newTime = Math.max(0, videoRef.current.currentTime + seconds);
      seekTo(newTime);

      setGestureFeedback({
        type: seconds > 0 ? "forward" : "backward",
        value: Math.abs(seconds),
        side: seconds > 0 ? "right" : "left",
      });
      setTimeout(() => setGestureFeedback(null), 600);
    },
    [seekTo],
  );

  // Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Double Tap Detection
    const now = Date.now();
    const timesinceLastTap = now - lastTapRef.current;
    if (timesinceLastTap < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width / 3) {
        seek(-10);
      } else if (x > (rect.width * 2) / 3) {
        seek(10);
      }
      lastTapRef.current = 0; // Reset
      return;
    }
    lastTapRef.current = now;

    // Long Press Detection
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (videoRef.current) videoRef.current.playbackRate = 2;
      setGestureFeedback({ type: "speed", value: "2x" });
    }, 500);

    // Pinch Detection
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      initialPinchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked || !touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Cancel long press if moved significantly
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimeoutRef.current)
        clearTimeout(longPressTimeoutRef.current);
    }

    // Swipe Gestures (Volume & Brightness)
    if (e.touches.length === 1 && !isLongPressing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touchStartRef.current.x - rect.left;

      if (Math.abs(deltaY) > 20) {
        if (x < rect.width / 3) {
          // Left side: Brightness
          const newBrightness = Math.min(
            2,
            Math.max(0.1, brightness - deltaY / 200),
          );
          setBrightness(newBrightness);
          setGestureFeedback({
            type: "brightness",
            value: Math.round(newBrightness * 50),
          });
        } else if (x > (rect.width * 2) / 3) {
          // Right side: Volume
          const newVolume = Math.min(1, Math.max(0, volume - deltaY / 200));
          setVolume(newVolume);
          if (videoRef.current) videoRef.current.volume = newVolume;
          setGestureFeedback({
            type: "volume",
            value: Math.round(newVolume * 100),
          });
        }
        // Update start point to make it feel continuous
        touchStartRef.current.y = touch.clientY;
      }
    }

    // Pinch Zoom
    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = dist / initialPinchDistanceRef.current;
      if (ratio > 1.2) setZoom("fill");
      if (ratio < 0.8) setZoom("contain");
    }
  };

  const lastTouchTimeRef = useRef<number>(0);

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);

    lastTouchTimeRef.current = Date.now();

    if (isLongPressing) {
      setIsLongPressing(false);
      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
      setGestureFeedback(null);
    }
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
    setTimeout(() => setGestureFeedback(null), 500);
  };

  // Video Initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sources = mediaData.sources || [];
    if (sources.length === 0) {
      setError("No video sources available.");
      setLoading(false);
      return;
    }

    const source = sources[selectedSourceIdx];
    const isHls = source.type === "hls" || source.url.includes(".m3u8");

    // Save current time to restore after reload
    const currentTimeToRestore = video.currentTime || initialTime || 0;

    setLoading(true);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const init = async () => {
      try {
        if (isHls) {
          const HlsClass = await loadHls();
          if (HlsClass.isSupported()) {
            const hls = new HlsClass({
              enableWorker: true,
              capLevelToPlayerSize: true,
              startLevel: -1, // Auto
            });
            hlsRef.current = hls;
            hls.loadSource(source.url);
            hls.attachMedia(video);
            hls.on(HlsClass.Events.MANIFEST_PARSED, (_, data) => {
              setHlsLevels(data.levels);
              // Only set from HLS if we don't have them in mediaData
              if (
                (!mediaData.audioTracks ||
                  mediaData.audioTracks.length === 0) &&
                hls.audioTracks
              ) {
                setAudioTracks(
                  hls.audioTracks.map((t) => ({
                    language: t.name || t.lang,
                    subjectId: "",
                    languageCode: t.lang,
                  })),
                );
              }
              if (
                (!mediaData.subtitles || mediaData.subtitles.length === 0) &&
                hls.subtitleTracks
              ) {
                setSubtitleTracks(
                  hls.subtitleTracks.map((t) => ({
                    language: t.name || t.lang,
                    url: "",
                  })),
                );
              }
              setLoading(false);
              if (currentTimeToRestore > 0)
                video.currentTime = currentTimeToRestore;
              if (isPlaying) video.play().catch(() => {});
            });

            hls.on(HlsClass.Events.LEVEL_SWITCHED, (_, data) => {
              setHlsCurrentLevel(data.level);
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source.url;
          }
        } else {
          video.src = source.url;
          video.onloadedmetadata = () => {
            setLoading(false);
            if (currentTimeToRestore > 0)
              video.currentTime = currentTimeToRestore;
            if (isPlaying) video.play().catch(() => {});
          };
          video.onerror = () => {
            // Fallback to next quality if this fails
            if (selectedSourceIdx + 1 < sources.length) {
              setSelectedSourceIdx((prev) => prev + 1);
            } else {
              setError("Failed to load video source.");
            }
          };
        }
      } catch (err) {
        console.error("Video init error", err);
      }
    };

    init();

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [selectedSourceIdx, mediaData.sources, initialTime, id]);

  // Handle Audio Track Change (Reloading stream)
  const handleAudioTrackChangeInternal = (track: any) => {
    if (track.subjectId && onAudioTrackChange) {
      // If we have a subjectId, we notify the parent to reload the MediaData
      onAudioTrackChange(track.subjectId);
    } else if (hlsRef.current && track.idx !== undefined) {
      // Standard HLS track change
      hlsRef.current.audioTrack = track.idx;
      setCurrentAudioTrack(track.idx);
    }
    setActiveMenu(null);
  };

  // Sync Video State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const v = videoRef.current;
      if (!v) return;
      setCurrentTime(v.currentTime);

      // Global Analytics - track every 30 seconds of real watching
      const now = Date.now();
      const lastGlobalUpdate = (v as any)._lastGlobalUpdate || 0;
      if (now - lastGlobalUpdate > 30000) { // 30 seconds
        (v as any)._lastGlobalUpdate = now;
        const elapsed = (v as any)._lastTrackedTotal || 0;
        const currentTotal = v.currentTime;
        const delta = Math.floor(Math.abs(currentTotal - elapsed));
        // Only track if it's a reasonable forward progress (not a massive seek)
        if (delta > 0 && delta < 60) {
          trackWatchTime(delta);
        }
        (v as any)._lastTrackedTotal = currentTotal;
      }

      // Update continue watching every 5 seconds or on significant progress
      const lastUpdate = (v as any)._lastProgressUpdate || 0;

      if (now - lastUpdate > 5000 && video.duration > 0) {
        (video as any)._lastProgressUpdate = now;
        updateContinueWatching({
          id,
          title,
          poster: poster || "",
          description: description || "",
          type: seasons ? "Series" : "Movie",
          progress: video.currentTime,
          duration: video.duration,
          updatedAt: now,
          season: selectedSeason,
          episode: selectedEpisode,
        });
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, [
    id,
    title,
    poster,
    description,
    seasons,
    selectedSeason,
    selectedEpisode,
    updateContinueWatching,
  ]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (e.g., bug report input)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (!videoRef.current) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
          showControlsTemporarily();
          break;
        case "arrowright":
          e.preventDefault();
          videoRef.current.currentTime = Math.min(
            videoRef.current.currentTime + 10,
            duration,
          );
          showControlsTemporarily();
          break;
        case "arrowleft":
          e.preventDefault();
          videoRef.current.currentTime = Math.max(
            videoRef.current.currentTime - 10,
            0,
          );
          showControlsTemporarily();
          break;
        case "f":
          e.preventDefault();
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case "m":
          e.preventDefault();
          videoRef.current.muted = !videoRef.current.muted;
          showControlsTemporarily();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, showControlsTemporarily]);

  const isLanguageEnglish = (t: any) => {
    const label = (
      t.language ||
      t.displayName ||
      t.name ||
      t.languageCode ||
      ""
    ).toLowerCase();
    return label.includes("english") || t.languageCode === "en";
  };

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlayerTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLocked) return;

    // Safety check for interaction targets
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest(".no-click-toggle")
    ) {
      return;
    }

    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      showControlsTemporarily();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none touch-none group"
      style={{ filter: `brightness(${brightness})` }}
      onMouseMove={showControlsTemporarily}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handlePlayerTap}
    >
      {/* Video Element */}
      {useIframeFallback ? (
        <iframe
          src={mediaData.embedUrl}
          className="w-full h-full border-none absolute inset-0 z-10"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-60 scale-110 z-0 saturate-200 pointer-events-none mix-blend-screen"
            aria-hidden="true"
            width={64}
            height={36}
          />
          <video
            ref={videoRef}
            className={`w-full h-full transition-all duration-300 relative z-10 ${
              zoom === "cover"
                ? "object-cover"
                : zoom === "fill"
                  ? "object-fill"
                  : "object-contain"
            }`}
            playsInline
            autoPlay
            crossOrigin="anonymous"
          />
        </>
      )}

      {/* Skip Features (Intro / Next) */}
      <AnimatePresence>
        {!useIframeFallback &&
          showControls &&
          isPlaying &&
          currentTime > 15 &&
          currentTime < 120 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute bottom-28 left-6 md:left-10 z-50 pointer-events-auto"
            >
              <button
                onClick={() => seekTo(120)}
                className="flex items-center gap-2 bg-black/60 hover:bg-white text-white hover:text-black border border-white/20 backdrop-blur-md px-5 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              >
                Skip Intro <SkipForward className="w-4 h-4 ml-1" />
              </button>
            </motion.div>
          )}

        {!useIframeFallback &&
          duration > 0 &&
          currentTime > duration - 60 &&
          seasons &&
          onEpisodeChange && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute bottom-28 right-6 md:right-10 z-50 pointer-events-auto"
            >
              <button
                onClick={() => {
                  onEpisodeChange(
                    selectedSeason || 1,
                    (selectedEpisode || 1) + 1,
                  );
                }}
                className="flex items-center gap-2 bg-brand hover:bg-white text-white hover:text-black hover:border-white border border-brand backdrop-blur-md px-6 py-3 rounded-full font-black uppercase tracking-wider text-sm transition-all shadow-[0_0_30px_rgba(229,9,20,0.6)]"
              >
                Play Next <FastForward className="w-5 h-5 ml-1" />
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Loading Spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"
          >
            <PopcornLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Feedback */}
      <AnimatePresence>
        {gestureFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none ${
              gestureFeedback.side === "left"
                ? "left-1/4"
                : gestureFeedback.side === "right"
                  ? "right-1/4"
                  : "left-1/2 -translate-x-1/2"
            }`}
          >
            <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-6 py-4 border border-white/10">
              {gestureFeedback.type === "forward" && (
                <RotateCw className="w-8 h-8 text-white" />
              )}
              {gestureFeedback.type === "backward" && (
                <RotateCcw className="w-8 h-8 text-white" />
              )}
              {gestureFeedback.type === "volume" && (
                <Volume2 className="w-8 h-8 text-white" />
              )}
              {gestureFeedback.type === "brightness" && (
                <Sun className="w-8 h-8 text-white" />
              )}
              {gestureFeedback.type === "speed" && (
                <Gauge className="w-8 h-8 text-white" />
              )}
              <span className="text-white font-black text-xl">
                {gestureFeedback.type === "forward"
                  ? `+${gestureFeedback.value}s`
                  : gestureFeedback.type === "backward"
                    ? `-${gestureFeedback.value}s`
                    : gestureFeedback.value}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitles Overlay - Premium Cinematic Style */}
      <AnimatePresence mode="wait">
        {activeSubtitle && (
          <motion.div
            key={activeSubtitle.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              bottom: showControls
                ? isMiniPlayer
                  ? "18%"
                  : "95px"
                : isMiniPlayer
                  ? "8%"
                  : "35px",
            }}
            exit={{ opacity: 0, y: -5 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              opacity: { duration: 0.15 },
            }}
            className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-30 px-6 md:px-12 transition-all duration-500 ease-out"
          >
            <div
              className="text-center drop-shadow-2xl"
              style={{
                fontSize: `clamp(11px, 2vw, ${subtitleSettings.fontSize}px)`,
                color: subtitleSettings.color,
                backgroundColor: subtitleSettings.backgroundColor,
                fontWeight: 600,
                maxWidth: "85%",
                lineHeight: 1.3,
                textShadow: "0 2px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)",
              }}
            >
              {activeSubtitle.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-40 flex flex-col justify-between pointer-events-none ${useIframeFallback ? "bg-transparent" : "bg-gradient-to-t from-black/80 via-transparent to-black/60"}`}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between p-fluid-sm pointer-events-auto">
              <div className="flex items-center flex-1 min-w-0 mr-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-white flex-shrink-0"
                >
                  <ArrowLeft className="w-6 h-6 md:w-7 md:h-7 drop-shadow-md" />
                </button>
                <div className="ml-2 overflow-hidden">
                  <h1 className="text-[10px] md:text-sm font-black text-white truncate drop-shadow-lg uppercase tracking-widest italic opacity-80">
                    {title}
                  </h1>
                </div>
              </div>

              {!useIframeFallback && (
                <div className="flex items-center gap-2 md:gap-4">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title,
                            text: `Check out ${title} on Axis TV!`,
                            url: window.location.href,
                          })
                          .catch(() => {});
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        showToast("Link copied!", "success");
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-all text-white"
                  >
                    <Share2 className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md" />
                  </button>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="flex flex-col items-center p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    <Keyboard className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md mb-0.5" />
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tighter">
                      Shortcuts
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Modal */}
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowHelp(false)}
                >
                  <div
                    className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full text-white shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setShowHelp(false)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
                      Keyboard Shortcuts
                    </h2>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Play / Pause
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          Space
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Fullscreen
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          F
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Mute / Unmute
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          M
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Skip <span className="text-brand">+10s</span>
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          →
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Back <span className="text-brand">-10s</span>
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          ←
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Volume Up
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          ↑
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <span className="font-bold text-gray-400">
                          Volume Down
                        </span>{" "}
                        <span className="bg-white/10 px-2 flex items-center h-6 rounded font-mono text-xs">
                          ↓
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Middle and Bottom Controls - HIDDEN FOR IFRAME */}
            {!useIframeFallback && (
              <>
                {/* Center Controls */}
                <div className="flex items-center justify-center gap-[clamp(1rem,8vw,6rem)] pointer-events-auto">
                  <button
                    onClick={() => seek(-10)}
                    className="group transition-all transform active:scale-95"
                  >
                    <div className="relative flex items-center justify-center w-[clamp(32px,9vw,52px)] h-[clamp(32px,9vw,52px)] rounded-full border border-white/20 bg-black/20 backdrop-blur-sm group-hover:bg-white/10">
                      <RotateCcw className="w-4 h-4 md:w-8 md:h-8 text-white stroke-[1.5]" />
                      <span className="absolute text-[6px] md:text-[10px] font-black text-white mt-0.5">
                        10
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-[clamp(56px,16vw,100px)] h-[clamp(56px,16vw,100px)] flex items-center justify-center bg-[#E50914] rounded-full text-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(229,9,20,0.4)] relative group"
                  >
                    {isPlaying ? (
                      <Pause
                        className="w-6 h-6 md:w-11 md:h-11 fill-white"
                        strokeWidth={0}
                      />
                    ) : (
                      <Play
                        className="w-6 h-6 md:w-11 md:h-11 fill-white ml-1 md:ml-1.5"
                        strokeWidth={0}
                      />
                    )}
                  </button>

                  <button
                    onClick={() => seek(10)}
                    className="group transition-all transform active:scale-95"
                  >
                    <div className="relative flex items-center justify-center w-[clamp(32px,9vw,52px)] h-[clamp(32px,9vw,52px)] rounded-full border border-white/20 bg-black/20 backdrop-blur-sm group-hover:bg-white/10">
                      <RotateCw className="w-4 h-4 md:w-8 md:h-8 text-white stroke-[1.5]" />
                      <span className="absolute text-[6px] md:text-[10px] font-black text-white mt-0.5">
                        10
                      </span>
                    </div>
                  </button>
                </div>

                {/* Bottom Controls */}
                <div className="pointer-events-auto px-fluid-sm py-fluid-sm mb-2 w-full">
                  <div className="flex flex-col gap-2 md:gap-4">
                    {/* Progress Slider */}
                    <div className="flex items-center gap-3 md:gap-4">
                      <button
                        onClick={togglePlay}
                        className="text-white hover:scale-110 transition-transform shrink-0"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 md:w-6 md:h-6 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 md:w-6 md:h-6 fill-white ml-0.5 md:ml-1" />
                        )}
                      </button>

                      <div className="group/progress relative flex-1 h-6 flex items-center cursor-pointer no-click-toggle">
                        <div className="w-full h-[2.5px] md:h-[4px] bg-white/20 rounded-full relative">
                          <div
                            className="absolute inset-y-0 left-0 bg-[#E50914] rounded-full"
                            style={{
                              width: `${(currentTime / (duration || 1)) * 100}%`,
                            }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full border border-[#E50914] scale-0 group-hover/progress:scale-100 transition-transform shadow-lg" />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          step={0.1}
                          value={currentTime}
                          onChange={(e) => {
                            const time = parseFloat(e.target.value);
                            if (videoRef.current)
                              videoRef.current.currentTime = time;
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 no-click-toggle"
                        />
                      </div>

                      <div className="text-white font-mono text-[9px] md:text-sm tracking-wider min-w-[60px] md:min-w-[70px] text-right shrink-0">
                        {formatTime(currentTime)}{" "}
                        <span className="text-white/20 px-0.5">/</span>{" "}
                        {formatTime(duration)}
                      </div>

                      <div className="flex items-center gap-2 md:gap-3 ml-1 md:ml-2">
                        <span className="hidden sm:inline text-white/40 text-[9px] md:text-xs font-black uppercase tracking-tighter">
                          1X
                        </span>
                        <button
                          onClick={() => setActiveMenu("settings")}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <Settings className="w-4.5 h-4.5 md:w-6 md:h-6" />
                        </button>
                        <button
                          onClick={() => setActiveMenu("audio")}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <MonitorPlay className="w-4.5 h-4.5 md:w-6 md:h-6" />
                        </button>
                        <button
                          onClick={() => {
                            if (containerRef.current?.requestFullscreen) {
                              containerRef.current.requestFullscreen();
                            }
                          }}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <Maximize2 className="w-4.5 h-4.5 md:w-6 md:h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock Button (Always visible when locked) */}
      <AnimatePresence>
        {isLocked && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLocked(false)}
            className="absolute top-4 right-4 z-50 p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 text-white"
          >
            <Lock className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Settings Modals - Compact Popover matched to screenshot style */}
      <AnimatePresence>
        {activeMenu && (
          <div
            className="absolute inset-0 z-50"
            onClick={() => setActiveMenu(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:right-8 w-full max-w-[260px] bg-zinc-900/98 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden pointer-events-auto text-white ring-1 ring-white/10"
            >
              {activeMenu !== "settings" && (
                <div
                  className="flex items-center p-3 border-b border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => setActiveMenu("settings")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="font-bold text-[10px] uppercase tracking-widest text-[#00A8E1]">
                    {activeMenu}
                  </span>
                </div>
              )}

              <div className="max-h-[40vh] md:max-h-[350px] overflow-y-auto no-scrollbar py-2">
                {activeMenu === "settings" && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => setActiveMenu("audio")}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Audio
                      </span>
                      <div className="flex items-center gap-1 text-[13px] opacity-70">
                        <span>
                          {mediaData.audioTracks?.[currentAudioTrack]
                            ?.language || "Default"}
                        </span>
                        <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveMenu("subtitles")}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Captions
                      </span>
                      <div className="flex items-center gap-1 text-[13px] opacity-70">
                        <span>
                          {currentSubtitleTrack === -1
                            ? "Off"
                            : sortedSubtitles[currentSubtitleTrack]
                                ?.displayName || "Default"}
                        </span>
                        <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveMenu("caption-settings")}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Caption Style
                      </span>
                      <div className="flex items-center gap-1 text-[13px] opacity-70">
                        <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveMenu("quality")}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Quality
                      </span>
                      <div className="flex items-center gap-1 text-[13px] opacity-70">
                        <span>
                          {hlsRef.current && hlsRef.current.currentLevel === -1
                            ? "Auto"
                            : hlsRef.current
                              ? `${hlsLevels[hlsCurrentLevel]?.height}p`
                              : selectedSourceIdx >= 0 &&
                                  mediaData.sources[selectedSourceIdx]
                                ? `${mediaData.sources[selectedSourceIdx]?.quality}p`
                                : "Auto"}
                        </span>
                        <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveMenu("speed")}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Speed
                      </span>
                      <div className="flex items-center gap-1 text-[13px] opacity-70">
                        <span>
                          {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                        </span>
                        <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const source = mediaData.sources[selectedSourceIdx];
                        const url = source.downloadUrl || source.url;
                        const fileName = `[${title}] [Axis TV].mp4`.replace(
                          /[^a-zA-Z0-9 -\[\]]/g,
                          "",
                        );
                        const finalUrl = url.includes("download=1")
                          ? url
                          : url.includes("?")
                            ? `${url}&download=1`
                            : `${url}?download=1`;

                        setActiveMenu(null);

                        // Trigger native downloader via hidden iframe to keep it in same tab and hide URL from address bar
                        const iframe = document.createElement("iframe");
                        iframe.style.display = "none";
                        iframe.src = finalUrl;
                        document.body.appendChild(iframe);

                        // Backup triggering
                        const a = document.createElement("a");
                        a.href = finalUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        setTimeout(() => {
                          if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                          }
                        }, 60000);
                      }}
                      className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[14px] font-medium opacity-80">
                        Download
                      </span>
                      <div className="flex items-center gap-1 text-brand">
                        <Download className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  </div>
                )}

                {activeMenu === "caption-settings" && (
                  <div className="flex flex-col text-[13px]">
                    <button
                      onClick={() => setActiveMenu("settings")}
                      className="flex items-center gap-2 px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors font-bold uppercase tracking-widest text-[10px] text-white/50"
                    >
                      <ChevronDown className="w-3 h-3 rotate-90" />
                      Back to Settings
                    </button>
                    <div className="px-5 py-3 font-bold uppercase tracking-[0.2em] text-white/40 border-b border-white/5">
                      Style Options
                    </div>

                    <div className="p-4 space-y-5">
                      <section className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-white/30 tracking-widest pl-1">
                          Size
                        </label>
                        <div className="flex gap-2">
                          {[14, 18, 22, 28].map((size) => (
                            <button
                              key={size}
                              onClick={() =>
                                updateSubtitleSetting({ fontSize: size })
                              }
                              className={`flex-1 py-2 rounded-lg transition-all border ${subtitleSettings.fontSize === size ? "bg-brand border-brand text-white shadow-lg" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"}`}
                            >
                              {size === 14
                                ? "S"
                                : size === 18
                                  ? "M"
                                  : size === 22
                                    ? "L"
                                    : "XL"}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-white/30 tracking-widest pl-1">
                          Color
                        </label>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                          {["#ffffff", "#ffff00", "#00ffff", "#ff00ff"].map(
                            (color) => (
                              <button
                                key={color}
                                onClick={() => updateSubtitleSetting({ color })}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${subtitleSettings.color === color ? "scale-110 border-white ring-2 ring-white/20" : "border-transparent opacity-50 hover:opacity-100"}`}
                                style={{ backgroundColor: color }}
                              />
                            ),
                          )}
                        </div>
                      </section>

                      <section className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-white/30 tracking-widest pl-1">
                          Background Opacity
                        </label>
                        <div className="flex gap-2">
                          {[0, 0.4, 0.6, 0.85].map((op) => {
                            const bg = `rgba(0,0,0,${op})`;
                            const isSelected =
                              subtitleSettings.backgroundColor === bg;
                            return (
                              <button
                                key={op}
                                onClick={() =>
                                  updateSubtitleSetting({ backgroundColor: bg })
                                }
                                className={`flex-1 py-2 rounded-lg transition-all border ${isSelected ? "bg-brand border-brand text-white" : "bg-white/5 border-white/5 text-white/60"}`}
                              >
                                {op === 0 ? "Pure" : `${Math.round(op * 100)}%`}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {activeMenu === "audio" && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => setActiveMenu("settings")}
                      className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>
                    {sortedAudioTracks.map((track: any, idx) => {
                      const isSelected =
                        track.originalIdx !== undefined
                          ? currentAudioTrack === track.originalIdx
                          : currentAudioTrack === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() =>
                            handleAudioTrackChangeInternal(
                              track.originalIdx !== undefined
                                ? { ...track, idx: track.originalIdx }
                                : { ...track, idx },
                            )
                          }
                          className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${isSelected ? "font-bold text-[#00A8E1]" : ""}`}
                        >
                          <span>
                            {track.displayName ||
                              track.language ||
                              track.name ||
                              `Track ${idx + 1}`}
                          </span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeMenu === "subtitles" && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => setActiveMenu("settings")}
                      className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                        setCurrentSubtitleTrack(-1);
                        setActiveMenu("settings");
                      }}
                      className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${currentSubtitleTrack === -1 ? "font-bold text-[#00A8E1]" : ""}`}
                    >
                      <span>Off</span>
                      {currentSubtitleTrack === -1 && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    {(sortedSubtitles.length > 0
                      ? sortedSubtitles.slice(0, 10)
                      : subtitleTracks.slice(0, 10)
                    ).map((track: any, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (hlsRef.current)
                            hlsRef.current.subtitleTrack = idx;
                          setCurrentSubtitleTrack(idx);
                          setActiveMenu("settings");
                        }}
                        className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${currentSubtitleTrack === idx ? "font-bold text-[#00A8E1]" : ""}`}
                      >
                        <span>
                          {track.displayName ||
                            track.language ||
                            track.name ||
                            (idx === 0 ? "English (Auto)" : `Track ${idx + 1}`)}
                        </span>
                        {currentSubtitleTrack === idx && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeMenu === "speed" && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => setActiveMenu("settings")}
                      className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          if (videoRef.current)
                            videoRef.current.playbackRate = speed;
                          updatePreferences({ playbackSpeed: speed });
                          setActiveMenu("settings");
                        }}
                        className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${playbackSpeed === speed ? "font-bold text-[#00A8E1]" : ""}`}
                      >
                        <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                        {playbackSpeed === speed && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeMenu === "quality" && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => setActiveMenu("settings")}
                      className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Back
                    </button>
                    {hlsRef.current && (
                      <>
                        <button
                          onClick={() => {
                            if (hlsRef.current)
                              hlsRef.current.currentLevel = -1;
                            setHlsCurrentLevel(-1);
                            setActiveMenu("settings");
                          }}
                          className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${hlsCurrentLevel === -1 ? "font-bold text-[#00A8E1]" : ""}`}
                        >
                          <span>Auto (Adaptive)</span>
                          {hlsCurrentLevel === -1 && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        {hlsLevels.map((level, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (hlsRef.current)
                                hlsRef.current.currentLevel = idx;
                              setHlsCurrentLevel(idx);
                              setActiveMenu("settings");
                            }}
                            className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${hlsCurrentLevel === idx ? "font-bold text-[#00A8E1]" : ""}`}
                          >
                            <span>{level.height}p</span>
                            {hlsCurrentLevel === idx && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))}
                      </>
                    )}

                    {!hlsRef.current &&
                      mediaData.sources &&
                      mediaData.sources.map((source, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedSourceIdx(idx);
                            setActiveMenu("settings");
                          }}
                          className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${selectedSourceIdx === idx ? "font-bold text-[#00A8E1]" : ""}`}
                        >
                          <span>{source.quality}p</span>
                          {selectedSourceIdx === idx && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                  </div>
                )}

                {activeMenu === "report" && (
                  <div className="flex flex-col">
                    <div className="p-4 border-b border-black/5 dark:border-white/5">
                      <span className="text-[12px] font-black uppercase tracking-widest text-[#333] dark:text-white/40">
                        Report Issue
                      </span>
                    </div>
                    <div className="py-2">
                      {[
                        {
                          id: "video",
                          label: "Video Issue (Lag/quality)",
                          icon: Film,
                        },
                        {
                          id: "audio",
                          label: "Audio Issue (Sync/missing)",
                          icon: MonitorPlay,
                        },
                        { id: "subtitle", label: "Subtitle Issue", icon: Type },
                        { id: "loading", label: "Slow Loading", icon: Clock },
                        { id: "other", label: "Other Fix", icon: HelpCircle },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={async () => {
                            const ok = await movieService.reportIssue(
                              user?.id || "guest",
                              cat.id,
                              `Issue on ${title} (${id})`,
                            );
                            if (ok) {
                              showToast("Report submitted. Thanks!", "success");
                            } else {
                              showToast("Failed to send report", "error");
                            }
                            setActiveMenu(null);
                          }}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <cat.icon className="w-4 h-4 opacity-70" />
                          <span className="text-[14px] font-medium">
                            {cat.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
