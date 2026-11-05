// Prova in locale del Reel lato server, senza toccare Instagram né il database:
//   npx deno@2 test --no-lock --allow-env supabase/functions/_shared/reelPublish_test.ts
// fetch è sostituito da un Instagram finto che registra le chiamate; il
// client Supabase è un finto che tiene una riga di published_posts in memoria.

import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { giroReel, type RigaReelDb } from "./reelPublish.ts";

type Riga = Record<string, unknown>;

function supabaseFinto(riga: Riga, conn: Riga) {
  const filtri = (campi: Riga | null) => {
    const cond: Array<(r: Riga) => boolean> = [];
    const q = {
      eq(col: string, val: unknown) { cond.push((r) => r[col] === val); return q; },
      or(espr: string) {
        const m = /publish_claimed_at\.lt\."([^"]+)"/.exec(espr);
        cond.push((r) => r.publish_claimed_at == null || (!!m && String(r.publish_claimed_at) < m[1]));
        return q;
      },
      select() {
        const ok = cond.every((c) => c(riga));
        if (ok && campi) Object.assign(riga, campi);
        return Promise.resolve({ data: ok ? [{ id: riga.id }] : [], error: null });
      },
      // update senza select: si applica quando viene atteso
      then(risolvi: (v: unknown) => void) {
        if (cond.every((c) => c(riga)) && campi) Object.assign(riga, campi);
        risolvi({ data: null, error: null });
      },
    };
    return q;
  };
  return {
    from: () => ({ update: (campi: Riga) => filtri(campi) }),
    rpc: () => Promise.resolve({ data: [conn], error: null }),
    storage: {
      from: () => ({
        createSignedUrl: (p: string, s: number) =>
          Promise.resolve({ data: { signedUrl: `https://cktdoq.supabase.co/sign/reel-videos/${p}?ttl=${s}` }, error: null }),
      }),
    },
  };
}

function instagramFinto(stati: string[]) {
  const chiamate: Array<{ metodo: string; url: string; corpo?: Riga }> = [];
  const originale = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    chiamate.push({ metodo: init?.method || "GET", url, corpo });
    let r: unknown = { error: { code: 100, message: "chiamata inattesa" } };
    if (url.includes("/17841400000000000/media_publish")) r = { id: "18000000000000001" };
    else if (url.includes("/17841400000000000/media")) r = { id: "contenitore-1" };
    else if (url.includes("/contenitore-1?fields=status_code,status")) r = { status_code: stati.shift() || "FINISHED" };
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { chiamate, ripristina: () => { globalThis.fetch = originale; } };
}

const UTENTE = "11111111-2222-3333-4444-555555555555";
const connessione = {
  user_id: UTENTE, is_active: true, token_expires_at: "2026-12-30T00:00:00Z",
  instagram_business_id: "17841400000000000", page_access_token: "TOKEN-FINTO",
};

function nuovaRiga(): Riga {
  return {
    id: "riga-1", user_id: UTENTE, connection_id: "conn-1",
    content: "Mal di schiena da mesi?", hashtags: "#fisioterapia #schiena",
    video_path: `${UTENTE}/abc.mp4`, cover_path: null, thumb_offset_ms: 3200, share_to_feed: true,
    attempts: 0, status: "scheduled", ig_container_id: null, container_created_at: null, publish_claimed_at: null,
  };
}

Deno.test("Reel programmato: container REELS, attesa, pubblicazione", async () => {
  const riga = nuovaRiga();
  const sb = supabaseFinto(riga, connessione);
  const ig = instagramFinto(["IN_PROGRESS", "FINISHED"]);
  try {
    // Giro 1 del cron: crea il container.
    assertEquals((await giroReel(sb, { ...riga } as unknown as RigaReelDb)).esito, "in_elaborazione");
    const crea = ig.chiamate[0];
    assertEquals(crea.metodo, "POST");
    assertMatch(crea.url, /graph\.instagram\.com\/v22\.0\/17841400000000000\/media\?access_token=TOKEN-FINTO$/);
    assertEquals(crea.corpo, {
      media_type: "REELS",
      video_url: `https://cktdoq.supabase.co/sign/reel-videos/${UTENTE}/abc.mp4?ttl=7200`,
      caption: "Mal di schiena da mesi?\n\n#fisioterapia #schiena",
      share_to_feed: true,
      thumb_offset: 3200,
    });
    assertEquals(riga.status, "processing");
    assertEquals(riga.ig_container_id, "contenitore-1");

    // Giro 2: ancora in elaborazione, nessuna pubblicazione.
    assertEquals((await giroReel(sb, { ...riga } as unknown as RigaReelDb)).esito, "in_elaborazione");
    assertEquals(ig.chiamate.filter((c) => c.url.includes("media_publish")).length, 0);

    // Giro 3: FINISHED → media_publish.
    const esito = await giroReel(sb, { ...riga } as unknown as RigaReelDb);
    assertEquals(esito, { esito: "pubblicato", mediaId: "18000000000000001" });
    const pubblica = ig.chiamate.find((c) => c.url.includes("media_publish"))!;
    assertEquals(pubblica.corpo, { creation_id: "contenitore-1" });
    assertEquals(riga.status, "published");
    assertEquals(riga.blotato_post_id, "18000000000000001");
  } finally {
    ig.ripristina();
  }
});

Deno.test("Reel con il video di un altro utente: fallisce senza chiamare Instagram", async () => {
  const riga = { ...nuovaRiga(), video_path: "altro-utente/abc.mp4" };
  const ig = instagramFinto([]);
  try {
    const esito = await giroReel(supabaseFinto(riga, connessione), riga as unknown as RigaReelDb);
    assertEquals(esito.esito, "fallito");
    assertEquals(ig.chiamate.length, 0);
  } finally {
    ig.ripristina();
  }
});

Deno.test("Collegamento scaduto: messaggio in italiano per ricollegare", async () => {
  const riga = nuovaRiga();
  const ig = instagramFinto([]);
  try {
    const esito = await giroReel(
      supabaseFinto(riga, { ...connessione, token_expires_at: "2020-01-01T00:00:00Z" }),
      riga as unknown as RigaReelDb,
    );
    assertEquals(esito.esito, "fallito");
    assertMatch(String(riga.error_message), /ricollega il profilo/);
    assertEquals(ig.chiamate.length, 0);
  } finally {
    ig.ripristina();
  }
});
