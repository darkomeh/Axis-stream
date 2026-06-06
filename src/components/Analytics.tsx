import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVisitorWithGeo, trackSessionDuration, logPlatformError } from '../services/firebaseService';

export const Analytics = () => {
  const location = useLocation();
  const sessionStarted = useRef(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Initial Visitor Tracking with Geolocation (Once per session)
    if (!sessionStarted.current) {
      trackVisitorWithGeo();
      sessionStarted.current = true;
    }

    // 2. Session Heartbeat (Every 60 seconds)
    if (!heartbeatInterval.current) {
      heartbeatInterval.current = setInterval(() => {
        trackSessionDuration(60);
      }, 60000);
    }

    // 3. Global Error Surveillance
    const handleError = (event: ErrorEvent) => {
      if (event.message === 'Script error.' || event.message?.toLowerCase().includes('script error')) {
        return; // Ignore harmless third-party cross-origin iframe errors
      }
      logPlatformError(
        event.message,
        event.error?.stack,
        'Global Window'
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      logPlatformError(
        `Unhandled Rejection: ${String(event.reason)}`,
        event.reason?.stack,
        'Promise Rejection'
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Track page views in standard GA if configured
    const GA_ID = 'G-XXXXXXXXXX'; 
    if (GA_ID !== 'G-XXXXXXXXXX' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [location]);

  return null;
};

// Add global type for window.gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
