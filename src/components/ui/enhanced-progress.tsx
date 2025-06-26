
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface EnhancedProgressProps {
  value?: number;
  status?: 'loading' | 'success' | 'error' | 'idle';
  message?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const EnhancedProgress: React.FC<EnhancedProgressProps> = ({ 
  value = 0, 
  status = 'idle', 
  message, 
  showPercentage = true,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className={`${iconSize[size]} animate-spin text-blue-500`} />;
      case 'success':
        return <CheckCircle2 className={`${iconSize[size]} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${iconSize[size]} text-red-500`} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          {message && (
            <span className="text-sm text-gray-300 font-medium">
              {message}
            </span>
          )}
        </div>
        {showPercentage && (
          <span className="text-sm text-gray-400 font-mono">
            {Math.round(value)}%
          </span>
        )}
      </div>
      
      <div className="relative">
        <Progress 
          value={value} 
          className={`${sizeClasses[size]} bg-gray-700`}
        />
        <div 
          className={`absolute top-0 left-0 h-full ${getStatusColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

export default EnhancedProgress;
