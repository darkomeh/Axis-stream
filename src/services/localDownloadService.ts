export interface DownloadedVideo {
  id: string;
  title: string;
  poster: string;
  quality: string;
  blob: Blob;
  timestamp: number;
}

export interface ActiveDownload {
  id: string;
  title: string;
  progress: number;
  url: string;
}

const DB_NAME = 'AxisDownloadsDB';
const STORE_NAME = 'videos';

// Simple event emitter for progress updates
type ProgressListener = (downloads: ActiveDownload[]) => void;
let listeners: ProgressListener[] = [];
let activeDownloads: ActiveDownload[] = [];
const abortControllers = new Map<string, AbortController>();

const notifyListeners = () => {
  listeners.forEach(l => l([...activeDownloads]));
};

export const localDownloadService = {
  subscribe(listener: ProgressListener) {
    listeners.push(listener);
    listener([...activeDownloads]);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  getActiveDownloads() {
    return [...activeDownloads];
  },

  cancelDownload(id: string) {
    const controller = abortControllers.get(id);
    if (controller) {
      controller.abort();
      abortControllers.delete(id);
    }
    activeDownloads = activeDownloads.filter(d => d.id !== id);
    notifyListeners();
  },

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  async saveVideo(video: DownloadedVideo): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(video);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllVideos(): Promise<DownloadedVideo[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteVideo(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async downloadFromUrl(id: string, title: string, url: string, onProgress?: (progress: number) => void, retries = 3): Promise<Blob> {
    // Add to active downloads if not already there
    let download = activeDownloads.find(d => d.id === id);
    if (!download) {
      download = { id, title, progress: 0, url };
      activeDownloads.push(download);
    }
    
    const controller = new AbortController();
    abortControllers.set(id, controller);
    
    notifyListeners();

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!total) {
        const blob = await response.blob();
        activeDownloads = activeDownloads.filter(d => d.id !== id);
        abortControllers.delete(id);
        notifyListeners();
        return blob;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader');

      let received = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (value) {
          chunks.push(value);
          received += value.length;
          const progress = Math.round((received / total) * 100);
          
          // Update active download progress
          const d = activeDownloads.find(dl => dl.id === id);
          if (d) {
            d.progress = progress;
            notifyListeners();
          }

          if (onProgress) {
            onProgress(progress);
          }
        }
      }

      const finalBlob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
      activeDownloads = activeDownloads.filter(d => d.id !== id);
      abortControllers.delete(id);
      notifyListeners();
      return finalBlob;
    } catch (error: any) {
      const isAborted = error.name === 'AbortError' || 
                        (typeof error === 'string' && error.includes('aborted')) || 
                        (error.message && error.message.includes('aborted'));
      
      // If it's a network error and we have retries left, and it wasn't explicitly aborted by the user
      const isActive = activeDownloads.some(d => d.id === id);
      if (!isAborted && retries > 0 && isActive) {
        console.warn(`Download failed, retrying... (${retries} retries left)`, error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Check again after waiting
        if (activeDownloads.some(d => d.id === id)) {
          return this.downloadFromUrl(id, title, url, onProgress, retries - 1);
        }
      }

      activeDownloads = activeDownloads.filter(d => d.id !== id);
      abortControllers.delete(id);
      notifyListeners();
      throw error;
    }
  }
};
