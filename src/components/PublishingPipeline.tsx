import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface PipelineStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

interface PublishingPipelineProps {
  steps: PipelineStep[];
  title: string;
  progress: number;
}

const StepIcon: React.FC<{ status: PipelineStep['status'] }> = ({ status }) => {
  switch (status) {
    case 'done':
      return (
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-md shadow-green-500/30">
          <Check className="w-4 h-4 text-white" />
        </div>
      );
    case 'active':
      return (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30 animate-pulse">
          <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
        </div>
      );
    case 'error':
      return (
        <div className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shadow-md shadow-destructive/30">
          <AlertCircle className="w-4 h-4 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 bg-muted/50" />
      );
  }
};

const PublishingPipeline: React.FC<PublishingPipelineProps> = ({ steps, title, progress }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-in">
      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
        📤 {title}
      </h4>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 my-1 rounded-full transition-colors duration-300 ${
                  step.status === 'done' ? 'bg-green-500' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
            <span className={`text-sm pt-1 transition-colors duration-300 ${
              step.status === 'done' ? 'text-green-600 dark:text-green-400 font-medium' :
              step.status === 'active' ? 'text-foreground font-semibold' :
              step.status === 'error' ? 'text-destructive font-medium' :
              'text-muted-foreground'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Progress value={progress} className="h-2.5" />
        <p className="text-xs text-muted-foreground text-right font-medium">{Math.round(progress)}%</p>
      </div>
    </div>
  );
};

export default PublishingPipeline;
