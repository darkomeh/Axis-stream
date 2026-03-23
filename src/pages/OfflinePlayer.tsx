import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';

export default function OfflinePlayer() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { url, title, poster } = location.state || {};

  useEffect(() => {
    if (!url) {
      navigate('/downloads');
      return;
    }

    return () => {
      URL.revokeObjectURL(url); // Clean up blob URL
    };
  }, [url, navigate]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/downloads');
    }
  };

  if (!url) return null;

  const mediaData = {
    sources: [{ url: url, quality: "Auto", isM3U8: false }],
    subtitles: []
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <VideoPlayer 
        mediaData={mediaData}
        poster={poster}
        title={title || 'Offline Video'}
        description="Offline Playback"
        id={id || 'offline'}
        onClose={handleBack}
        isOffline={true}
      />
    </div>
  );
}
