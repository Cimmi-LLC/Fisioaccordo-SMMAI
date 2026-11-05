import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validaDidascalia } from "../_shared/brand/reel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      content, hashtags, image_urls, image_paths, image_bucket, connection_id, scheduled_for, media_type,
      // Reel: video (e copertina facoltativa) nel bucket reel-videos
      video_path, cover_path, thumb_offset_ms, share_to_feed,
    } = body;
    const mediaType = media_type === 'story' ? 'story' : media_type === 'reel' ? 'reel' : 'post';
    const isReel = mediaType === 'reel';

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isReel) {
      const userPrefix = user.id + "/";
      if (typeof video_path !== "string" || !video_path) {
        return new Response(JSON.stringify({ error: "Manca il video del Reel" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const p of [video_path, cover_path]) {
        if (p != null && (typeof p !== "string" || !p.startsWith(userPrefix))) {
          return new Response(JSON.stringify({ error: "Path non autorizzato" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const didascalia = validaDidascalia(hashtags ? `${content}\n\n${hashtags}` : content);
      if (didascalia.errori.length > 0) {
        return new Response(JSON.stringify({ error: didascalia.errori[0] }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Prefer new shape (image_paths + image_bucket). Fall back to legacy
    // image_urls for backward compat during the rollout window.
    const usingPaths = Array.isArray(image_paths) && image_paths.length > 0;
    if (!isReel && !usingPaths && (!Array.isArray(image_urls) || image_urls.length === 0)) {
      return new Response(JSON.stringify({ error: "image_paths o image_urls obbligatorio (almeno 1)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (usingPaths) {
      // Ownership check: each path must live in the caller's folder.
      const userPrefix = user.id + "/";
      for (const p of image_paths) {
        if (typeof p !== "string" || !p.startsWith(userPrefix)) {
          return new Response(JSON.stringify({ error: "Path non autorizzato" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!scheduled_for) {
      return new Response(JSON.stringify({ error: "scheduled_for obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return new Response(JSON.stringify({ error: "scheduled_for non valido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (scheduledDate.getTime() <= Date.now() + 60 * 1000) {
      return new Response(JSON.stringify({ error: "Data programmata deve essere almeno 1 minuto nel futuro" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the connection belongs to the user
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("meta_connections")
      .select("id, user_id, is_active")
      .eq("id", connection_id)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connessione Meta non trovata" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (conn.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!conn.is_active) {
      return new Response(JSON.stringify({ error: "Connessione Instagram non attiva" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("published_posts")
      .insert({
        user_id: user.id,
        content,
        hashtags: hashtags || null,
        // Legacy column kept null for new rows; preferred fields are
        // image_paths + image_bucket. The cron resolves them to signed URLs
        // at publish time.
        image_urls: usingPaths || isReel ? null : image_urls,
        image_paths: usingPaths ? image_paths : null,
        image_bucket: usingPaths ? (image_bucket || "carousel-images") : null,
        video_path: isReel ? video_path : null,
        cover_path: isReel && typeof cover_path === "string" ? cover_path : null,
        thumb_offset_ms: isReel && Number.isFinite(thumb_offset_ms) && thumb_offset_ms > 0 ? Math.round(thumb_offset_ms) : null,
        share_to_feed: isReel ? share_to_feed !== false : true,
        platforms: ["instagram"],
        connection_id,
        status: "scheduled",
        scheduled_for: scheduledDate.toISOString(),
        attempts: 0,
        media_type: mediaType,
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert error:", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, post: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("schedule-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
