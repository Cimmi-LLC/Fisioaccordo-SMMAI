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
      className="relative overflow-hidden bg-white"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {data.title}
          </h1>
        )}

        {data.mainNumber && (
          <div className="text-7xl font-black text-blue-600 mb-6 leading-none">
            {data.mainNumber}
          </div>
        )}
        
        {data.subtitle && (
          <h2 className="text-2xl font-semibold text-gray-700 mb-8">
            {data.subtitle}
          </h2>
        )}

        {data.body && (
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {data.body}
          </p>
        )}

        {data.cta && (
          <div className="bg-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg inline-block self-start">
            {data.cta}
          </div>
        )}

        {data.footer && (
          <p className="text-gray-400 text-sm mt-8">
            {data.footer}
          </p>
        )}
      </div>
    </div>
  );
};

export default BusinessTemplate;