
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Instagram Auth Edge Function chiamata')
    
    const { code, redirect_uri } = await req.json()
    console.log('📝 Parametri ricevuti:', { code: code?.substring(0, 10) + '...', redirect_uri })
    
    if (!code) {
      throw new Error('Codice di autorizzazione mancante')
    }

    // Ottieni l'App Secret dalle variabili di ambiente di Supabase
    const INSTAGRAM_APP_ID = '1440410323636643' // Il tuo App ID
    const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')
    
    console.log('🔑 App ID:', INSTAGRAM_APP_ID)
    console.log('🔑 App Secret presente:', !!INSTAGRAM_APP_SECRET)
    
    if (!INSTAGRAM_APP_SECRET) {
      throw new Error('INSTAGRAM_APP_SECRET non configurato nelle variabili di ambiente')
    }

    console.log('🔄 Scambio codice per access token...')
    
    // Scambia il codice per un access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
        code: code,
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('📡 Risposta token Instagram:', { 
      ok: tokenResponse.ok, 
      status: tokenResponse.status,
      hasAccessToken: !!tokenData.access_token 
    })
    
    if (!tokenResponse.ok) {
      console.error('❌ Errore token Instagram:', tokenData)
      throw new Error(tokenData.error_message || 'Errore ottenimento token')
    }

    console.log('✅ Token ottenuto, carico profilo...')

    // Ottieni informazioni del profilo
    const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${tokenData.access_token}`)
    const profileData = await profileResponse.json()

    console.log('👤 Risposta profilo Instagram:', { 
      ok: profileResponse.ok, 
      username: profileData.username,
      account_type: profileData.account_type 
    })

    if (!profileResponse.ok) {
      console.error('❌ Errore profilo Instagram:', profileData)
      throw new Error('Errore caricamento profilo Instagram')
    }

    // Se è un account business, ottieni anche i follower
    let followersCount = null;
    if (profileData.account_type === 'BUSINESS') {
      try {
        console.log('📊 Account business rilevato, carico follower...')
        const followersResponse = await fetch(`https://graph.instagram.com/${profileData.id}?fields=followers_count&access_token=${tokenData.access_token}`)
        const followersData = await followersResponse.json()
        if (followersResponse.ok) {
          followersCount = followersData.followers_count
          console.log('👥 Follower caricati:', followersCount)
        }
      } catch (error) {
        console.log('⚠️ Non è stato possibile ottenere il conteggio dei follower:', error)
      }
    }

    // Salva la connessione nel database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ottieni l'utente dal token JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token di autorizzazione mancante')
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('❌ Errore autenticazione utente:', userError)
      throw new Error('Utente non autenticato')
    }

    console.log('💾 Salvo connessione nel database...')

    // Salva la connessione
    const profileDataToSave = {
      username: profileData.username,
      account_type: profileData.account_type,
      media_count: profileData.media_count,
      followers_count: followersCount
    }

    const { error: saveError } = await supabaseAdmin.rpc('upsert_instagram_connection', {
      p_user_id: user.id,
      p_instagram_user_id: profileData.id,
      p_username: profileData.username,
      p_access_token: tokenData.access_token,
      p_profile_data: profileDataToSave
    })

    if (saveError) {
      console.error('❌ Errore salvataggio connessione:', saveError)
      throw new Error('Errore salvataggio connessione: ' + saveError.message)
    }

    console.log('🎉 Connessione Instagram salvata con successo!')

    return new Response(
      JSON.stringify({ success: true, profile: profileDataToSave }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Errore autenticazione Instagram:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
