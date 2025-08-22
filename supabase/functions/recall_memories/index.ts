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
  const maxRequests = 30; // Max 30 requests per minute
  
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

    const { query, session_id, session_secret, visitor_id, user_id, scopes = ['medium', 'long', 'episodic'], limit = 5 } = await req.json();

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

    console.log(`Recalling memories for session: ${session_id ? '[REDACTED]' : 'none'}`);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build the recall query
    let recallQuery = supabase
      .from('memories')
      .select('*')
      .in('scope', scopes)
      .order('importance', { ascending: false })
      .limit(limit);

    // Filter by session, user, or visitor
    if (session_id) {
      recallQuery = recallQuery.eq('session_id', session_id);
    } else if (user_id) {
      recallQuery = recallQuery.eq('user_id', user_id);
    } else if (visitor_id) {
      recallQuery = recallQuery.eq('visitor_id', visitor_id);
    }

    const { data: memories, error } = await recallQuery;

    if (error) {
      console.error('Error fetching memories:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate semantic similarity for memories with embeddings
    const memoriesWithSimilarity = memories?.map(memory => {
      if (memory.embedding && queryEmbedding) {
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(queryEmbedding, memory.embedding);
        return { ...memory, similarity };
      }
      return { ...memory, similarity: memory.importance / 10 }; // Fallback to importance-based ranking
    }) || [];

    // Sort by similarity and importance
    const rankedMemories = memoriesWithSimilarity
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    // Update last_referenced for recalled memories
    if (rankedMemories.length > 0) {
      const memoryIds = rankedMemories.map(m => m.id);
      await supabase
        .from('memories')
        .update({ last_referenced: new Date().toISOString() })
        .in('id', memoryIds);
    }

    console.log(`Recalled ${rankedMemories.length} memories`);

    return new Response(JSON.stringify({ 
      memories: rankedMemories,
      count: rankedMemories.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recall_memories function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}