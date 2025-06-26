
import React, { lazy, Suspense } from 'react';
import { Loader2 } from "lucide-react";

const ImageEditor = lazy(() => import('./ImageEditor'));

interface LazyImageEditorProps {
  imageUrl: string;
  onImageUpdate: (newUrl: string) => void;
  onClose: () => void;
}

const LazyImageEditor: React.FC<LazyImageEditorProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
            <p className="text-white/80">Caricamento editor immagini...</p>
          </div>
        </div>
      }
    >
      <ImageEditor {...props} />
    </Suspense>
  );
};

export default LazyImageEditor;
