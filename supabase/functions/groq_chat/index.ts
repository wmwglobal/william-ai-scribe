import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Allowed origins for production security
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',  'http://localhost:3000',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be replaced with origin validation
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Origin validation for security
  const origin = req.headers.get('origin');
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin);
  
  if (!isAllowedOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*'
  };

  console.log('groq_chat called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      console.error('Missing GROQ_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }), 
        { 
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, model = 'gpt-oss-20b', systemPrompt, session_id } = await req.json();
    console.log('Request body:', { model, systemPrompt, session_id, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }), 
        { 
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build messages array with system prompt
    const chatMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ];

    console.log('Calling Groq API with model:', model);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status}` }), 
        { 
          status: response.status,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Groq API response received');

    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      console.error('No content in Groq response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }), 
        { 
          status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        text: assistantMessage,
        model: model,
        usage: data.usage
      }), 
      {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in groq_chat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});