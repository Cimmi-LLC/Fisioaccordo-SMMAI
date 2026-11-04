// Colori del brand ancorati a quelli realmente usati dal sito (funzione pura).

const HEX = /^#[0-9a-f]{6}$/i;

/** Scurisce un colore hex (0-1). Per derivare un secondario dal primario. */
function scurisci(hex: string, quanto: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - quanto));
  const g = Math.round(((n >> 8) & 255) * (1 - quanto));
  const b = Math.round((n & 255) * (1 - quanto));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * I colori del brand devono venire dal sito. L'analisi AI a volte ne inventava
 * (aveva l'istruzione di «suggerire colori del settore»): qui ogni colore
 * proposto che non compare tra quelli realmente usati dal sito viene
 * sostituito col colore reale successivo, in ordine di importanza.
 *
 * Quando il sito ha dei colori veri ma meno di tre, i posti vuoti NON si
 * riempiono più coi fallback dell'app (era così che il fucsia FisioAccordo
 * #E6007E finiva nel kit di un sito blu): il secondario diventa una versione
 * più scura del primario e il terziario un neutro scuro.
 * Senza nessun colore dal sito restano i fallback passati (che il wizard del
 * template riconosce come «non scelti» e ignora).
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
  const take = (p: string | undefined): string | null => {
    const v = (p || '').toLowerCase();
    if (HEX.test(v) && site.includes(v) && !used.includes(v)) { used.push(v); return v; }
    const next = site.find((c) => !used.includes(c));
    if (next) { used.push(next); return next; }
    return null;
  };
  const primario = take(proposed.colore_primario) as string; // site non vuoto: c'è sempre
  const secondario = take(proposed.colore_secondario) ?? scurisci(primario, 0.3);
  const terziario = take(proposed.colore_terziario) ?? '#1a1a2e';
  return { colore_primario: primario, colore_secondario: secondario, colore_terziario: terziario };
}
