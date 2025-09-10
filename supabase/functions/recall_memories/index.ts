import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Security Configuration
const ALLOWED_ORIGINS = [
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev',
  'http://localhost:8080',
  'https://localhost:8080',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the updated generate_embeddings Edge Function
    const response = await supabase.functions.invoke('generate_embeddings', {
      body: { texts: [text] }
    });

    if (response.error) {
      console.warn('generate_embeddings function failed, using fallback:', response.error);
      return generateFallbackEmbedding(text);
    }

    // Handle new response format with provider info
    if (response.data?.embeddings?.[0]) {
      const embedding = response.data.embeddings[0];
      const provider = response.data.provider || 'unknown';
      const dimensions = response.data.dimensions || embedding.length;
      
      console.log(`Generated embedding using ${provider} (${dimensions}d)`);
      return embedding;
    }

    console.warn('No embedding returned from generate_embeddings, using fallback');
    return generateFallbackEmbedding(text);
  } catch (error) {
    console.warn('Error calling generate_embeddings function, using fallback:', error);
    return generateFallbackEmbedding(text);
  }
}

// Simple fallback embedding generation
function generateFallbackEmbedding(text: string): number[] {
  // Default to HuggingFace dimensions (1024) or fallback to OpenAI (1536)
  const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'huggingface';
  const dimensions = embeddingProvider === 'huggingface' ? 1024 : 1536;
  
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, i) => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % dimensions;
    vector[index] = Math.sin(hash + i) * 0.5 + 0.5;
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
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

    const { query, session_id, session_secret, scopes = ['medium', 'long', 'episodic'], limit = 5 } = await req.json();

    // SECURITY: Always require session validation for accessing memories
    if (!session_id || !session_secret) {
      console.log('Missing required session credentials');
      return new Response(JSON.stringify({ error: 'Session credentials required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate session credentials and TTL
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, created_at, session_secret, visitor_id, created_by')
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

    console.log(`Recalling memories for validated session: [REDACTED]`);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'huggingface';

    // SECURITY: Only filter by validated session_id - never trust client-provided user_id or visitor_id
    const recallQuery = supabase
      .from('memories')
      .select('*, embedding_provider, embedding_hf')
      .eq('session_id', session_id)
      .in('scope', scopes)
      .order('importance', { ascending: false })
      .limit(limit * 2); // Get more to allow for filtering by compatible embeddings

    const { data: memories, error } = await recallQuery;

    if (error) {
      console.error('Error fetching memories:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate semantic similarity for memories with compatible embeddings
    const memoriesWithSimilarity = memories?.map(memory => {
      let memoryEmbedding = null;
      let similarity = memory.importance / 10; // Default fallback to importance-based ranking
      
      // Determine which embedding to use based on current provider and available embeddings
      if (embeddingProvider === 'huggingface' && memory.embedding_hf) {
        memoryEmbedding = memory.embedding_hf;
      } else if (embeddingProvider === 'openai' && memory.embedding) {
        memoryEmbedding = memory.embedding;
      } else if (memory.embedding_hf) {
        // Fallback to HuggingFace if available
        memoryEmbedding = memory.embedding_hf;
      } else if (memory.embedding) {
        // Fallback to OpenAI if available
        memoryEmbedding = memory.embedding;
      }
      
      // Only calculate similarity if embeddings are compatible (same dimensions)
      if (memoryEmbedding && queryEmbedding && memoryEmbedding.length === queryEmbedding.length) {
        similarity = calculateCosineSimilarity(queryEmbedding, memoryEmbedding);
      } else if (memoryEmbedding && queryEmbedding) {
        console.warn(`Dimension mismatch: query(${queryEmbedding.length}) vs memory(${memoryEmbedding.length})`);
      }
      
      return { ...memory, similarity, embedding_used: memoryEmbedding ? 'vector' : 'importance' };
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