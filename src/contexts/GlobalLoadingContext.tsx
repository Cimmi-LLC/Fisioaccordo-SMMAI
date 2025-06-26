
import React, { createContext, useContext, ReactNode } from 'react';
import { useLoadingState } from '@/hooks/useLoadingState';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  message: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  startLoading: (message?: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  finishLoading: (success?: boolean, message?: string) => void;
  resetLoading: () => void;
}

const GlobalLoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const loadingState = useLoadingState();

  return (
    <GlobalLoadingContext.Provider value={loadingState}>
      {children}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = (): LoadingContextType => {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};
