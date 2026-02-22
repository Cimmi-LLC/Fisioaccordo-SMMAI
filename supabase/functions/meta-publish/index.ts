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

    const accessToken = connection.page_access_token // This is the IG long-lived token
    const igId = connection.instagram_business_id

    if (platform === 'facebook') {
      return new Response(
        JSON.stringify({ success: false, error: 'La pubblicazione su Facebook non è supportata con Instagram Business Login. Usa la funzione copia/incolla per Facebook.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (platform !== 'instagram') {
      return new Response(
        JSON.stringify({ success: false, error: 'Piattaforma non supportata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!igId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nessun account Instagram collegato' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Carousel post
    if (carousel_urls && carousel_urls.length > 1) {
      return await publishCarousel(igId, accessToken, content, carousel_urls)
    }

    // Single image post
    if (!image_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instagram richiede almeno un\'immagine' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return await publishSingleImage(igId, accessToken, content, image_url)

  } catch (error) {
    console.error('Meta publish error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function publishSingleImage(igId: string, token: string, caption: string, imageUrl: string) {
  // Step 1: Create media container via graph.instagram.com
  const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token })
  })
  const containerData = await containerRes.json()

  if (containerData.error) {
    return errorResponse(containerData.error.message)
  }

  // Step 2: Publish
  return await publishContainer(igId, token, containerData.id)
}

async function publishCarousel(igId: string, token: string, caption: string, urls: string[]) {
  const childIds: string[] = []

  for (const url of urls) {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token })
    })
    const data = await res.json()
    if (data.error) {
      return errorResponse(`Errore carousel item: ${data.error.message}`)
    }
    childIds.push(data.id)
  }

  // Create carousel container
  const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'CAROUSEL', children: childIds, caption, access_token: token })
  })
  const containerData = await containerRes.json()

  if (containerData.error) {
    return errorResponse(containerData.error.message)
  }

  return await publishContainer(igId, token, containerData.id)
}

async function publishContainer(igId: string, token: string, creationId: string) {
  const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token })
  })
  const publishData = await publishRes.json()

  if (publishData.error) {
    return errorResponse(publishData.error.message)
  }

  return new Response(
    JSON.stringify({ success: true, post_id: publishData.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
