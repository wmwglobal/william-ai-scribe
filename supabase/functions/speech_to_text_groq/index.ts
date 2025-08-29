import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

// Allowed origins for production security
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.lovableproject.com',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.lovable.app',
  'https://id-preview--2e10a6c0-0b90-4a50-8d27-471a5969124f.lovable.app',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev',
  'https://williammwhite.com'
];

// Rate limiting map (simple in-memory for demo)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be replaced with origin validation
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Basic rate limiting function
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 30; // Max 30 requests per minute
  
  const current = rateLimitMap.get(clientId);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

serve(async (req) => {
  // Origin validation for security
  const origin = req.headers.get('origin');
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin);
  
  console.log('Request received from origin:', origin);
  console.log('Is allowed origin:', isAllowedOrigin);
  
  if (!isAllowedOrigin) {
    console.error('Origin not allowed:', origin);
    return new Response('Forbidden', { status: 403 });
  }

  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    console.log('Function started successfully');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session_id, session_secret, audio_base64, model } = requestBody;

    console.log('Request received with session_id:', session_id);
    console.log('Audio base64 length:', audio_base64?.length || 0);

    if (!session_id || !session_secret || !audio_base64) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id, session_secret, audio_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test: Return a dummy response to see if we can get this far
    console.log('Returning test response');
    return new Response(
      JSON.stringify({ 
        text: 'Test transcription - function is working',
        duration_ms: 100,
        model: model || 'whisper-large-v3-turbo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in speech_to_text_groq function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        name: error.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});