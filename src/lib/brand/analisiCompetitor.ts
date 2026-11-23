// Pulizia dell'analisi competitor prima che la veda il cliente.
// Specchio byte-identico in supabase/functions/_shared/brand/: la usa
// analyze-competitors sulle analisi nuove e CompetitorAnalysis.tsx su
// quelle già salvate.
//
// Il 18/11 il reparto social ha visto «Frequenza: non deducibile dai dati
// forniti»: al modello non arrivavano le date dei post. Ora la frequenza
// si calcola qui dalle date vere, e se non si può la riga non c'è.

/**
 * Frasi con cui il modello dice che un dato manca («non deducibile dai dati
 * forniti», «non determinabile», «dati insufficienti», «N/D»). Davanti al
 * cliente non si mostrano: il campo sparisce.
 */
const MANCA_IL_DATO = [
  /\bnon\s+(?:è\s+|sono\s+|risulta\s+|risultano\s+)?(?:deducibil|determinabil|calcolabil|rilevabil|stimabil|quantificabil|valutabil|desumibil)\w*/i,
  /\bimpossibile\s+(?:da\s+)?(?:dedurre|determinare|stabilire|calcolare|stimare|valutare)\b/i,
  /\bdati\s+(?:insufficienti|non\s+sufficienti|mancanti|non\s+disponibili)\b/i,
  /\bnon\s+(?:emerge|si\s+evince|si\s+può\s+dire)\w*\s+dai\s+dati\b/i,
  /^\s*(?:n\/?d|n\.\s?d\.?|non\s+disponibile|non\s+specificat[oa]|non\s+indicat[oa]|sconosciut[oa])\s*\.?\s*$/i,
];

// Oltre questa lunghezza il testo dice anche altro (es. il riassunto): si tiene.
const LUNGHEZZA_CAMPO_CORTO = 160;

/** true se il valore è solo un «non si può dire» del modello. */
export function nonDeducibile(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (!t || t.length > LUNGHEZZA_CAMPO_CORTO) return false;
  return MANCA_IL_DATO.some((re) => re.test(t));
}

/** Copia dell'analisi senza i campi e le voci «non deducibile». */
export function togliNonDeducibili<T>(x: T): T {
  if (Array.isArray(x)) {
    return x.filter((v) => !nonDeducibile(v)).map((v) => togliNonDeducibili(v)) as unknown as T;
  }
  if (x && typeof x === 'object') {
    const fuori: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (nonDeducibile(v)) continue;
      fuori[k] = togliNonDeducibili(v);
    }
    return fuori as T;
  }
  return x;
}

/**
 * Frequenza di pubblicazione dalle date vere dei contenuti, in italiano
 * semplice («circa 3 post a settimana»). Usa la distanza mediana fra un
 * contenuto e il successivo, così un post fissato in alto di due anni fa
 * non la falsa. Con meno di 3 date restituisce null: la riga non si mostra.
 */
export function frequenzaDaDate(date: Array<string | null | undefined>, cosa = 'post'): string | null {
  const tempi = [...new Set(
    date.filter((d): d is string => typeof d === 'string' && d.trim() !== '')
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t)),
  )].sort((a, b) => b - a);
  if (tempi.length < 3) return null;
  const distanze = tempi.slice(1).map((t, i) => (tempi[i] - t) / 86_400_000).sort((a, b) => a - b);
  const mezzo = Math.floor(distanze.length / 2);
  const mediana = distanze.length % 2 ? distanze[mezzo] : (distanze[mezzo - 1] + distanze[mezzo]) / 2;
  const aSettimana = 7 / Math.max(mediana, 1 / 24);
  if (aSettimana > 10) return `più di un ${cosa} al giorno`;
  if (aSettimana >= 6) return `circa un ${cosa} al giorno`;
  if (aSettimana >= 1.5) return `circa ${Math.round(aSettimana)} ${cosa} a settimana`;
  if (aSettimana >= 0.75) return `circa un ${cosa} a settimana`;
  const alMese = (aSettimana * 30) / 7;
  if (alMese >= 1.5) return `circa ${Math.round(alMese)} ${cosa} al mese`;
  if (alMese >= 0.75) return `circa un ${cosa} al mese`;
  return `meno di un ${cosa} al mese`;
}
