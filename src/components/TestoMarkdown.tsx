import React from 'react';
import { blocchiMarkdown, pezziInline, type PezzoInline } from '@/lib/testoMarkdown';

// Mostra i testi del modello col markdown semplice già reso (grassetto,
// elenchi, a capo), senza HTML grezzo. Per le regole vedi lib/testoMarkdown.

const Riga: React.FC<{ pezzi: PezzoInline[] }> = ({ pezzi }) => (
  <>{pezzi.map((p, i) => (p.grassetto ? <strong key={i}>{p.testo}</strong> : <React.Fragment key={i}>{p.testo}</React.Fragment>))}</>
);

/** Testo su una riga sola (dentro un elenco o una frase): solo il grassetto. */
export const InlineMarkdown: React.FC<{ testo: string }> = ({ testo }) => <Riga pezzi={pezziInline(String(testo ?? ''))} />;

/** Testo lungo: paragrafi, elenchi puntati o numerati, a capo. */
const TestoMarkdown: React.FC<{ testo: string; className?: string; style?: React.CSSProperties }> = ({ testo, className, style }) => (
  <div className={`space-y-2 ${className || ''}`} style={style}>
    {blocchiMarkdown(String(testo ?? '')).map((b, i) => {
      if (b.tipo === 'paragrafo') {
        return (
          <p key={i}>
            {b.righe.map((r, j) => (
              <React.Fragment key={j}>{j > 0 && <br />}<Riga pezzi={r} /></React.Fragment>
            ))}
          </p>
        );
      }
      const Lista = b.numerato ? 'ol' : 'ul';
      return (
        <Lista key={i} className={`${b.numerato ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
          {b.voci.map((v, j) => <li key={j}><Riga pezzi={v} /></li>)}
        </Lista>
      );
    })}
  </div>
);

export default TestoMarkdown;
