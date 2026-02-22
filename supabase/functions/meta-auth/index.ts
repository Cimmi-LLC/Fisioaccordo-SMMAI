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
    const { code, redirect_uri, user_id } = await req.json()

    if (!code || !redirect_uri || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parametri mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appId = '1440410323636643'
    const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')

    if (!appSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'App Secret non configurato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${code}`
    
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error)
      return new Response(
        JSON.stringify({ success: false, error: tokenData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const shortLivedToken = tokenData.access_token

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    
    const longLivedRes = await fetch(longLivedUrl)
    const longLivedData = await longLivedRes.json()

    if (longLivedData.error) {
      console.error('Long-lived token error:', longLivedData.error)
      return new Response(
        JSON.stringify({ success: false, error: longLivedData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const longLivedToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000 // 60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Step 3: Get Facebook user info
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${longLivedToken}`)
    const meData = await meRes.json()
    const facebookUserId = meData.id

    // Step 4: Get pages
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`)
    const pagesData = await pagesRes.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nessuna pagina Facebook trovata. Assicurati di essere admin di almeno una pagina.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const page = pagesData.data[0]
    const pageId = page.id
    const pageName = page.name
    const pageAccessToken = page.access_token

    // Step 5: Get Instagram Business account linked to page
    let instagramBusinessId = null
    let instagramUsername = null

    try {
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`)
      const igData = await igRes.json()

      if (igData.instagram_business_account) {
        instagramBusinessId = igData.instagram_business_account.id

        const igProfileRes = await fetch(`https://graph.facebook.com/v21.0/${instagramBusinessId}?fields=username&access_token=${pageAccessToken}`)
        const igProfileData = await igProfileRes.json()
        instagramUsername = igProfileData.username || null
      }
    } catch (e) {
      console.log('Instagram Business account not found, continuing with Facebook only:', e)
    }

    // Step 6: Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Deactivate existing connections for this user
    await supabase
      .from('meta_connections')
      .update({ is_active: false })
      .eq('user_id', user_id)

    // Insert new connection
    const { error: insertError } = await supabase
      .from('meta_connections')
      .insert({
        user_id,
        facebook_user_id: facebookUserId,
        page_id: pageId,
        page_name: pageName,
        page_access_token: pageAccessToken,
        instagram_business_id: instagramBusinessId,
        instagram_username: instagramUsername,
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

    return new Response(
      JSON.stringify({
        success: true,
        page_name: pageName,
        instagram_username: instagramUsername
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
