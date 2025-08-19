import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Starting token generation...');
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('🔑 ❌ OPENAI_API_KEY not found in environment');
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('🔑 API key found, length:', OPENAI_API_KEY.length);

    console.log('🔑 Creating OpenAI ephemeral token...');

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: "alloy",
        instructions: "You are AI William, a helpful assistant. Be conversational and engaging. Respond naturally to voice conversations."
      }),
    });

    console.log('🔑 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔑 ❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("🔑 ✅ Session created successfully");
    console.log("🔑 Response keys:", Object.keys(data));
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("🔑 ❌ Error details:", error);
    console.error("🔑 ❌ Error stack:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});