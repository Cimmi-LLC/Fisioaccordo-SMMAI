import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri, user_id } = await req.json()

    if (!code || !redirect_uri || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parametri mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appId = '1685995206180695'
    const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')

    if (!appSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'App Secret non configurato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Exchange code for short-lived token via Instagram API
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
        code: code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error_type || tokenData.error_message) {
      console.error('Token exchange error:', tokenData)
      return new Response(
        JSON.stringify({ success: false, error: tokenData.error_message || 'Errore scambio token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const shortLivedToken = tokenData.access_token
    const instagramUserId = tokenData.user_id?.toString()
    console.log('Short-lived token ottenuto, user_id:', instagramUserId)

    // Step 2: Try to exchange for long-lived token (best effort, non-blocking)
    let finalToken = shortLivedToken
    let tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour default
    let tokenType = 'short-lived'

    try {
      console.log('Tentativo scambio long-lived token (POST)...')
      const longLivedRes = await fetch('https://graph.instagram.com/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'ig_exchange_token',
          client_secret: appSecret,
          access_token: shortLivedToken
        })
      })
      const longLivedData = await longLivedRes.json()
      console.log('Long-lived token response status:', longLivedRes.status)

      if (longLivedData.access_token) {
        finalToken = longLivedData.access_token
        const expiresIn = longLivedData.expires_in || 5184000
        tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
        tokenType = 'long-lived'
        console.log('Long-lived token ottenuto con successo, scade tra', expiresIn, 'secondi')
      } else {
        console.warn('Long-lived token non ottenuto, risposta:', JSON.stringify(longLivedData))
        console.warn('Fallback: uso short-lived token (1 ora)')
      }
    } catch (e) {
      console.warn('Long-lived token exchange fallito, uso short-lived:', e.message)
    }

    // Step 3: Get Instagram user profile (best effort - non-blocking)
    let igUsername = null
    let igBusinessId = instagramUserId  // dal Step 1, sempre disponibile
    let accountType = 'BUSINESS'

    try {
      const profileRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,name&access_token=${finalToken}`
      )
      const profileData = await profileRes.json()

      if (profileData.error) {
        console.warn('Profile fetch fallito, salvo senza username:', profileData.error.message)
      } else {
        igUsername = profileData.username || null
        igBusinessId = instagramUserId || profileData.user_id?.toString() || profileData.id
        accountType = profileData.account_type || 'BUSINESS'
        console.log('Profilo ottenuto:', igUsername, accountType)
      }
    } catch (e) {
      console.warn('Profile fetch exception, salvo senza username:', e.message)
    }

    // Step 4: Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Deactivate existing connections for this user
    await supabase
      .from('meta_connections')
      .update({ is_active: false })
      .eq('user_id', user_id)

    // Insert new connection (using instagram fields, no Facebook page needed)
    const { error: insertError } = await supabase
      .from('meta_connections')
      .insert({
        user_id,
        facebook_user_id: null,
        page_id: null,
        page_name: null,
        page_access_token: finalToken,
        instagram_business_id: igBusinessId,
        instagram_username: igUsername,
        token_expires_at: tokenExpiresAt,
        is_active: true
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Errore salvataggio connessione' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Connessione salvata con successo: @${igUsername}, token type: ${tokenType}`)

    return new Response(
      JSON.stringify({
        success: true,
        instagram_username: igUsername,
        account_type: accountType,
        token_type: tokenType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Meta auth error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
