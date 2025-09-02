import React from 'react';
import { TemplateData } from '../TemplateLayoutEngine';

interface MinimalTemplateProps {
  data: TemplateData;
  width: number;
  height: number;
}

const MinimalTemplate: React.FC<MinimalTemplateProps> = ({
  data,
  width,
  height
}) => {
  return (
    <div 
      className="relative overflow-hidden bg-gray-50"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Image */}
      {data.imageUrl && (
        <div className="absolute inset-0">
          <img 
            src={data.imageUrl} 
            alt="Background" 
            className="w-full h-full object-cover opacity-5"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center h-full p-16 text-center">
        
        {data.mainNumber && (
          <div className="text-9xl font-thin text-gray-900 mb-8 leading-none">
            {data.mainNumber}
          </div>
        )}
        
        {data.title && (
          <h1 className="text-2xl font-light text-gray-800 mb-6 tracking-wide">
            {data.title}
          </h1>
        )}

        {data.subtitle && (
          <h2 className="text-lg font-normal text-gray-600 mb-12">
            {data.subtitle}
          </h2>
        )}

        {data.body && (
          <p className="text-base text-gray-500 mb-12 max-w-lg leading-relaxed font-light">
            {data.body}
          </p>
        )}

        {data.cta && (
          <div className="border border-gray-900 text-gray-900 py-3 px-12 font-medium text-sm uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-colors">
            {data.cta}
          </div>
        )}

        {data.footer && (
          <p className="text-gray-400 text-xs mt-12 tracking-wide">
            {data.footer}
          </p>
        )}
      </div>
    </div>
  );
};

export default MinimalTemplate;