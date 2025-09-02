import React from 'react';
import { TemplateData } from '../TemplateLayoutEngine';

interface FisioaccordoTemplateProps {
  data: TemplateData;
  width: number;
  height: number;
}

const FisioaccordoTemplate: React.FC<FisioaccordoTemplateProps> = ({
  data,
  width,
  height
}) => {
  return (
    <div 
      className="relative overflow-hidden bg-fisio-background font-fisio"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Image */}
      {data.imageUrl && (
        <div className="absolute inset-0">
          <img 
            src={data.imageUrl} 
            alt="Background" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
      )}

      {/* Header Rosa Fucsia */}
      <div className="relative z-10 bg-fisio-primary text-fisio-primary-foreground py-6 px-8">
        <h1 className="text-2xl font-black uppercase tracking-wide text-center font-fisio-display">
          {data.title || "FISIOACCORDO"}
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col justify-between h-full pt-0 pb-20">
        
        {/* Central Number - Large and Bold */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {data.mainNumber && (
              <div className="text-9xl font-black text-fisio-secondary mb-4 leading-none font-fisio-display">
                {data.mainNumber}
              </div>
            )}
            
            {data.subtitle && (
              <div className="text-3xl font-bold text-fisio-secondary mb-8 font-fisio">
                {data.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Value Proposition */}
        {data.body && (
          <div className="px-8 mb-8">
            <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
              <p className="text-fisio-secondary text-xl font-semibold text-center leading-relaxed font-fisio">
                {data.body}
              </p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {data.cta && (
          <div className="px-8 mb-6">
            <div className="bg-fisio-primary text-fisio-primary-foreground py-4 px-8 rounded-2xl text-center shadow-lg">
              <span className="text-xl font-bold uppercase tracking-wide font-fisio-display">
                {data.cta}
              </span>
            </div>
          </div>
        )}

        {/* Footer - Discrete Branding */}
        {data.footer && (
          <div className="px-8">
            <p className="text-fisio-secondary/60 text-sm text-center font-medium font-fisio">
              {data.footer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FisioaccordoTemplate;