import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVisitor } from '../services/firebaseService';

export const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    // track in firebase for admin panel
    trackVisitor();
    
    // Replace G-XXXXXXXXXX with your actual Google Analytics ID
    const GA_ID = 'G-XXXXXXXXXX'; 
    
    // Only proceed if a real GA ID is provided
    if (GA_ID === 'G-XXXXXXXXXX') {
      console.log('Analytics is in placeholder mode. Update the GA_ID in src/components/Analytics.tsx to enable.');
      return;
    }
    
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID);
    }

    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
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
