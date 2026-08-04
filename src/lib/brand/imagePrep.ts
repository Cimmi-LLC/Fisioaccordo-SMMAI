// Preparazione immagini prima di upload e analisi.
//
// Gli screenshot dei post arrivano dal telefono a piena risoluzione: 6 file
// da qualche MB caricati in sequenza bloccavano il wizard per minuti, con
// il bottone fermo su "Caricamento" e nessun segnale di avanzamento.
// Per l'analisi semantica e per la palette non serve la piena risoluzione:
// ridurre il lato lungo a 1400px taglia il peso di un ordine di grandezza
// senza perdere informazione utile.
//
// Il LOGO non passa mai di qui: va conservato com'e, altrimenti la
// conversione in JPEG gli toglierebbe la trasparenza e rovinerebbe il
// compositing sulle slide.
//
// Browser only (document, canvas): non importare da Deno.

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.85;
/** Sotto questa soglia il file e gia leggero: si carica com'e. */
const SKIP_BELOW_BYTES = 400 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Immagine non decodificabile'));
    img.src = src;
  });
}

/**
 * Riduce l'immagine mantenendo le proporzioni. In caso di qualsiasi
 * problema restituisce il file originale: la preparazione non deve mai
 * essere il motivo per cui un caricamento fallisce.
 */
export async function downscaleImage(
  file: File,
  maxDimension = MAX_DIMENSION,
): Promise<File> {
  if (typeof document === 'undefined') return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= maxDimension) return file;

    const scale = maxDimension / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Esegue i job con un tetto di concorrenza, preservando l'ordine. */
export async function runWithLimit<T>(
  jobs: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, () => worker()),
  );
  return results;
}
