
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { contentService } from "@/services/contentService";
import { Loader2 } from "lucide-react";
import ImageEditor from "@/components/ImageEditor";
import InstagramConnection from "@/components/InstagramConnection";
import AppHeader from "@/components/AppHeader";
import MainContent from "@/components/MainContent";
import SavedContents from "@/components/SavedContents";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showCopyImprover, setShowCopyImprover] = useState(false);
  const [improvedCopyFromAI, setImprovedCopyFromAI] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadSavedContents();
    }
  }, [user]);

  const loadSavedContents = async () => {
    try {
      const { data, error } = await contentService.getUserContents();
      if (data && !error) {
        setSavedContents(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento contenuti salvati:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (!error) {
        navigate('/auth');
      }
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
  };

  const handleCopyImproved = (improvedCopy: string) => {
    setImprovedCopyFromAI(improvedCopy);
    
    toast({
      title: "🚀 Copy super-ottimizzato!",
      description: "Il tuo copy è stato migliorato con strategie avanzate di copywriting"
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (selectedImageForEdit && editingSlideIndex !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <ImageEditor
          imageUrl={selectedImageForEdit}
          onImageUpdate={handleImageUpdate}
          onClose={() => {
            setSelectedImageForEdit(null);
            setEditingSlideIndex(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppHeader
        user={user}
        showCopyImprover={showCopyImprover}
        onToggleCopyImprover={() => setShowCopyImprover(!showCopyImprover)}
        onSignOut={handleSignOut}
      />

      <MainContent
        user={user}
        showCopyImprover={showCopyImprover}
        onCopyImproved={handleCopyImproved}
      />

      <div className="max-w-7xl mx-auto px-4">
        <SavedContents savedContents={savedContents} />

        <div className="mt-8">
          <InstagramConnection />
        </div>

        <div className="mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            © 2024 Cimmi LLC. Tutti i diritti riservati.<br/>
            FisioAccordo(VIRAL)ContentAI è proprietà esclusiva di Cimmi LLC.<br/>
            È vietata la copia, riproduzione o replica di questa piattaforma senza autorizzazione scritta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
