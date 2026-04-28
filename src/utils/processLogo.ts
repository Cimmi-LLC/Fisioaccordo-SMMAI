import { supabase } from '@/integrations/supabase/client';
import { hasWhiteBackground, removeWhiteBackground } from './removeWhiteBackground';

/**
 * Process a logo so it ends up as a transparent-background PNG in Storage.
 *
 * Steps:
 *  1. If `src` is already a clean transparent PNG (or doesn't have a white bg),
 *     return it unchanged.
 *  2. Otherwise: remove the white background via canvas and upload the resulting
 *     PNG to Supabase Storage via the existing `save-slide-image` edge function.
 *
 * Returns the URL (original or new) ready to be stored in `brands.logo_url`.
 * Falls back gracefully to the original URL if anything fails.
 */
export async function processLogoIfNeeded(src: string, userId?: string): Promise<string> {
  if (!src) return '';
  // Skip already-processed (data URLs come from local upload, leave them to be uploaded as-is by caller)
  try {
    const isDataUrl = src.startsWith('data:');
    // Check whitebg
    const whiteBg = await hasWhiteBackground(src);
    if (!whiteBg) return src;

    // Remove background
    const cleanedDataUrl = await removeWhiteBackground(src);

    // Upload to Storage via existing edge function (returns public URL)
    const { data, error } = await supabase.functions.invoke('save-slide-image', {
      body: { dataUrl: cleanedDataUrl, userId, slideIndex: 0 },
    });
    if (error || data?.error || !data?.url) {
      console.warn('processLogoIfNeeded: upload failed, returning original', error || data?.error);
      // If we cannot upload but we did clean, return the dataUrl directly (large but works)
      return isDataUrl ? cleanedDataUrl : src;
    }
    return data.url as string;
  } catch (err) {
    console.warn('processLogoIfNeeded: failed, returning original', err);
    return src;
  }
}
