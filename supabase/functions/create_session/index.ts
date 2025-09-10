import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Security: Allowed origins for enhanced protection
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'https://suyervjawrmbyyxetblv.supabase.co',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev',
  'https://id-preview--2e10a6c0-0b90-4a50-8d27-471a5969124f.lovable.app',
  'https://williammwhite.com',
  'https://www.williammwhite.com'
];

// Rate limiting map for basic protection
const rateLimitMap = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = rateLimitMap.get(clientId) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = clientRequests.filter((time: number) => now - time < 60000);
  
  // Allow max 30 requests per minute per client (more restrictive than agent_reply)
  if (recentRequests.length >= 30) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(clientId, recentRequests);
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Enhanced security: Origin and rate limiting validation
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientId = forwarded || realIp || 'unknown';
  
  // Check origin/referer (enforce allowlist for security)
  const isValidOrigin = origin && ALLOWED_ORIGINS.includes(origin);
  const isValidReferer = referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
  
  if (!isValidOrigin && !isValidReferer) {
    console.warn('Blocked request from unauthorized origin:', origin, 'referer:', referer, 'client:', clientId);
    return new Response('Forbidden: Invalid origin', { 
      status: 403,
      headers: { 
        'Access-Control-Allow-Origin': origin || '',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }
  
  // Dynamic CORS headers based on validated origin
  const dynamicCorsHeaders = {
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: dynamicCorsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: dynamicCorsHeaders 
    });
  }

  // Rate limiting
  if (!checkRateLimit(clientId)) {
    console.warn('Rate limit exceeded for client:', clientId);
    return new Response('Rate limit exceeded. Please try again later.', { 
      status: 429, 
      headers: { ...dynamicCorsHeaders, 'Retry-After': '60' }
    });
  }

  try {
    const { visitor_id, consent = false } = await req.json();
    const supabase = createClient(supabaseUrl, serviceRole);

    console.log('Creating session for visitor:', visitor_id?.substring(0, 8) + '...'); // PII minimization

    // Generate session secret for authorization
    const session_secret = crypto.randomUUID();

    const { data, error } = await supabase
      .from('sessions')
      .insert({ 
        visitor_id: visitor_id || crypto.randomUUID(), 
        consent,
        channel: 'web',
        session_secret
      })
      .select('id, session_secret')
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
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
      session_secret: data.session_secret,
      realtime_token 
    }), {
      headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create_session:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
    });
  }
});