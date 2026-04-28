// Shared Instagram Graph API publishing logic.
// Used by both `meta-publish` (interactive, JWT-authed) and
// `process-scheduled-posts` (cron, service-role).

const API_VERSION = 'v22.0';

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

async function igFetch(
  url: string,
  token: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<any> {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}access_token=${token}`;
  const options: RequestInit = { method };
  if (body && method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(fullUrl, options);
  return await res.json();
}

async function waitForMediaReady(
  containerId: string,
  token: string,
  maxAttempts = 30,
  delayMs = 2000
): Promise<{ ready: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await igFetch(
      `https://graph.instagram.com/${API_VERSION}/${containerId}?fields=status_code`,
      token
    );
    if (data.status_code === 'FINISHED') return { ready: true };
    if (data.status_code === 'ERROR') return { ready: false, error: data.status || 'Media processing failed' };
    if (data.error) return { ready: false, error: data.error.message };
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { ready: false, error: 'Timeout: Instagram non ha finito di elaborare il media entro 60 secondi' };
}

async function publishContainer(igId: string, token: string, creationId: string): Promise<PublishResult> {
  const status = await waitForMediaReady(creationId, token);
  if (!status.ready) return { success: false, error: status.error || 'Media not ready' };

  const publishData = await igFetch(
    `https://graph.instagram.com/${API_VERSION}/${igId}/media_publish`,
    token,
    'POST',
    { creation_id: creationId }
  );

  if (publishData.error) return { success: false, error: publishData.error.message };
  return { success: true, postId: publishData.id };
}

export async function publishSingleImage(
  igId: string,
  token: string,
  caption: string,
  imageUrl: string
): Promise<PublishResult> {
  const containerData = await igFetch(
    `https://graph.instagram.com/${API_VERSION}/${igId}/media`,
    token,
    'POST',
    { image_url: imageUrl, caption }
  );
  if (containerData.error) return { success: false, error: containerData.error.message };
  return await publishContainer(igId, token, containerData.id);
}

export async function publishCarousel(
  igId: string,
  token: string,
  caption: string,
  urls: string[]
): Promise<PublishResult> {
  const childIds: string[] = [];
  for (const url of urls) {
    const data = await igFetch(
      `https://graph.instagram.com/${API_VERSION}/${igId}/media`,
      token,
      'POST',
      { image_url: url, is_carousel_item: true }
    );
    if (data.error) return { success: false, error: `Errore carousel item: ${data.error.message}` };
    childIds.push(data.id);
  }

  const containerData = await igFetch(
    `https://graph.instagram.com/${API_VERSION}/${igId}/media`,
    token,
    'POST',
    { media_type: 'CAROUSEL', caption, children: childIds }
  );
  if (containerData.error) return { success: false, error: containerData.error.message };
  return await publishContainer(igId, token, containerData.id);
}

export async function publishToInstagram(
  igId: string,
  token: string,
  caption: string,
  imageUrls: string[]
): Promise<PublishResult> {
  if (imageUrls.length === 0) return { success: false, error: 'Nessuna immagine fornita' };
  if (imageUrls.length === 1) return await publishSingleImage(igId, token, caption, imageUrls[0]);
  return await publishCarousel(igId, token, caption, imageUrls);
}

/**
 * Publish a single story (image only, no caption — Instagram ignores it).
 * Stories live 24h after publishing.
 */
export async function publishStory(
  igId: string,
  token: string,
  imageUrl: string
): Promise<PublishResult> {
  const containerData = await igFetch(
    `https://graph.instagram.com/${API_VERSION}/${igId}/media`,
    token,
    'POST',
    { image_url: imageUrl, media_type: 'STORIES' }
  );
  if (containerData.error) return { success: false, error: containerData.error.message };
  return await publishContainer(igId, token, containerData.id);
}
