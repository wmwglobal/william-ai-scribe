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
    // Enhanced rate limiting with multiple identifiers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientId = forwarded || realIp || 'unknown';
    
    if (!checkRateLimit(clientId)) {
      console.warn('Rate limit exceeded for client:', clientId);
      return new Response('Rate limit exceeded. Please try again later.', { 
        status: 429, 
        headers: { ...responseHeaders, 'Retry-After': '60' }
      });
    }
    
    const { session_id, session_secret, audio_base64, model } = await req.json();

    if (!session_id || !session_secret || !audio_base64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id, session_secret, audio_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify session using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_secret, created_at')
      .eq('id', session_id)
      .eq('session_secret', session_secret)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h TTL
      .single();

    if (sessionError || !session) {
      const errorMsg = sessionError?.message?.includes('No rows') ? 'Session expired, please start a new session' : 'Invalid session credentials';
      console.error('Session verification failed:', sessionError?.message);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 401, headers: { 
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json' 
        } }
      );
    }

    console.log('Session verified successfully:', session_id);

    // Check payload size (limit to 10MB base64 ≈ 7.5MB original)
    if (audio_base64.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Audio file too large. Maximum 10MB base64 allowed.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Decode base64 to binary
    const binaryString = atob(audio_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and form data
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model || 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    
    // Add language parameter for better accuracy
    formData.append('language', 'en');

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ASR service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Making request to Groq with model:', model || 'whisper-large-v3-turbo');
    console.log('Audio blob size:', audioBlob.size);

    // Call Groq's OpenAI-compatible audio transcriptions endpoint
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Speech recognition failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const transcribedText = groqData.text || '';

    const duration = Date.now() - startTime;
    console.log(`ASR completed in ${duration}ms, text length: ${transcribedText.length}, session: ${session_id}`); // Log without PII

    return new Response(
      JSON.stringify({ 
        text: transcribedText,
        duration_ms: duration,
        model: model || 'whisper-large-v3-turbo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in speech_to_text_groq function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});