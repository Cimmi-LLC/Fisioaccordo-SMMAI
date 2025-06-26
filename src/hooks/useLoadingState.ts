
import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  status: 'idle' | 'loading' | 'success' | 'error';
}

interface UseLoadingStateReturn extends LoadingState {
  startLoading: (message?: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  finishLoading: (success?: boolean, message?: string) => void;
  resetLoading: () => void;
}

export const useLoadingState = (initialMessage = ''): UseLoadingStateReturn => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: initialMessage,
    status: 'idle'
  });

  const startLoading = useCallback((message = 'Caricamento in corso...') => {
    setState({
      isLoading: true,
      progress: 0,
      message,
      status: 'loading'
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message || prev.message
    }));
  }, []);

  const finishLoading = useCallback((success = true, message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: 100,
      message: message || (success ? 'Completato!' : 'Errore durante il caricamento'),
      status: success ? 'success' : 'error'
    }));

    // Reset dopo 2 secondi
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        status: 'idle',
        progress: 0,
        message: ''
      }));
    }, 2000);
  }, []);

  const resetLoading = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      message: '',
      status: 'idle'
    });
  }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    finishLoading,
    resetLoading
  };
};
