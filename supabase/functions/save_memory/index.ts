import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Security Configuration
const ALLOWED_ORIGINS = [
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev',
  'http://localhost:8080',
  'https://localhost:8080'
];

// Rate limiting storage
const rateLimitMap = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 20; // Max 20 requests per minute (lower for write operations)
  
  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, { count: 1, windowStart: now });
    return true;
  }
  
  const clientData = rateLimitMap.get(clientId);
  if (now - clientData.windowStart > windowMs) {
    rateLimitMap.set(clientId, { count: 1, windowStart: now });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (!origin && !referer) return false;
  
  const urlToCheck = origin || new URL(referer!).origin;
  return ALLOWED_ORIGINS.includes(urlToCheck);
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security validations
    if (!validateOrigin(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized origin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    'unknown';
    
    if (!checkRateLimit(clientId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      session_id, 
      session_secret,
      user_id, 
      visitor_id, 
      scope, 
      content, 
      summary, 
      importance = 5, 
      tags = [] 
    } = await req.json();

    // Validate session if session_id provided
    if (session_id && session_secret) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, created_at, session_secret')
        .eq('id', session_id)
        .eq('session_secret', session_secret)
        .single();

      if (sessionError || !session) {
        console.log('Session validation failed');
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check session TTL (24 hours)
      const sessionAge = Date.now() - new Date(session.created_at).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) {
        console.log('Session expired');
        return new Response(JSON.stringify({ error: 'Session expired' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Saving memory: scope=${scope}, session: ${session_id ? '[REDACTED]' : 'none'}`);

    // Generate embedding for the summary or content
    const textForEmbedding = summary || (typeof content === 'string' ? content : JSON.stringify(content));
    const embedding = await generateEmbedding(textForEmbedding);

    // Save the memory
    const { data: memory, error } = await supabase
      .from('memories')
      .insert({
        session_id,
        user_id,
        visitor_id,
        scope,
        content,
        summary,
        importance,
        tags,
        embedding,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving memory:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Memory saved with ID: ${memory.id}`);

    return new Response(JSON.stringify({ 
      memory,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save_memory function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});