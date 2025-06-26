
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CachedContent {
  id: string;
  content: string;
  carouselSlides: any[];
  timestamp: number;
  formData: any;
}

interface ContentCacheContextType {
  cachedContents: CachedContent[];
  cacheContent: (id: string, content: string, slides: any[], formData: any) => void;
  getCachedContent: (id: string) => CachedContent | null;
  clearCache: () => void;
  removeCachedContent: (id: string) => void;
}

const ContentCacheContext = createContext<ContentCacheContextType | undefined>(undefined);

interface ContentCacheProviderProps {
  children: ReactNode;
}

const CACHE_KEY = 'fisioacordo_content_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore

export const ContentCacheProvider: React.FC<ContentCacheProviderProps> = ({ children }) => {
  const [cachedContents, setCachedContents] = useState<CachedContent[]>([]);

  useEffect(() => {
    // Carica cache da localStorage
    const savedCache = localStorage.getItem(CACHE_KEY);
    if (savedCache) {
      try {
        const parsed = JSON.parse(savedCache);
        // Filtra contenuti scaduti
        const validContents = parsed.filter(
          (item: CachedContent) => Date.now() - item.timestamp < CACHE_EXPIRY
        );
        setCachedContents(validContents);
      } catch (error) {
        console.error('Errore nel caricamento cache:', error);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    // Salva cache in localStorage
    if (cachedContents.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachedContents));
    }
  }, [cachedContents]);

  const cacheContent = (id: string, content: string, slides: any[], formData: any) => {
    const newCachedContent: CachedContent = {
      id,
      content,
      carouselSlides: slides,
      timestamp: Date.now(),
      formData
    };

    setCachedContents(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return [newCachedContent, ...filtered].slice(0, 10); // Max 10 elementi
    });
  };

  const getCachedContent = (id: string): CachedContent | null => {
    const found = cachedContents.find(item => item.id === id);
    return found && (Date.now() - found.timestamp < CACHE_EXPIRY) ? found : null;
  };

  const clearCache = () => {
    setCachedContents([]);
    localStorage.removeItem(CACHE_KEY);
  };

  const removeCachedContent = (id: string) => {
    setCachedContents(prev => prev.filter(item => item.id !== id));
  };

  const value: ContentCacheContextType = {
    cachedContents,
    cacheContent,
    getCachedContent,
    clearCache,
    removeCachedContent
  };

  return (
    <ContentCacheContext.Provider value={value}>
      {children}
    </ContentCacheContext.Provider>
  );
};

export const useContentCache = (): ContentCacheContextType => {
  const context = useContext(ContentCacheContext);
  if (context === undefined) {
    throw new Error('useContentCache must be used within a ContentCacheProvider');
  }
  return context;
};
