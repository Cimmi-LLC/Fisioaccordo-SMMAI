import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publishSingleImage, publishCarousel } from '../_shared/instagramPublish.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // --- JWT Authentication ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorizzato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorizzato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const verified_user_id = user.id

    const body = await req.json()
    const { connection_id, platform, content, image_url, carousel_urls } = body
    console.log('meta-publish request:', JSON.stringify({ connection_id, platform, has_image: !!image_url, carousel_count: carousel_urls?.length }))

    if (!connection_id || !platform || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parametri mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read decrypted token via security-definer RPC (token is encrypted at rest).
    const { data: connRows, error: connError } = await supabase
      .rpc('get_meta_connection_token', { p_connection_id: connection_id })

    const connection = Array.isArray(connRows) ? connRows[0] : null

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connessione non trovata' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connection.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connessione non attiva' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the connection belongs to the authenticated user (IDOR protection)
    if (connection.user_id !== verified_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorizzato' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return errorResponse('Token scaduto. Riconnetti Instagram dalle impostazioni.', 401)
    }

    const accessToken = connection.page_access_token
    const igId = connection.instagram_business_id

    if (!accessToken) {
      return errorResponse('Token non disponibile (configurazione Vault mancante)', 500)
    }

    if (platform === 'facebook') {
      return errorResponse('La pubblicazione su Facebook non è supportata con Instagram Business Login.', 400)
    }

    if (platform !== 'instagram') {
      return errorResponse('Piattaforma non supportata', 400)
    }

    if (!igId) {
      return errorResponse('Nessun account Instagram collegato', 400)
    }

    // Carousel post
    if (carousel_urls && carousel_urls.length > 1) {
      const result = await publishCarousel(igId, accessToken, content, carousel_urls)
      if (!result.success) return errorResponse(result.error || 'Pubblicazione fallita')
      return new Response(
        JSON.stringify({ success: true, post_id: result.postId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single image post
    if (!image_url) {
      return errorResponse('Instagram richiede almeno un\'immagine', 400)
    }

    const result = await publishSingleImage(igId, accessToken, content, image_url)
    if (!result.success) return errorResponse(result.error || 'Pubblicazione fallita')
    return new Response(
      JSON.stringify({ success: true, post_id: result.postId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta publish error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
