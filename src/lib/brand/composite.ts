// Compositing client-side con Canvas API.
//
// NB2 non riproduce fedelmente un logo esistente: i template si generano
// SENZA logo e il logo reale si sovrappone qui, alle coordinate logo_slot
// dell'archetipo. Stessa cosa per la foto del professionista nello slot
// photo_slot della slide CTA (crop cover + maschera circolare quando lo
// slot e quadrato).
//
// Nota runtime: browser-only (document.createElement). Non importare da Deno.

import type { Slot } from './archetypes.ts';

const CANVAS = 1080;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Immagine non caricabile: ' + src.slice(0, 80)));
    img.src = src;
  });
}

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D non disponibile');
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob fallito'))), 'image/png');
  });
}

/**
 * Sovrappone il logo reale alla slide, contain-fit dentro lo slot.
 * `slideUrl` e `logoUrl` sono signed URL (CORS: crossOrigin anonymous).
 */
export async function compositeLogo(
  slideUrl: string,
  logoUrl: string,
  slot: Slot
): Promise<Blob> {
  const [slide, logo] = await Promise.all([loadImage(slideUrl), loadImage(logoUrl)]);
  const { canvas, ctx } = makeCanvas();

  ctx.drawImage(slide, 0, 0, CANVAS, CANVAS);

  // contain-fit del logo dentro lo slot (larghezza slot.w, altezza libera)
  const maxW = slot.w;
  const maxH = slot.h ?? slot.w;
  const scale = Math.min(maxW / logo.width, maxH / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;
  const x = slot.x + (maxW - w) / 2;
  const y = slot.y + (maxH - h) / 2;
  ctx.drawImage(logo, x, y, w, h);

  return toBlob(canvas);
}

/**
 * Sovrappone la foto reale del professionista nello slot photo della CTA.
 * Crop cover; se lo slot e quadrato applica la maschera circolare
 * (gli archetipi con area circolare hanno slot quadrati).
 */
export async function compositePhoto(
  slideUrl: string,
  photoUrl: string,
  slot: Slot & { h: number }
): Promise<Blob> {
  const [slide, photo] = await Promise.all([loadImage(slideUrl), loadImage(photoUrl)]);
  const { canvas, ctx } = makeCanvas();

  ctx.drawImage(slide, 0, 0, CANVAS, CANVAS);

  const isSquare = Math.abs(slot.w - slot.h) < 2;

  ctx.save();
  if (isSquare) {
    // maschera circolare inscritta nello slot
    const r = slot.w / 2;
    ctx.beginPath();
    ctx.arc(slot.x + r, slot.y + r, r, 0, Math.PI * 2);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();
  }

  // crop cover della foto dentro lo slot
  const scale = Math.max(slot.w / photo.width, slot.h / photo.height);
  const w = photo.width * scale;
  const h = photo.height * scale;
  const x = slot.x + (slot.w - w) / 2;
  const y = slot.y + (slot.h - h) / 2;
  ctx.drawImage(photo, x, y, w, h);
  ctx.restore();

  return toBlob(canvas);
}
