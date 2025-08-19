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
    const { 
      session_id, 
      user_id, 
      visitor_id, 
      scope, 
      content, 
      summary, 
      importance = 5, 
      tags = [] 
    } = await req.json();

    console.log(`Saving memory: scope=${scope}, session_id=${session_id}`);

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