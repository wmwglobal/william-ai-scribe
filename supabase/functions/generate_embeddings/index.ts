// Edge Function to generate embeddings for demo scripts
// Deploy this to enable full semantic search functionality

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { texts } = await req.json()
    
    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // TODO: Replace with actual embedding service (OpenAI, Hugging Face, etc.)
    // For now, return mock embeddings
    const embeddings = texts.map(text => {
      // Generate a simple hash-based embedding (384 dimensions)
      const vector = new Array(384).fill(0)
      const words = text.toLowerCase().split(/\s+/)
      
      words.forEach((word, i) => {
        const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const index = hash % 384
        vector[index] = Math.sin(hash) * 0.5 + 0.5
      })
      
      // Normalize
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
      return magnitude > 0 ? vector.map(val => val / magnitude) : vector
    })

    return new Response(
      JSON.stringify({ embeddings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})