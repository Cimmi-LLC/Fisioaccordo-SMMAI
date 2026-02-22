import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, style } = await req.json();

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "slides array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const visualStyle = style || "modern, clean, professional";

    // Generate images for each slide
    const imagePromises = slides.map(async (slide: { title: string; body: string; theme?: string }, index: number) => {
      const prompt = `Create a professional social media carousel slide image (1080x1080, square format).
Theme: ${slide.theme || slide.title}
Context: ${slide.body?.substring(0, 100) || slide.title}
Style: ${visualStyle}
Requirements: Clean background, bold typography-friendly layout, vibrant colors, Instagram-optimized, no text on image, abstract/conceptual visual that represents the topic.
Slide ${index + 1} of ${slides.length}.`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) {
            console.error(`Rate limited on slide ${index}`);
            return { index, url: null, error: "rate_limited" };
          }
          if (status === 402) {
            console.error(`Payment required on slide ${index}`);
            return { index, url: null, error: "payment_required" };
          }
          console.error(`Error generating image for slide ${index}:`, response.status);
          return { index, url: null, error: "generation_failed" };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        // The image model returns base64 or URL depending on the response
        // Check for inline_data (base64 image)
        const parts = data.choices?.[0]?.message?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inline_data) {
              const base64Url = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
              return { index, url: base64Url, error: null };
            }
          }
        }

        // If content contains a URL
        if (content && (content.startsWith("http") || content.includes("data:image"))) {
          return { index, url: content.trim(), error: null };
        }

        // Fallback: no image generated
        return { index, url: null, error: "no_image_in_response" };
      } catch (err) {
        console.error(`Exception generating image for slide ${index}:`, err);
        return { index, url: null, error: "exception" };
      }
    });

    const results = await Promise.all(imagePromises);

    // Check for rate limit / payment errors
    const rateLimited = results.some((r) => r.error === "rate_limited");
    const paymentRequired = results.some((r) => r.error === "payment_required");

    if (paymentRequired) {
      return new Response(JSON.stringify({ error: "Crediti AI esauriti. Aggiungi crediti al workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rateLimited && results.every((r) => r.error === "rate_limited")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Riprova tra qualche secondo." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const images = results
      .sort((a, b) => a.index - b.index)
      .map((r) => ({ url: r.url, error: r.error }));

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-carousel-images error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
