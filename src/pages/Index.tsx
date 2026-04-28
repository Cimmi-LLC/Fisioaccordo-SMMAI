
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { contentService } from "@/services/contentService";
import LazyImageEditor from "@/components/LazyImageEditor";
import MainContent from "@/components/MainContent";
import SavedContents from "@/components/SavedContents";
import ErrorBoundary from "@/components/ErrorBoundary";

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [loadingSavedContents, setLoadingSavedContents] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showCopyImprover, setShowCopyImprover] = useState(false);
  const [improvedCopyFromAI, setImprovedCopyFromAI] = useState('');

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

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
    toast({ title: "Immagine aggiornata!" });
  };

  const handleCopyImproved = (improvedCopy: string) => {
    setImprovedCopyFromAI(improvedCopy);
    toast({ title: "Copy ottimizzato!" });
  };

  if (selectedImageForEdit && editingSlideIndex !== null) {
    return (
      <div className="p-2 sm:p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <LazyImageEditor
          imageUrl={selectedImageForEdit}
          onImageUpdate={handleImageUpdate}
          onClose={() => { setSelectedImageForEdit(null); setEditingSlideIndex(null); }}
        />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)' }}>
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
