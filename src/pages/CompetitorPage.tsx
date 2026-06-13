import React from 'react';
import CompetitorAnalysis from '@/components/CompetitorAnalysis';

const CompetitorPage = () => (
  <div className="max-w-6xl mx-auto p-6">
    <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
      Analisi Competitor
    </h1>
    <CompetitorAnalysis />
  </div>
);

export default CompetitorPage;
