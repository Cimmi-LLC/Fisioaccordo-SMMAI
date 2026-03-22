
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { contentService } from "@/services/contentService";
import { Loader2 } from "lucide-react";
import LazyImageEditor from "@/components/LazyImageEditor";

import AppHeader from "@/components/AppHeader";
import MainContent from "@/components/MainContent";
import SavedContents from "@/components/SavedContents";
import ErrorBoundary from "@/components/ErrorBoundary";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const globalLoading = useGlobalLoading();

  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [loadingSavedContents, setLoadingSavedContents] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showCopyImprover, setShowCopyImprover] = useState(false);
  const [improvedCopyFromAI, setImprovedCopyFromAI] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadSavedContents();
  }, [user]);

  const loadSavedContents = async () => {
    setLoadingSavedContents(true);
    try {
      const { data, error } = await contentService.getUserContents();
      if (data && !error) setSavedContents(data);
    } catch {
      toast({ title: "Avviso", description: "Errore nel caricamento dei contenuti salvati", variant: "destructive" });
    } finally {
      setLoadingSavedContents(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (!error) {
        navigate('/auth');
        toast({ title: "Arrivederci!", description: "Disconnessione effettuata con successo" });
      }
    } catch {
      toast({ title: "Errore", description: "Errore durante il logout", variant: "destructive" });
    }
  };

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
    toast({ title: "Immagine aggiornata!", description: "L'immagine è stata modificata con successo" });
  };

  const handleCopyImproved = (improvedCopy: string) => {
    setImprovedCopyFromAI(improvedCopy);
    toast({ title: "Copy ottimizzato!", description: "Il tuo copy è stato migliorato con strategie avanzate di copywriting" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: 'var(--viola)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--ink3)' }}>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (selectedImageForEdit && editingSlideIndex !== null) {
    return (
      <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <LazyImageEditor
          imageUrl={selectedImageForEdit}
          onImageUpdate={handleImageUpdate}
          onClose={() => { setSelectedImageForEdit(null); setEditingSlideIndex(null); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <ErrorBoundary>
        <AppHeader
          user={user}
          showCopyImprover={showCopyImprover}
          onToggleCopyImprover={() => setShowCopyImprover(!showCopyImprover)}
          onSignOut={handleSignOut}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <MainContent
          user={user}
          showCopyImprover={showCopyImprover}
          onCopyImproved={handleCopyImproved}
        />
      </ErrorBoundary>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <ErrorBoundary>
          <SavedContents savedContents={savedContents} isLoading={loadingSavedContents} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Index;
