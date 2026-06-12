import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a short-lived signed URL for a private bucket object.
 *
 * Rule for this app (see docs/storage-usage-map.md):
 *  - We store ONLY `{bucket, path}` in DB, never full URLs.
 *  - URLs are minted on demand right before the consumer needs them.
 *  - For the Meta Graph publish flow, signed URLs are minted server-side
 *    inside `meta-publish` / `process-scheduled-posts` (TTL ≥ 600s).
 *  - For in-app display, signed URLs are minted client-side with shorter TTL.
 *
 * @param bucket bucket name (e.g. `user-photos`, `story-templates`)
 * @param path relative path inside the bucket
 * @param ttlSeconds default 3600 (1h) — long enough for typical render+cache
 * @returns the signed URL or `''` on failure (caller can fall back to placeholder)
 */
export async function signedUrl(
  bucket: string,
  path: string,
  ttlSeconds = 3600
): Promise<string> {
  if (!path) return '';
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error) {
    console.error('[storage] signedUrl failed', { bucket, path, error: error.message });
    return '';
  }
  return data.signedUrl;
}

/**
 * Generate signed URLs for a batch of paths in the same bucket.
 * Falls back to per-file calls if the batch endpoint isn't available.
 */
export async function signedUrls(
  bucket: string,
  paths: string[],
  ttlSeconds = 3600
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, ttlSeconds);
  if (error) {
    console.error('[storage] signedUrls failed, falling back', { bucket, error: error.message });
    return Promise.all(paths.map((p) => signedUrl(bucket, p, ttlSeconds)));
  }
  return data.map((d) => d.signedUrl);
}
