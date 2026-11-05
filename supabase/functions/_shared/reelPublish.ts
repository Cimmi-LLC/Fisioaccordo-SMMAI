// Reel Instagram lato server: collega il flusso puro di _shared/brand/reel.ts
// a Supabase (riga di published_posts, bucket reel-videos) e all'API di
// Instagram. Usato da meta-publish («Pubblica ora») e da
// process-scheduled-posts (cron ogni 2 minuti).

import { API_VERSION, igFetch } from "./instagramPublish.ts";
import {
  avviaReel,
  avanzaReel,
  REEL_BUCKET,
  type Esito,
  type IgErrore,
  type ReelIO,
  type ReelRiga,
} from "./brand/reel.ts";

// I client delle funzioni non hanno i tipi del database: si lavora senza schema.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Client = any;

export const REEL_COLONNE =
  "id, user_id, content, hashtags, video_path, cover_path, thumb_offset_ms, share_to_feed, attempts, status, ig_container_id, container_created_at, connection_id";

export interface RigaReelDb extends ReelRiga {
  user_id: string;
  connection_id: string | null;
}

/** Instagram a volte risponde con una pagina HTML: la trattiamo come errore temporaneo. */
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ig(url: string, token: string, method = "GET", body?: Record<string, unknown>): Promise<any> {
  try {
    return await igFetch(url, token, method, body);
  } catch (e) {
    return { error: { code: 2, message: e instanceof Error ? e.message : "Risposta non valida" } as IgErrore };
  }
}

function creaIo(supabase: Client, riga: RigaReelDb, igId: string, token: string): ReelIO {
  const base = `https://graph.instagram.com/${API_VERSION}`;
  return {
    ora: () => new Date(),
    urlFirmato: async (path, secondi) => {
      const { data, error } = await supabase.storage.from(REEL_BUCKET).createSignedUrl(path, secondi);
      if (error || !data?.signedUrl) throw new Error(error?.message || "URL firmato non creato");
      return data.signedUrl;
    },
    creaContainer: async (parametri) => {
      const r = await ig(`${base}/${igId}/media`, token, "POST", parametri);
      return r?.error ? { error: r.error } : { id: r?.id };
    },
    statoContainer: async (id) => {
      const r = await ig(`${base}/${id}?fields=status_code,status`, token);
      return r?.error ? { error: r.error } : { status_code: r?.status_code, status: r?.status };
    },
    pubblica: async (id) => {
      const r = await ig(`${base}/${igId}/media_publish`, token, "POST", { creation_id: id });
      return r?.error ? { error: r.error } : { id: r?.id };
    },
    aggiorna: async (campi, condizioni) => {
      let q = supabase.from("published_posts").update(campi).eq("id", riga.id);
      if (condizioni?.seStato) q = q.eq("status", condizioni.seStato);
      if (condizioni?.claimLiberoPrimaDi) {
        q = q.or(`publish_claimed_at.is.null,publish_claimed_at.lt."${condizioni.claimLiberoPrimaDi}"`);
      }
      const { data, error } = await q.select("id");
      if (error) {
        console.error("reel aggiorna", riga.id, error.message);
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    },
  };
}

async function segnaFallito(supabase: Client, riga: RigaReelDb, messaggio: string): Promise<Esito> {
  await supabase
    .from("published_posts")
    .update({ status: "failed", error_message: messaggio, publish_claimed_at: null, updated_at: new Date().toISOString() })
    .eq("id", riga.id);
  return { esito: "fallito", errore: messaggio };
}

/**
 * Un giro su una riga reel: se è 'scheduled' crea il container, se è
 * 'processing' controlla lo stato e pubblica quando Instagram ha finito.
 */
export async function giroReel(supabase: Client, riga: RigaReelDb): Promise<Esito> {
  // Difesa in profondità: i file devono stare nella cartella del proprietario
  // (la riga è aggiornabile dall'utente via RLS).
  const prefisso = riga.user_id + "/";
  for (const p of [riga.video_path, riga.cover_path]) {
    if (p && !p.startsWith(prefisso)) return segnaFallito(supabase, riga, "Il video non appartiene a questo account.");
  }
  if (!riga.connection_id) return segnaFallito(supabase, riga, "Nessun profilo Instagram scelto per questo Reel.");

  const { data: connRows, error: connErr } = await supabase
    .rpc("get_meta_connection_token", { p_connection_id: riga.connection_id });
  const conn = Array.isArray(connRows) ? connRows[0] : null;
  if (connErr || !conn) return segnaFallito(supabase, riga, "Profilo Instagram non trovato: ricollegalo da Impostazioni.");
  if (conn.user_id !== riga.user_id) return segnaFallito(supabase, riga, "Il profilo Instagram non appartiene a questo account.");
  if (!conn.is_active) return segnaFallito(supabase, riga, "Il profilo Instagram è scollegato: ricollegalo da Impostazioni.");
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    return segnaFallito(supabase, riga, "Il collegamento con Instagram è scaduto: ricollega il profilo da Impostazioni.");
  }
  if (!conn.instagram_business_id || !conn.page_access_token) {
    return segnaFallito(supabase, riga, "Il profilo Instagram non è collegato bene: ricollegalo da Impostazioni.");
  }

  const io = creaIo(supabase, riga, conn.instagram_business_id, conn.page_access_token);
  return riga.status === "processing" ? avanzaReel(riga, io) : avviaReel(riga, io);
}

/** Rilegge la riga (per il secondo passaggio di «Pubblica ora»). */
export async function leggiRigaReel(supabase: Client, id: string): Promise<RigaReelDb | null> {
  const { data } = await supabase.from("published_posts").select(REEL_COLONNE).eq("id", id).maybeSingle();
  return (data as RigaReelDb) || null;
}
