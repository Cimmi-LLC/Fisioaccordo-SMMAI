/**
 * Carica un'immagine, rimuove il colore di sfondo (default: bianco/quasi-bianco)
 * sostituendolo con trasparenza, e ritorna un dataURL PNG.
 *
 * Algoritmo: per ogni pixel con R/G/B sopra `threshold` (vicino al bianco),
 * setta alpha = 0. Per pixel "borderline" applica alpha graduale (anti-alias morbido).
 *
 * Funziona solo per immagini con sfondo monocolore vicino al bianco.
 */
export async function removeWhiteBackground(
  src: string,
  options: { threshold?: number; softness?: number } = {}
): Promise<string> {
  const { threshold = 235, softness = 20 } = options;

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas non disponibile');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const minChannel = Math.min(r, g, b);
          if (minChannel >= threshold + softness) {
            // Pieno bianco → trasparente
            px[i + 3] = 0;
          } else if (minChannel >= threshold) {
            // Borderline → alpha graduale
            const ratio = (minChannel - threshold) / softness;
            px[i + 3] = Math.round(px[i + 3] * (1 - ratio));
          }
        }
        ctx.putImageData(data, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Impossibile caricare l\'immagine'));
    img.src = src;
  });
}

/**
 * Detect quickly if an image has a (mostly) white background by sampling
 * its 4 corners. Returns true if all 4 corners are white-ish.
 */
export async function hasWhiteBackground(src: string, threshold = 235): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0);
        const corners = [
          ctx.getImageData(0, 0, 1, 1).data,
          ctx.getImageData(canvas.width - 1, 0, 1, 1).data,
          ctx.getImageData(0, canvas.height - 1, 1, 1).data,
          ctx.getImageData(canvas.width - 1, canvas.height - 1, 1, 1).data,
        ];
        const whiteCorners = corners.filter(
          (c) => c[0] >= threshold && c[1] >= threshold && c[2] >= threshold && c[3] > 0
        ).length;
        // 3 of 4 corners white → likely a logo on white background
        resolve(whiteCorners >= 3);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
