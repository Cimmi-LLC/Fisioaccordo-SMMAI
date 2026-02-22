import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, style, format, imagePreferences } = await req.json();

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "slides array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const visualStyle = style || "modern, clean, professional";
    const isVertical = format === "vertical";
    const dimensions = isVertical ? "1080x1920, vertical 9:16 format" : "1080x1080, square format";

    // Generate images SEQUENTIALLY with retry to avoid rate limiting
    const results: { index: number; url: string | null; error: string | null }[] = [];

    for (let index = 0; index < slides.length; index++) {
      const slide = slides[index];
      console.log(`Starting generation for slide ${index + 1}/${slides.length}`);

      let result = await generateSingleImage(slide, index, slides.length, dimensions, visualStyle, imagePreferences, LOVABLE_API_KEY, supabaseAdmin);

      // Retry once if failed (except payment errors)
      if (result.error && result.error !== "payment_required") {
        console.log(`Slide ${index} failed (${result.error}), retrying in 2s...`);
        await delay(2000);
        result = await generateSingleImage(slide, index, slides.length, dimensions, visualStyle, imagePreferences, LOVABLE_API_KEY, supabaseAdmin);
      }

      results.push(result);

      // If payment required, stop generating more
      if (result.error === "payment_required") {
        console.log("Payment required, stopping generation");
        break;
      }

      // Delay between images to avoid rate limiting
      if (index < slides.length - 1) {
        console.log(`Waiting 1.5s before next slide...`);
        await delay(1500);
      }
    }

    const paymentRequired = results.some((r) => r.error === "payment_required");
    if (paymentRequired) {
      return new Response(JSON.stringify({ error: "Crediti AI esauriti. Aggiungi crediti al workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imagesResult = results
      .sort((a, b) => a.index - b.index)
      .map((r) => ({ url: r.url, error: r.error }));

    const successCount = imagesResult.filter((r) => r.url).length;
    console.log(`Generation complete: ${successCount}/${slides.length} images generated successfully`);

    return new Response(JSON.stringify({ images: imagesResult }), {
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

async function generateSingleImage(
  slide: { title: string; body: string; theme?: string },
  index: number,
  totalSlides: number,
  dimensions: string,
  visualStyle: string,
  imagePreferences: string | undefined,
  apiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ index: number; url: string | null; error: string | null }> {
  const preferencesBlock = imagePreferences ? `\nUser preferences from past feedback: ${imagePreferences}\nPlease follow these preferences closely.` : '';
  const prompt = `Create a professional social media image (${dimensions}).
Theme: ${slide.theme || slide.title}
Context: ${slide.body?.substring(0, 100) || slide.title}
Style: ${visualStyle}
Requirements: Clean background, bold typography-friendly layout, vibrant colors, Instagram-optimized, no text on image, abstract/conceptual visual that represents the topic.${preferencesBlock}
Slide ${index + 1} of ${totalSlides}.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      if (status === 429) {
        console.error(`Rate limited on slide ${index}`);
        return { index, url: null, error: "rate_limited" };
      }
      if (status === 402) {
        console.error(`Payment required on slide ${index}`);
        return { index, url: null, error: "payment_required" };
      }
      console.error(`Error generating image for slide ${index}: ${status}`, errorText);
      return { index, url: null, error: "generation_failed" };
    }

    const data = await response.json();

    // Priority 1: message.images[]
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const base64Url = images[0].image_url?.url;
      if (base64Url) {
        console.log(`Slide ${index}: Found image, uploading to storage...`);
        const publicUrl = await uploadBase64ToStorage(supabaseAdmin, base64Url, index);
        if (publicUrl) return { index, url: publicUrl, error: null };
      }
    }

    // Priority 2: message.parts[].inline_data
    const parts = data.choices?.[0]?.message?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inline_data) {
          const base64Url = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          const publicUrl = await uploadBase64ToStorage(supabaseAdmin, base64Url, index);
          if (publicUrl) return { index, url: publicUrl, error: null };
        }
      }
    }

    // Priority 3: direct URL
    const content = data.choices?.[0]?.message?.content;
    if (content && content.startsWith("http")) {
      return { index, url: content.trim(), error: null };
    }

    console.error(`Slide ${index}: No image found in response`);
    return { index, url: null, error: "no_image_in_response" };
  } catch (err) {
    console.error(`Exception generating image for slide ${index}:`, err);
    return { index, url: null, error: "exception" };
  }
}

async function uploadBase64ToStorage(
  supabaseAdmin: ReturnType<typeof createClient>,
  base64Url: string,
  index: number
): Promise<string | null> {
  try {
    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `slide_${Date.now()}_${index}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("carousel-images")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error(`Upload error for slide ${index}:`, uploadError);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage.from("carousel-images").getPublicUrl(fileName);
    console.log(`Slide ${index} uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`Storage upload exception for slide ${index}:`, err);
    return null;
  }
}
