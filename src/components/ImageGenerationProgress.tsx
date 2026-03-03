import React from 'react';
import { Check, Loader2, ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImageGenerationProgressProps {
  totalSlides: number;
  currentSlide: number;
  isGenerating: boolean;
}

const ImageGenerationProgress: React.FC<ImageGenerationProgressProps> = ({
  totalSlides,
  currentSlide,
  isGenerating
}) => {
  const progress = totalSlides > 0 ? Math.round((currentSlide / totalSlides) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-fade-in">
      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
        🎨 Generating Images
      </h4>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalSlides }, (_, i) => {
          const isDone = i < currentSlide;
          const isActive = i === currentSlide && isGenerating;
          const isPending = i > currentSlide;

          return (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300 ${
                isDone
                  ? 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400'
                  : isActive
                  ? 'bg-primary/15 border-primary/40 text-primary animate-pulse'
                  : 'bg-muted/50 border-muted-foreground/20 text-muted-foreground'
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5" />
              ) : isActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 opacity-40" />
              )}
              Slide {i + 1}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {isGenerating
            ? currentSlide < totalSlides
              ? `Slide ${currentSlide + 1} of ${totalSlides} — Creating image...`
              : 'Finalizing...'
            : `${currentSlide} of ${totalSlides} images created`}
        </p>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};

export default ImageGenerationProgress;
