import React from 'react';
import { Loader2 } from 'lucide-react';

interface MinimalProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

const MinimalProgressBar: React.FC<MinimalProgressBarProps> = ({
  current,
  total,
  label = 'Generazione immagini',
}) => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div
      className="p-3 rounded-xl"
      style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid rgba(85,70,151,0.15)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--viola)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
          {label}... {current}/{total}
        </span>
      </div>
      <div style={{ height: 4, backgroundColor: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--viola), var(--rosa))',
            width: `${pct}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};

export default MinimalProgressBar;
