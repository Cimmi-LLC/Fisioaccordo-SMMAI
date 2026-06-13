import React from 'react';
import ViralAnalyzer from '@/components/ViralAnalyzer';

const ViralePage = () => (
  <div className="max-w-6xl mx-auto p-6">
    <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
      Analisi Post Virali
    </h1>
    <ViralAnalyzer />
  </div>
);

export default ViralePage;
