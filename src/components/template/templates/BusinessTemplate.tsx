import React from 'react';
import { TemplateData } from '../TemplateLayoutEngine';

interface BusinessTemplateProps {
  data: TemplateData;
  width: number;
  height: number;
}

const BusinessTemplate: React.FC<BusinessTemplateProps> = ({
  data,
  width,
  height
}) => {
  return (
    <div 
      className="relative overflow-hidden bg-card"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Image */}
      {data.imageUrl && (
        <div className="absolute inset-0">
          <img 
            src={data.imageUrl} 
            alt="Background" 
            className="w-full h-full object-cover opacity-10"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-12">
        
        {data.title && (
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {data.title}
          </h1>
        )}

        {data.mainNumber && (
          <div className="text-7xl font-black text-primary mb-6 leading-none">
            {data.mainNumber}
          </div>
        )}
        
        {data.subtitle && (
          <h2 className="text-2xl font-semibold text-foreground/80 mb-8">
            {data.subtitle}
          </h2>
        )}

        {data.body && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {data.body}
          </p>
        )}

        {data.cta && (
          <div className="bg-primary text-primary-foreground py-4 px-8 rounded-lg font-semibold text-lg inline-block self-start hover:bg-primary/90 transition-colors shadow-lg">
            {data.cta}
          </div>
        )}

        {data.footer && (
          <p className="text-muted-foreground text-sm mt-8">
            {data.footer}
          </p>
        )}
      </div>
    </div>
  );
};

export default BusinessTemplate;