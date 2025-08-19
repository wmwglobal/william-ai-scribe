import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, session_id, visitor_id, user_id, scopes = ['medium', 'long', 'episodic'], limit = 5 } = await req.json();

    console.log(`Recalling memories for query: "${query}", session_id: ${session_id}`);

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