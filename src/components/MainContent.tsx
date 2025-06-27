
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import PreviewSection from "./PreviewSection";
import HookGenerator from "./HookGenerator";
import LazyCopyImprover from "./LazyCopyImprover";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useCarouselSlides } from "@/hooks/useCarouselSlides";
import { useHookManager } from "@/hooks/useHookManager";
import { useImageManager } from "@/hooks/useImageManager";
import { usePhotoManager } from "@/hooks/usePhotoManager";

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
}

const MainContent: React.FC<MainContentProps> = React.memo(({ user, showCopyImprover, onCopyImproved }) => {
  const loadingState = useGlobalLoading();
  
  const [ideaInput, setIdeaInput] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    audience: '',
    length: 'medio',
    tone: 'professionale',
    platform: 'instagram',
    postType: 'carosello',
    numSlides: '5',
    numImages: '1'
  });
  
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showHookGenerator, setShowHookGenerator] = useState(false);
  const [hookTopic, setHookTopic] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [appliedHook, setAppliedHook] = useState<string>('');
  const [basePhoto, setBasePhoto] = useState<string | null>(null);

  // Custom hooks
  const { carouselSlides, setCarouselSlides, generateCarouselSlides } = useCarouselSlides(formData, user, basePhoto);
  const { generatedContent, setGeneratedContent, generateContent, saveContent } = useContentGeneration(user, formData, generateCarouselSlides);

  // Managers as hooks
  const hookManager = useHookManager({
    carouselSlides,
    setCarouselSlides,
    generatedContent,
    setGeneratedContent,
    appliedHook,
    setAppliedHook,
    formData
  });

  const imageManager = useImageManager({
    carouselSlides,
    setCarouselSlides,
    selectedImageForEdit,
    setSelectedImageForEdit,
    editingSlideIndex,
    setEditingSlideIndex
  });

  const photoManager = usePhotoManager({
    basePhoto,
    setBasePhoto
  });

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
  }, []);

  const handleSaveContent = () => {
    saveContent(carouselSlides);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">
          Generatore di Post Social ✨
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 px-4">
          Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
        </p>
      </div>

      {/* Progress indicator quando in loading */}
      {loadingState.isLoading && (
        <div className="mb-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <EnhancedProgress
                value={loadingState.progress}
                status={loadingState.status}
                message={loadingState.message}
                size="md"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showCopyImprover && (
        <div className="mb-6 sm:mb-8">
          <LazyCopyImprover onCopyImproved={onCopyImproved} />
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <IdeaGenerator
          ideaInput={ideaInput}
          setIdeaInput={setIdeaInput}
          onIdeaGenerated={handleIdeaGenerated}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        <div>
          {loadingState.isLoading ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configurazione Post</CardTitle>
              </CardHeader>
              <CardContent>
                <SkeletonLoader type="form" />
              </CardContent>
            </Card>
          ) : (
            <ContentForm
              formData={formData}
              onInputChange={handleInputChange}
              isGenerating={loadingState.isLoading}
              onGenerate={generateContent}
              basePhoto={basePhoto}
              onPhotoUpload={photoManager.handlePhotoUpload}
              onPhotoRemove={photoManager.handlePhotoRemove}
            />
          )}
        </div>

        <div>
          {loadingState.isLoading && !generatedContent ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Anteprima Contenuto</CardTitle>
              </CardHeader>
              <CardContent>
                <SkeletonLoader type="content" />
                <div className="mt-6">
                  <SkeletonLoader type="carousel" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <PreviewSection
              generatedContent={generatedContent}
              carouselSlides={carouselSlides}
              setCarouselSlides={setCarouselSlides}
              appliedHook={appliedHook}
              onRemoveHook={hookManager.removeHook}
              onImageEdit={imageManager.handleImageEdit}
              onSaveContent={handleSaveContent}
            />
          )}
        </div>
      </div>

      <HookGenerator
        showHookGenerator={showHookGenerator}
        setShowHookGenerator={setShowHookGenerator}
        hookTopic={hookTopic}
        setHookTopic={setHookTopic}
        generatedHooks={generatedHooks}
        setGeneratedHooks={setGeneratedHooks}
        onApplyHook={hookManager.applyHookToContent}
      />
    </div>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
