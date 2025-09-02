import React from 'react';
import { VisualTemplate } from './VisualTemplateSelector';
import FisioaccordoTemplate from './templates/FisioaccordoTemplate';
import DefaultTemplate from './templates/DefaultTemplate';
import BusinessTemplate from './templates/BusinessTemplate';
import MinimalTemplate from './templates/MinimalTemplate';

export interface TemplateSlot {
  type: 'header' | 'main_number' | 'subtitle' | 'body' | 'cta' | 'footer';
  content: string;
  style?: Record<string, any>;
}

export interface TemplateData {
  title?: string;
  mainNumber?: string;
  subtitle?: string;
  body?: string;
  cta?: string;
  footer?: string;
  imageUrl?: string;
  backgroundColor?: string;
}

interface TemplateLayoutEngineProps {
  template: VisualTemplate;
  data: TemplateData;
  width?: number;
  height?: number;
  className?: string;
}

const TemplateLayoutEngine: React.FC<TemplateLayoutEngineProps> = ({
  template,
  data,
  width = 1080,
  height = 1080,
  className = ""
}) => {
  const renderTemplate = () => {
    switch (template) {
      case 'fisioaccordo':
        return <FisioaccordoTemplate data={data} width={width} height={height} />;
      case 'business':
        return <BusinessTemplate data={data} width={width} height={height} />;
      case 'minimal':
        return <MinimalTemplate data={data} width={width} height={height} />;
      default:
        return <DefaultTemplate data={data} width={width} height={height} />;
    }
  };

  return (
    <div 
      className={`template-container ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {renderTemplate()}
    </div>
  );
};

export default TemplateLayoutEngine;