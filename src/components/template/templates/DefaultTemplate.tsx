import React from 'react';
import { TemplateData } from '../TemplateLayoutEngine';

interface DefaultTemplateProps {
  data: TemplateData;
  width: number;
  height: number;
}

const DefaultTemplate: React.FC<DefaultTemplateProps> = ({
  data,
  width,
  height
}) => {
  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Image */}
      {data.imageUrl && (
        <div className="absolute inset-0">
          <img 
            src={data.imageUrl} 
            alt="Background" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center h-full p-8 text-center">
        
        {data.title && (
          <h1 className="text-4xl font-bold text-white mb-6">
            {data.title}
          </h1>
        )}

        {data.mainNumber && (
          <div className="text-8xl font-black text-white mb-4 leading-none">
            {data.mainNumber}
          </div>
        )}
        
        {data.subtitle && (
          <h2 className="text-2xl font-semibold text-white/90 mb-8">
            {data.subtitle}
          </h2>
        )}

        {data.body && (
          <p className="text-lg text-white/80 mb-8 max-w-2xl leading-relaxed">
            {data.body}
          </p>
        )}

        {data.cta && (
          <div className="bg-white text-gray-900 py-3 px-8 rounded-full font-bold text-lg">
            {data.cta}
          </div>
        )}

        {data.footer && (
          <p className="text-white/60 text-sm mt-8">
            {data.footer}
          </p>
        )}
      </div>
    </div>
  );
};

export default DefaultTemplate;