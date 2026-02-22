
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
    console.log('🚀 Instagram Business Auth Edge Function chiamata')
    
    const { code, redirect_uri, user_id } = await req.json()
    console.log('📝 Parametri ricevuti:', { 
      code: code?.substring(0, 10) + '...', 
      redirect_uri,
      user_id: user_id?.substring(0, 8) + '...'
    })
    
    if (!code) {
      throw new Error('Codice di autorizzazione mancante')
    }

    if (!user_id) {
      throw new Error('ID utente mancante')
    }

    // App centralizzata per Instagram Business
    const INSTAGRAM_APP_ID = '1261520952551293'
    const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')
    
    console.log('🔑 App ID centralizzata:', INSTAGRAM_APP_ID)
    console.log('🔑 App Secret presente:', !!INSTAGRAM_APP_SECRET)
    
    if (!INSTAGRAM_APP_SECRET) {
      throw new Error('INSTAGRAM_APP_SECRET non configurato nelle variabili di ambiente')
    }

    console.log('🔄 Scambio codice per access token...')
    
    // Step 1: Scambia il codice per un access token Facebook
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    } + `?client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`)

    const tokenData = await tokenResponse.json()
    console.log('📡 Risposta token Facebook:', { 
      ok: tokenResponse.ok, 
      status: tokenResponse.status,
      hasAccessToken: !!tokenData.access_token 
    })
    
    if (!tokenResponse.ok) {
      console.error('❌ Errore token Facebook:', tokenData)
      throw new Error(tokenData.error?.message || 'Errore ottenimento token Facebook')
    }

    console.log('✅ Token Facebook ottenuto, cerco pagine Instagram...')

    // Step 2: Ottieni le pagine Facebook dell'utente
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`)
    const pagesData = await pagesResponse.json()

    console.log('📄 Pagine trovate:', pagesData.data?.length || 0)

    if (!pagesResponse.ok || !pagesData.data?.length) {
      throw new Error('Nessuna pagina Facebook collegata trovata. Collega prima una pagina Facebook al tuo account Instagram Business.')
    }

    // Step 3: Per ogni pagina, controlla se ha un account Instagram collegato
    let instagramAccount = null
    for (const page of pagesData.data) {
      try {
        const igResponse = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
        const igData = await igResponse.json()
        
        if (igData.instagram_business_account) {
          instagramAccount = {
            instagram_id: igData.instagram_business_account.id,
            page_access_token: page.access_token,
            page_id: page.id,
            page_name: page.name
          }
          break
        }
      } catch (error) {
        console.log(`⚠️ Errore controllo Instagram per pagina ${page.name}:`, error)
      }
    }

    if (!instagramAccount) {
      throw new Error('Nessun account Instagram Business collegato alle tue pagine Facebook. Assicurati di aver collegato il tuo Instagram Business alla pagina Facebook.')
    }

    console.log('📱 Account Instagram Business trovato:', instagramAccount.instagram_id)

    // Step 4: Ottieni informazioni del profilo Instagram
    const profileResponse = await fetch(`https://graph.facebook.com/v18.0/${instagramAccount.instagram_id}?fields=id,username,account_type,media_count,followers_count&access_token=${instagramAccount.page_access_token}`)
    const profileData = await profileResponse.json()

    console.log('👤 Profilo Instagram caricato:', { 
      ok: profileResponse.ok, 
      username: profileData.username,
      account_type: profileData.account_type 
    })

    if (!profileResponse.ok) {
      console.error('❌ Errore profilo Instagram:', profileData)
      throw new Error('Errore caricamento profilo Instagram: ' + (profileData.error?.message || 'Errore sconosciuto'))
    }

    // Step 5: Salva nel database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('💾 Salvo connessione nel database...')

    const profileDataToSave = {
      username: profileData.username,
      account_type: profileData.account_type || 'BUSINESS',
      media_count: profileData.media_count || 0,
      followers_count: profileData.followers_count || 0
    }

    const { error: saveError } = await supabaseAdmin.rpc('upsert_instagram_connection', {
      p_user_id: user_id,
      p_instagram_user_id: profileData.id,
      p_username: profileData.username,
      p_access_token: instagramAccount.page_access_token,
      p_profile_data: profileDataToSave
    })

    if (saveError) {
      console.error('❌ Errore salvataggio connessione:', saveError)
      throw new Error('Errore salvataggio connessione: ' + saveError.message)
    }

    console.log('🎉 Connessione Instagram Business salvata con successo!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: profileDataToSave,
        message: 'Account Instagram Business collegato con successo!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Errore autenticazione Instagram:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
