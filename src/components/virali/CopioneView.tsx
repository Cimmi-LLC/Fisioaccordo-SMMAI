import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Smartphone, Clapperboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copioneDaLeggere, type Copione } from '@/lib/brand/virali';

const Blocco: React.FC<{ titolo: string; children: React.ReactNode }> = ({ titolo, children }) => (
  <div>
    <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ink3)' }}>{titolo}</div>
    <div className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{children}</div>
  </div>
);

const CopioneView: React.FC<{ copione: Copione }> = ({ copione }) => {
  const { toast } = useToast();
  const copia = async (testo: string, cosa: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      toast({ title: `${cosa} copiato` });
    } catch {
      toast({ title: 'Copia non riuscita', description: 'Seleziona il testo e copialo a mano.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-black" style={{ color: 'var(--ink)' }}>{copione.titolo}</span>
        <Badge variant="outline">{copione.tipo === 'esatta' ? 'Copia esatta' : 'Copia vicina'}</Badge>
        {copione.durata_stimata_s ? <Badge variant="outline">~{Math.round(copione.durata_stimata_s)} s</Badge> : null}
      </div>

      <div
        className="rounded-xl p-3 flex items-start gap-2 text-sm"
        style={{ backgroundColor: copione.semplice ? 'var(--viola-dim)' : 'rgba(0,0,0,0.04)', color: 'var(--ink)' }}
      >
        {copione.semplice ? <Smartphone className="h-4 w-4 mt-0.5 shrink-0" /> : <Clapperboard className="h-4 w-4 mt-0.5 shrink-0" />}
        <span>
          {copione.semplice
            ? 'Semplice: lo registri da solo col telefono, parlando in camera.'
            : `Serve: ${copione.cosa_serve.join(', ') || 'qualcosa in più del telefono'}.`}
        </span>
      </div>

      {copione.mattoncini_cambiati.length > 0 && (
        <Blocco titolo="Cosa cambia rispetto all'originale">{copione.mattoncini_cambiati.join(', ')}</Blocco>
      )}
      <Blocco titolo="Testo in alto (primi secondi)">
        <span className="font-bold">{copione.testo_in_alto}</span>
      </Blocco>
      <Blocco titolo="Cosa si vede nei primi 3 secondi">{copione.hook_visivo}</Blocco>
      <Blocco titolo="Cosa dici, una frase per riga">
        <ol className="list-decimal pl-5 space-y-1">
          {copione.frasi.map((f, i) => <li key={i}>{f}</li>)}
        </ol>
      </Blocco>
      {copione.parola_chiave && (
        <Blocco titolo="Lead magnet">
          Parola da commentare: <span className="font-bold">{copione.parola_chiave}</span>
          {copione.lead_magnet ? ` · ${copione.lead_magnet}` : ''}
        </Blocco>
      )}
      {copione.testi_a_schermo.length > 0 && (
        <Blocco titolo="Testi a schermo">
          <ul className="space-y-1">
            {copione.testi_a_schermo.map((t, i) => <li key={i}><span style={{ color: 'var(--ink3)' }}>{t.quando}</span> · {t.testo}</li>)}
          </ul>
        </Blocco>
      )}
      {copione.come_girarlo.length > 0 && (
        <Blocco titolo="Come girarlo">
          <ul className="list-disc pl-5 space-y-1">{copione.come_girarlo.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Blocco>
      )}
      {copione.didascalia && <Blocco titolo="Didascalia">{copione.didascalia}</Blocco>}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => copia(copioneDaLeggere(copione), 'Copione')}>
          <Copy className="h-4 w-4 mr-1" /> Copia il copione
        </Button>
        {copione.didascalia && (
          <Button size="sm" variant="outline" onClick={() => copia(copione.didascalia, 'Didascalia')}>
            <Copy className="h-4 w-4 mr-1" /> Copia la didascalia
          </Button>
        )}
      </div>
    </div>
  );
};

export default CopioneView;
