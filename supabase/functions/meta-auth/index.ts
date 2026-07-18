import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const API_VERSION = 'v22.0'

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

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
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
    // Use verified user ID from JWT — never trust client-supplied user_id
    const verified_user_id = user.id

    const { code, redirect_uri } = await req.json()

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parametri mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appId = Deno.env.get('INSTAGRAM_APP_ID') || Deno.env.get('INSTAGRAM_APP_ID')
    const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')

    if (!appId) {
      return new Response(
        JSON.stringify({ success: false, error: 'META_APP_ID non configurato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
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

    // Step 2: Try to exchange for long-lived token
    let finalToken = shortLivedToken
    let tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    let tokenType = 'short-lived'

    // Try POST first, then GET as fallback
    for (const method of ['POST', 'GET']) {
      try {
        console.log(`Tentativo scambio long-lived token (${method})...`)
        const params = new URLSearchParams({
          grant_type: 'ig_exchange_token',
          client_secret: appSecret,
          access_token: shortLivedToken
        })

        let longLivedRes: Response
        if (method === 'POST') {
          longLivedRes = await fetch('https://graph.instagram.com/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
          })
        } else {
          longLivedRes = await fetch(`https://graph.instagram.com/access_token?${params}`)
        }

        const longLivedData = await longLivedRes.json()
        console.log(`Long-lived token (${method}) status:`, longLivedRes.status, JSON.stringify(longLivedData).substring(0, 200))

        if (longLivedData.access_token) {
          finalToken = longLivedData.access_token
          const expiresIn = longLivedData.expires_in || 5184000
          tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
          tokenType = 'long-lived'
          console.log('Long-lived token ottenuto con successo via', method, ', scade tra', expiresIn, 'secondi')
          break
        }
      } catch (e) {
        console.warn(`Long-lived token (${method}) fallito:`, e.message)
      }
    }

    if (tokenType === 'short-lived') {
      console.warn('Fallback: uso short-lived token (1 ora)')
    }

    // Step 3: Get Instagram user profile
    let igUsername = null
    let igBusinessId = instagramUserId
    let accountType = 'BUSINESS'

    // Try multiple approaches for profile fetch
    const profileUrls = [
      `https://graph.instagram.com/${API_VERSION}/me?fields=user_id,username,account_type,name&access_token=${finalToken}`,
      `https://graph.instagram.com/me?fields=user_id,username,account_type,name&access_token=${finalToken}`,
    ]

    for (const url of profileUrls) {
      try {
        console.log('Profile fetch tentativo:', url.substring(0, 80) + '...')
        const profileRes = await fetch(url)
        const profileData = await profileRes.json()

        if (profileData.error) {
          console.warn('Profile fetch fallito:', profileData.error.message)
          continue
        }

        igUsername = profileData.username || null
        igBusinessId = instagramUserId || profileData.user_id?.toString() || profileData.id
        accountType = profileData.account_type || 'BUSINESS'
        console.log('Profilo ottenuto:', igUsername, accountType)
        break
      } catch (e) {
        console.warn('Profile fetch exception:', e.message)
      }
    }

    // Step 3.5: Block personal accounts
    if (accountType === 'PERSONAL') {
      console.warn('Account personale rilevato, blocco connessione')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account Instagram personale non supportato. Converti il tuo account in Business o Creator dalle impostazioni di Instagram, poi riprova.',
          error_type: 'PERSONAL_ACCOUNT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Save to database via RPC that encrypts the token at rest.
    // NEVER write tokens through the table directly — always via upsert_meta_connection.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: rpcError } = await supabase.rpc('upsert_meta_connection', {
      p_user_id: verified_user_id,
      p_page_access_token: finalToken,
      p_instagram_business_id: igBusinessId,
      p_instagram_username: igUsername,
      p_token_expires_at: tokenExpiresAt,
      p_facebook_user_id: null,
      p_page_id: null,
      p_page_name: null,
    })

    if (rpcError) {
      // Log message WITHOUT the token; never leak secrets in logs.
      console.error('Database insert error:', rpcError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Errore salvataggio connessione' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Connessione salvata con successo: @${igUsername}, token type: ${tokenType}, igId: ${igBusinessId}`)

    return new Response(
      JSON.stringify({
        success: true,
        instagram_username: igUsername,
        account_type: accountType,
        token_type: tokenType,
        needs_username: !igUsername
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
