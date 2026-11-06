// social-auth — collegamento degli account TikTok e YouTube a un brand.
//
// Azioni (POST, con il JWT dell'utente):
//   status      quali piattaforme sono attive sul server (segreti presenti)
//   start       { platform, brand_id, return_to, origin } → { url } da aprire
//   callback    { platform, code, state } → salva la connessione cifrata
//   disconnect  { connection_id } → revoca il permesso e scollega
//
// Il «state» del giro OAuth sta in social_oauth_states: lega il ritorno da
// TikTok/Google all'utente e al brand che hanno cliccato «Collega».

import { adminClient, assertBrandOwnership, requireAuth } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import {
  PLATFORM_LABEL,
  buildAuthUrl,
  isSocialPlatform,
  safeReturnTo,
  socialRedirectUri,
} from "../_shared/social/socialCore.ts";
import {
  appOrigin,
  exchangeCode,
  fetchProfile,
  loadConnection,
  platformCredentials,
  revokeToken,
} from "../_shared/socialApi.ts";

const STATE_TTL_MS = 10 * 60 * 1000;

/** Il ritorno va sull'app pubblicata; in sviluppo anche su localhost. */
function pickOrigin(requested: unknown): string {
  const prod = appOrigin();
  if (typeof requested !== "string") return prod;
  if (requested === prod) return prod;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requested)) return requested;
  return prod;
}

function randomState(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { success: false, error: auth.error }, auth.status);
    const userId = auth.userId;
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "status") {
      return jsonResponse(req, {
        success: true,
        platforms: { tiktok: !!platformCredentials("tiktok"), youtube: !!platformCredentials("youtube") },
      });
    }

    if (action === "start") {
      const platform = body.platform;
      if (!isSocialPlatform(platform)) return jsonResponse(req, { success: false, error: "Piattaforma non valida" }, 400);
      const creds = platformCredentials(platform);
      if (!creds) {
        return jsonResponse(req, { success: false, error: `${PLATFORM_LABEL[platform]} non configurato sul server` }, 503);
      }
      let brandId: string | null = null;
      if (body.brand_id) {
        const own = await assertBrandOwnership(admin, userId, body.brand_id);
        if (!own.ok) return jsonResponse(req, { success: false, error: own.error }, own.status);
        brandId = body.brand_id;
      }
      const redirectUri = socialRedirectUri(pickOrigin(body.origin), platform);
      const state = randomState();
      // i biglietti vecchi dell'utente non servono più
      await admin.from("social_oauth_states").delete().eq("user_id", userId)
        .lt("created_at", new Date(Date.now() - STATE_TTL_MS).toISOString());
      const { error } = await admin.from("social_oauth_states").insert({
        state,
        user_id: userId,
        brand_id: brandId,
        platform,
        return_to: safeReturnTo(body.return_to),
        redirect_uri: redirectUri,
      });
      if (error) return jsonResponse(req, { success: false, error: "Errore avvio collegamento" }, 500);
      return jsonResponse(req, { success: true, url: buildAuthUrl(platform, creds.clientId, redirectUri, state) });
    }

    if (action === "callback") {
      const { platform, code, state } = body;
      if (!isSocialPlatform(platform) || typeof code !== "string" || typeof state !== "string") {
        return jsonResponse(req, { success: false, error: "Parametri mancanti" }, 400);
      }
      const { data: st } = await admin.from("social_oauth_states").select("*").eq("state", state).maybeSingle();
      // il biglietto si usa una volta sola
      await admin.from("social_oauth_states").delete().eq("state", state);
      if (!st || st.user_id !== userId || st.platform !== platform) {
        return jsonResponse(req, { success: false, error: "Collegamento non riconosciuto: riprova dal pulsante" }, 400);
      }
      const returnTo = safeReturnTo(st.return_to);
      if (Date.parse(st.created_at) < Date.now() - STATE_TTL_MS) {
        return jsonResponse(req, { success: false, error: "Collegamento scaduto: riprova dal pulsante", brand_id: st.brand_id, return_to: returnTo }, 400);
      }

      const tokens = await exchangeCode(platform, code, st.redirect_uri);
      const profile = await fetchProfile(platform, tokens.accessToken);
      const externalId = profile.externalId || tokens.openId || "";
      if (!externalId) throw new Error("Account non riconosciuto");

      // senza brand indicato: il brand attivo, poi il primo creato
      let brandId: string | null = st.brand_id;
      if (!brandId) {
        const { data: settings } = await admin.from("user_settings").select("active_brand_id").eq("user_id", userId).maybeSingle();
        const { data: brands } = await admin.from("brands").select("id").eq("user_id", userId).order("created_at", { ascending: true });
        const ids = (brands || []).map((b: { id: string }) => b.id);
        brandId = ids.includes(settings?.active_brand_id) ? settings!.active_brand_id : (ids[0] ?? null);
      }

      const { error: rpcErr } = await admin.rpc("upsert_social_connection", {
        p_user_id: userId,
        p_brand_id: brandId,
        p_platform: platform,
        p_external_account_id: externalId,
        p_username: profile.username,
        p_display_name: profile.displayName,
        p_avatar_url: profile.avatarUrl,
        p_access_token: tokens.accessToken,
        p_refresh_token: tokens.refreshToken,
        p_token_expires_at: tokens.expiresAt,
        p_refresh_expires_at: tokens.refreshExpiresAt,
        p_scopes: tokens.scopes,
        p_extra: profile.extra,
      });
      if (rpcErr) {
        console.error("salvataggio connessione social:", rpcErr.message);
        return jsonResponse(req, { success: false, error: "Errore salvataggio connessione", brand_id: brandId, return_to: returnTo }, 500);
      }
      if (platform === "youtube" && !tokens.refreshToken) {
        console.warn("Google non ha restituito il refresh token: il collegamento durerà un'ora");
      }
      console.log(`${platform} collegato: ${profile.username || profile.displayName} → brand ${brandId}`);
      return jsonResponse(req, {
        success: true,
        platform,
        brand_id: brandId,
        return_to: returnTo,
        username: profile.username,
        display_name: profile.displayName,
      });
    }

    if (action === "disconnect") {
      const id = body.connection_id;
      if (typeof id !== "string") return jsonResponse(req, { success: false, error: "connection_id mancante" }, 400);
      const { data: row } = await admin.from("social_connections").select("id, user_id, platform").eq("id", id).maybeSingle();
      if (!row || row.user_id !== userId) return jsonResponse(req, { success: false, error: "Connessione non trovata" }, 404);
      try {
        const conn = await loadConnection(admin, id);
        await revokeToken(conn.platform, conn.accessToken);
      } catch (e) {
        console.warn("revoca saltata:", (e as Error).message);
      }
      const { error } = await admin.from("social_connections")
        .update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return jsonResponse(req, { success: false, error: "Impossibile scollegare" }, 500);
      return jsonResponse(req, { success: true });
    }

    return jsonResponse(req, { success: false, error: "Azione non valida" }, 400);
  } catch (e) {
    console.error("social-auth:", (e as Error).message);
    return jsonResponse(req, { success: false, error: (e as Error).message || "Errore interno" }, 500);
  }
});
