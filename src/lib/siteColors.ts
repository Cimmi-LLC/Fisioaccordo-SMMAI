// Colori del brand ancorati a quelli realmente usati dal sito (funzione pura).

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * I colori del brand devono venire dal sito. L'analisi AI a volte ne inventa
 * (ha l'istruzione di "suggerire colori del settore" se non li trova): qui
 * ogni colore proposto che non compare tra quelli realmente usati dal sito
 * viene sostituito col colore reale successivo, in ordine di importanza.
 * Senza colori dal sito restano i fallback passati (i default dell'app, che il
 * wizard del template riconosce e ignora).
 */
export function siteGroundedColors(
  proposed: { colore_primario?: string; colore_secondario?: string; colore_terziario?: string },
  siteColors: string[],
  fallback: { primario: string; secondario: string; terziario: string },
): { colore_primario: string; colore_secondario: string; colore_terziario: string } {
  const site = siteColors.map((c) => c.toLowerCase()).filter((c) => HEX.test(c));
  if (site.length === 0) {
    return { colore_primario: fallback.primario, colore_secondario: fallback.secondario, colore_terziario: fallback.terziario };
  }
  const used: string[] = [];
  const take = (p: string | undefined, fb: string): string => {
    const v = (p || '').toLowerCase();
    if (HEX.test(v) && site.includes(v) && !used.includes(v)) { used.push(v); return v; }
    const next = site.find((c) => !used.includes(c));
    if (next) { used.push(next); return next; }
    return fb;
  };
  return {
    colore_primario: take(proposed.colore_primario, fallback.primario),
    colore_secondario: take(proposed.colore_secondario, fallback.secondario),
    colore_terziario: take(proposed.colore_terziario, fallback.terziario),
  };
}
