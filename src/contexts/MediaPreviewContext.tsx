import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MediaPreviewContextType {
  previewId: string | null;
  triggerSource: string | null;
  openPreview: (id: string, source?: string) => void;
  closePreview: () => void;
}

const MediaPreviewContext = createContext<MediaPreviewContextType | undefined>(undefined);

export function MediaPreviewProvider({ children }: { children: ReactNode }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [triggerSource, setTriggerSource] = useState<string | null>(null);

  const openPreview = (id: string, source?: string) => {
    setPreviewId(id);
    setTriggerSource(source || null);
  };
  const closePreview = () => {
    setPreviewId(null);
    setTriggerSource(null);
  };

  return (
    <MediaPreviewContext.Provider value={{ previewId, triggerSource, openPreview, closePreview }}>
      {children}
    </MediaPreviewContext.Provider>
  );
}

export function useMediaPreview() {
  const context = useContext(MediaPreviewContext);
  if (context === undefined) {
    throw new Error('useMediaPreview must be used within a MediaPreviewProvider');
  }
  return context;
}
