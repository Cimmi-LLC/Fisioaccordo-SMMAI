
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
    setLoadingSavedContents(true);
    try {
      const { data, error } = await contentService.getUserContents();
      if (data && !error) {
        setSavedContents(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento contenuti salvati:', error);
      toast({
        title: "⚠️ Warning",
        description: "Error loading saved contents",
        variant: "destructive"
      });
    } finally {
      setLoadingSavedContents(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (!error) {
        navigate('/auth');
        toast({
          title: "👋 Goodbye!",
          description: "Successfully logged out"
        });
      }
    } catch (error) {
      console.error('Errore durante il logout:', error);
      toast({
        title: "❌ Error",
        description: "Error during logout",
        variant: "destructive"
      });
    }
  };

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
    
    toast({
      title: "🎨 Image updated!",
      description: "The image has been successfully modified"
    });
  };

  const handleCopyImproved = (improvedCopy: string) => {
    setImprovedCopyFromAI(improvedCopy);
    
    toast({
      title: "🚀 Super-optimized copy!",
      description: "Your copy has been improved with advanced copywriting strategies"
    });
  };

  // Loading state per auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  // Image editor full screen
  if (selectedImageForEdit && editingSlideIndex !== null) {
    return (
      <div className="min-h-screen bg-background p-2 sm:p-4">
        <LazyImageEditor
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
    <div className="min-h-screen bg-background">
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

      <div className="max-w-7xl mx-auto px-4">
        <ErrorBoundary>
          <SavedContents 
            savedContents={savedContents} 
            isLoading={loadingSavedContents}
          />
        </ErrorBoundary>


        {/* Footer migliorato con responsività */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-card/70 backdrop-blur-sm rounded-lg border border-border shadow-enhanced">
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              © 2024 Cimmi LLC. All rights reserved. | <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> | <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            </p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
              FisioAccordo(VIRAL)ContentAI is the exclusive property of Cimmi LLC.
              Copying, reproduction, or replication of this platform without written authorization is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
