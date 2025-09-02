import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOTATO_API_KEY = Deno.env.get('BLOTATO_API_KEY');
const BLOTATO_BASE_URL = 'https://api.blotato.com/v1';

interface BlotatoPostRequest {
  content: string;
  platforms: string[];
  images?: string[];
  scheduleFor?: string;
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Blotato Publish Function - Avvio');

    if (!BLOTATO_API_KEY) {
      throw new Error('BLOTATO_API_KEY non configurata');
    }

    const requestData: BlotatoPostRequest = await req.json();
    console.log('📝 Dati ricevuti:', {
      platforms: requestData.platforms,
      hasContent: !!requestData.content,
      hasImages: requestData.images?.length || 0,
      isScheduled: !!requestData.scheduleFor,
      userId: requestData.user_id
    });

    // Valida i dati richiesti
    if (!requestData.content || !requestData.platforms?.length) {
      throw new Error('Contenuto e piattaforme sono obbligatori');
    }

    // Prepara il payload per Blotato API
    const blotatoPayload = {
      content: requestData.content,
      platforms: requestData.platforms,
      ...(requestData.images && requestData.images.length > 0 && { 
        images: requestData.images 
      }),
      ...(requestData.scheduleFor && { 
        schedule_for: requestData.scheduleFor 
      })
    };

    console.log('📡 Invio richiesta a Blotato API:', BLOTATO_BASE_URL);

    // Chiamata all'API di Blotato
    const response = await fetch(`${BLOTATO_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blotatoPayload),
    });

    const responseText = await response.text();
    console.log('📡 Risposta Blotato API:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500) // Log primi 500 caratteri
    });

    if (!response.ok) {
      let errorMessage = `Errore API Blotato: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('Impossibile parsare errore come JSON');
      }
      
      throw new Error(errorMessage);
    }

    const blotatoResult = JSON.parse(responseText);
    console.log('✅ Pubblicazione completata:', blotatoResult.id || 'ID non disponibile');

    // Salva il risultato nel database (opzionale)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      await supabase.from('published_posts').insert({
        user_id: requestData.user_id,
        content: requestData.content,
        platforms: requestData.platforms,
        blotato_post_id: blotatoResult.id,
        status: 'published',
        published_at: new Date().toISOString()
      });
      console.log('📊 Post salvato nel database');
    } catch (dbError) {
      console.warn('⚠️ Errore salvataggio database (non bloccante):', dbError);
    }

    // Risposta di successo
    const successResponse = {
      success: true,
      postId: blotatoResult.id,
      platformResults: blotatoResult.platforms || [],
      message: `Post pubblicato con successo su ${requestData.platforms.join(', ')}`
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Errore Blotato Publish Function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});