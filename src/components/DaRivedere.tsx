import React from 'react';

/**
 * Riquadro «Da rivedere»: promesse che un profilo sanitario non pubblica
 * (guarigione, risultati garantiti o duraturi, «senza farmaci», sintomi che
 * spariscono, tempi promessi) e cose che il brand ha scritto di non dire.
 * Le trova il server dopo la stesura (daRivedere in metodoCopy.ts): qui si
 * mostrano a chi pubblica o registra, con le parole esatte.
 */
const DaRivedere: React.FC<{ voci?: string[] | null; quando?: string; className?: string }> = ({
  voci, quando = 'pubblicare', className = '',
}) => {
  if (!voci || voci.length === 0) return null;
  return (
    <div
      className={`rounded-xl p-3 text-left ${className}`}
      style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)', color: 'var(--ink)' }}
    >
      <p className="text-[13px] font-bold">Da rivedere prima di {quando}</p>
      <p className="text-[12px] mb-1" style={{ color: 'var(--ink2)' }}>
        Nel testo sono rimaste promesse che un profilo sanitario non pubblica, o cose che il tuo brand non dice. Correggile a mano.
      </p>
      <ul className="list-disc pl-5 space-y-0.5 text-[12px]">
        {voci.map((v, i) => <li key={i}>{v}</li>)}
      </ul>
    </div>
  );
};

export default DaRivedere;
