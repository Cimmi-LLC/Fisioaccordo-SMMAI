import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, dataUrl, userId, carouselId, slideIndex } = await req.json();

    if (!imageUrl && !dataUrl) {
      return new Response(JSON.stringify({ error: "imageUrl o dataUrl richiesto" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let imageBytes: Uint8Array;
    let contentType: string;

    if (dataUrl) {
      const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
      if (!match) throw new Error("dataUrl non valido");
      contentType = match[1];
      imageBytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    } else {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Fetch fallito: ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);
      contentType = resp.headers.get('content-type') || 'image/jpeg';
    }

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const idx = typeof slideIndex === 'number' ? slideIndex : 0;
    const cid = carouselId || Date.now();
    const owner = userId || 'anonymous';
    // Timestamp suffix prevents browser cache hits when swapping
    const fileName = `carousels/${owner}/${cid}/slide_${idx + 1}_${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("carousel-images")
      .upload(fileName, imageBytes, { contentType, upsert: true });

    if (error) throw new Error(`Upload fallito: ${error.message}`);

    const { data: urlData } = supabaseAdmin.storage.from("carousel-images").getPublicUrl(fileName);

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-slide-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
