// Costanti di costo stimato per il contatore cliente (server-only).
// Valori indicativi in USD, da rivedere quando cambiano i listini.

export const COST_GEMINI_FLASH_CALL = 0.001;   // testo/vision, per chiamata
export const COST_NB2_IMAGE_1K = 0.04;         // immagine 1K, per immagine

export function estimateGenesisCost(nImagesOk: number, nTextCalls: number): number {
  return nImagesOk * COST_NB2_IMAGE_1K + nTextCalls * COST_GEMINI_FLASH_CALL;
}
