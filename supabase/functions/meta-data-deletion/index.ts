import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlDecode(str: string): Uint8Array {
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '='
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifySignedRequest(signedRequest: string, appSecret: string): Promise<{ user_id: string } | null> {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;

    // Verify HMAC-SHA256 signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const actualSig = base64UrlDecode(encodedSig);

    // Compare signatures
    if (actualSig.length !== new Uint8Array(expectedSig).length) return null;
    const expected = new Uint8Array(expectedSig);
    let match = true;
    for (let i = 0; i < actualSig.length; i++) {
      if (actualSig[i] !== expected[i]) match = false;
    }
    if (!match) return null;

    // Decode payload
    const decodedPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return decodedPayload;
  } catch (e) {
    console.error('Error verifying signed request:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET');
    if (!appSecret) {
      throw new Error('INSTAGRAM_APP_SECRET not configured');
    }

    // Meta sends form-encoded data
    const formData = await req.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      return new Response(JSON.stringify({ error: 'Missing signed_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await verifySignedRequest(signedRequest, appSecret);
    if (!data) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const facebookUserId = data.user_id;
    const confirmationCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    // Delete user data from meta_connections
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('meta_connections')
      .update({ is_active: false })
      .eq('facebook_user_id', facebookUserId);

    console.log(`Data deletion processed for Facebook user: ${facebookUserId}, code: ${confirmationCode}`);

    const statusUrl = `https://social-generator-fisioaccordo.lovable.app/deletion-status?id=${confirmationCode}`;

    return new Response(JSON.stringify({
      url: statusUrl,
      confirmation_code: confirmationCode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
