// «Salta e configura dopo» nel Template Genesis: il brand entra subito
// nell'app senza logo ne template. Se mancano i colori si mettono quelli
// neutri di partenza: senza, storie e anteprime ripiegano sui colori
// FisioAccordo anche per brand che non c'entrano.

export const COLORI_PARTENZA = {
  colore_primario: '#1F2937',
  colore_secondario: '#F59E0B',
  colore_terziario: '#FFFFFF',
} as const;

type ColoriBrand = {
  colore_primario?: string | null;
  colore_secondario?: string | null;
  colore_terziario?: string | null;
};

/** Solo i colori da riempire: quelli gia scelti dal cliente non si toccano. */
export function coloriDaCompletare(brand: ColoriBrand | null | undefined): Partial<ColoriBrand> {
  const patch: Partial<ColoriBrand> = {};
  for (const k of Object.keys(COLORI_PARTENZA) as Array<keyof typeof COLORI_PARTENZA>) {
    if (!brand?.[k]?.trim()) patch[k] = COLORI_PARTENZA[k];
  }
  return patch;
}
