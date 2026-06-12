import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth } from "../_shared/auth.ts";
import { corsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { safeFetch } from "../_shared/ssrf.ts";

// Cap incoming dataUrl payloads at ~12 MB raw base64 (= ~9 MB binary).
const MAX_DATA_URL_BYTES = 12 * 1024 * 1024;

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    // ── 1) Require JWT — reject anonymous calls
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    const verifiedUserId = auth.userId;

    // ── 2) Parse body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: "Body invalido" }, 400);
    }
    const { imageUrl, dataUrl, carouselId, slideIndex } = body as Record<string, unknown>;

    if (!imageUrl && !dataUrl) {
      return jsonResponse(req, { error: "imageUrl o dataUrl richiesto" }, 400);
    }

    // ── 3) Build storage path FROM the verified user.id (not from client input)
    //     This prevents a user from writing into another user's folder.
    const safeCarouselId = typeof carouselId === "string" || typeof carouselId === "number"
      ? String(carouselId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `c_${Date.now()}`
      : `c_${Date.now()}`;
    const idx = typeof slideIndex === "number" && slideIndex >= 0 && slideIndex < 100
      ? slideIndex
      : 0;

    let imageBytes: Uint8Array;
    let contentType: string;

    if (typeof dataUrl === "string") {
      if (dataUrl.length > MAX_DATA_URL_BYTES) {
        return jsonResponse(req, { error: "dataUrl troppo grande" }, 413);
      }
      const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
      if (!match) {
        return jsonResponse(req, { error: "dataUrl non valido o tipo non supportato" }, 400);
      }
      contentType = match[1].toLowerCase();
      try {
        imageBytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      } catch {
        return jsonResponse(req, { error: "Base64 dataUrl invalido" }, 400);
      }
    } else if (typeof imageUrl === "string") {
      // ── 4) SSRF guard: validate URL against whitelist + size cap
      const fetched = await safeFetch(imageUrl, { maxBytes: 10 * 1024 * 1024, timeoutMs: 15_000 });
      if (!fetched.ok) {
        return jsonResponse(req, { error: `Fetch immagine non consentito: ${fetched.error}` }, 400);
      }
      imageBytes = fetched.bytes;
      contentType = fetched.contentType;
      // Only accept image/* content types
      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(contentType)) {
        return jsonResponse(req, { error: `Tipo immagine non supportato: ${contentType}` }, 400);
      }
    } else {
      return jsonResponse(req, { error: "Parametri invalidi" }, 400);
    }

    const ext = contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : "jpg";
    // Path is rooted on the VERIFIED user id — IDOR-proof.
    // First segment = userId so the folder-owner storage policy
    // (foldername[1] = auth.uid()) matches uploads from the client side too.
    const fileName = `${verifiedUserId}/${safeCarouselId}/slide_${idx + 1}_${Date.now()}.${ext}`;

    const supabaseAdmin = adminClient();
    const { error } = await supabaseAdmin.storage
      .from("carousel-images")
      .upload(fileName, imageBytes, { contentType, upsert: true });

    if (error) {
      console.error("Upload fallito:", error.message);
      return jsonResponse(req, { error: "Upload fallito" }, 500);
    }

    // Return {bucket, path}. The caller should persist these and mint a
    // signed URL on demand (publishing, in-app preview).
    // `url` is kept for backward-compat with current callers but points to
    // a short-lived signed URL — never store this URL in DB.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("carousel-images")
      .createSignedUrl(fileName, 60 * 60); // 1h, for immediate preview only
    if (signErr) {
      console.error("Signed URL fallita:", signErr.message);
      return jsonResponse(req, { error: "Signed URL fallita" }, 500);
    }

    return jsonResponse(req, {
      bucket: "carousel-images",
      path: fileName,
      url: signed.signedUrl,
    });
  } catch (e) {
    console.error("save-slide-image error:", e);
    return jsonResponse(req, { error: "Errore interno" }, 500);
  }
});
