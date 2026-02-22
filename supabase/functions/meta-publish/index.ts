import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { connection_id, platform, content, image_url, carousel_urls } = await req.json()

    if (!connection_id || !platform || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parametri mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get connection from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: connection, error: connError } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('is_active', true)
      .single()

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connessione non trovata o non attiva' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pageAccessToken = connection.page_access_token
    const pageId = connection.page_id
    const igId = connection.instagram_business_id

    if (platform === 'facebook') {
      return await publishToFacebook(pageId, pageAccessToken, content, image_url)
    } else if (platform === 'instagram') {
      if (!igId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nessun account Instagram Business collegato a questa pagina' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await publishToInstagram(igId, pageAccessToken, content, image_url, carousel_urls)
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Piattaforma non supportata' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta publish error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function publishToFacebook(pageId: string, token: string, message: string, imageUrl?: string) {
  let result

  if (imageUrl) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption: message, access_token: token })
    })
    result = await res.json()
  } else {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: token })
    })
    result = await res.json()
  }

  if (result.error) {
    return new Response(
      JSON.stringify({ success: false, error: result.error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, post_id: result.id || result.post_id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function publishToInstagram(igId: string, token: string, caption: string, imageUrl?: string, carouselUrls?: string[]) {
  // Carousel
  if (carouselUrls && carouselUrls.length > 1) {
    const childIds: string[] = []

    for (const url of carouselUrls) {
      const res = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token })
      })
      const data = await res.json()
      if (data.error) {
        return new Response(
          JSON.stringify({ success: false, error: `Errore carousel item: ${data.error.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      childIds.push(data.id)
    }

    // Create carousel container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'CAROUSEL', children: childIds, caption, access_token: token })
    })
    const containerData = await containerRes.json()

    if (containerData.error) {
      return new Response(
        JSON.stringify({ success: false, error: containerData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Publish
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: token })
    })
    const publishData = await publishRes.json()

    if (publishData.error) {
      return new Response(
        JSON.stringify({ success: false, error: publishData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, post_id: publishData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Single image
  if (!imageUrl) {
    return new Response(
      JSON.stringify({ success: false, error: 'Instagram richiede almeno un\'immagine' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Step 1: Create media container
  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token })
  })
  const containerData = await containerRes.json()

  if (containerData.error) {
    return new Response(
      JSON.stringify({ success: false, error: containerData.error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Step 2: Publish
  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token })
  })
  const publishData = await publishRes.json()

  if (publishData.error) {
    return new Response(
      JSON.stringify({ success: false, error: publishData.error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, post_id: publishData.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
