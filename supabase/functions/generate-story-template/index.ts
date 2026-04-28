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
    const { type, brandColor, logoUrl } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isReview = type === "review";
    const colorHex = brandColor || "#554697";

    const prompt = isReview
      ? `Create a professional Instagram Story template background (1080x1920 pixels, vertical 9:16 format) for displaying customer reviews/testimonials of a healthcare clinic.

Design requirements:
- Clean, elegant background with a subtle gradient using the brand color ${colorHex} (use it as a soft glow/gradient, not as solid fill)
- The background should be mostly dark or very light with the brand color ${colorHex} appearing as a subtle radial glow at the top area
- Leave the center and bottom area clean for text (review text, author name, star rating)
- Small decorative elements like subtle quote marks or stars, using the brand color
- Professional, medical/wellness aesthetic
- NO text on the image, only decorative elements
- Top area should have a small empty space where a logo will be placed (about 80x80px area at top center)
- The brand color glow should emanate from behind where the logo sits`
      : `Create a professional Instagram Story template background (1080x1920 pixels, vertical 9:16 format) for a healthcare/physiotherapy clinic.

Design requirements:
- Clean, elegant background with a subtle gradient using the brand color ${colorHex} (use it as a soft glow/gradient, not as solid fill)
- The background should be mostly dark or very light with the brand color ${colorHex} appearing as a subtle radial glow at the top area
- Leave space for: a headline in the upper-third, body text in the middle, and a call-to-action at the bottom
- Subtle decorative geometric shapes or organic curves using the brand color at low opacity
- Professional, medical/wellness aesthetic
- NO text on the image, only background design and decorative elements
- Top area should have a small empty space where a logo will be placed (about 80x80px area at top center)
- The brand color glow should emanate from behind where the logo sits`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts;

    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || "image/png";
          const ext = mimeType.includes("jpeg") ? "jpg" : "png";
          const fileName = `template_${type || "story"}_${Date.now()}.${ext}`;

          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          const { error: uploadError } = await supabaseAdmin.storage
            .from("carousel-images")
            .upload(fileName, imageBytes, { contentType: mimeType, upsert: false });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error("Errore upload immagine");
          }

          const { data: urlData } = supabaseAdmin.storage.from("carousel-images").getPublicUrl(fileName);

          return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    throw new Error("Nessuna immagine generata");
  } catch (e) {
    console.error("generate-story-template error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
