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

    const appId = '3382844873466520'
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

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
    )
    const longLivedData = await longLivedRes.json()

    if (longLivedData.error) {
      console.error('Long-lived token error:', longLivedData.error)
      return new Response(
        JSON.stringify({ success: false, error: longLivedData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const longLivedToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Step 3: Get Instagram user profile
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,name&access_token=${longLivedToken}`
    )
    const profileData = await profileRes.json()

    if (profileData.error) {
      console.error('Profile fetch error:', profileData.error)
      return new Response(
        JSON.stringify({ success: false, error: profileData.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const igUsername = profileData.username || null
    const igBusinessId = instagramUserId || profileData.user_id?.toString() || profileData.id

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
        page_access_token: longLivedToken, // Store the IG long-lived token here
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

    return new Response(
      JSON.stringify({
        success: true,
        instagram_username: igUsername,
        account_type: profileData.account_type
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
