import React from 'react';
import TrendExplorer from '@/components/TrendExplorer';

const TrendPage = () => (
  <div className="max-w-4xl mx-auto p-6">
    <h1 className="text-xl font-black mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
      Trend del Momento
    </h1>
    <TrendExplorer />
  </div>
);

export default TrendPage;
