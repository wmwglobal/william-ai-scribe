import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { visitor_id, consent = false } = await req.json();
    const supabase = createClient(supabaseUrl, serviceRole);

    console.log('Creating session for visitor:', visitor_id);

    const { data, error } = await supabase
      .from('sessions')
      .insert({ 
        visitor_id: visitor_id || crypto.randomUUID(), 
        consent,
        channel: 'web'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    console.log('Session created:', data.id);

    // Log session start event
    await supabase.from('events').insert({
      session_id: data.id,
      kind: 'session_started',
      payload: { visitor_id, consent }
    });

    // For realtime auth, create a short-lived JWT or use channel auth webhook
    // For now, we'll use a simple token approach
    const realtime_token = crypto.randomUUID();

    return new Response(JSON.stringify({ 
      session_id: data.id, 
      realtime_token 
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create_session:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});