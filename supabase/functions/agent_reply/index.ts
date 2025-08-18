import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const groqApiKey = Deno.env.get('GROQ_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for AI William
const SYSTEM_PROMPT = `You are AI William, William White's AI twin. 

PERSONALITY: Concise, pragmatic, curious, outcome-focused. Think like a seasoned tech executive with deep AI/ML expertise.

GOALS: 
1) Detect intent + key entities accurately
2) Ask 1-2 targeted follow-up questions to qualify opportunities
3) Route to appropriate next steps (calls, materials, etc.)
4) Generate structured extraction data for lead scoring

CONSTRAINTS:
- Keep responses under 100 words
- Never invent pricing or firm commitments
- If asked for human, escalate immediately
- Always use the save_extract function with your analysis

BACKGROUND: William is a seasoned AI/ML leader with experience at SiriusXM, Pandora, and other major platforms. Expert in personalization, recommendation systems, content discovery, and scaling AI products.

RESPONSE STYLE:
- Direct and professional
- Ask smart qualifying questions
- Reference specific outcomes when relevant
- Guide toward concrete next steps

INTRODUCTION BEHAVIOR:
- If this is the first message, introduce yourself as "I'm William MacDonald White, an AI/ML executive"
- Mention it's ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} and you're here to help
- Ask who they are and what brings them here today
- Be warm but professional in your greeting`;

async function callGroqChat(messages: any[], model: string = 'llama-3.3-70b-versatile', systemPrompt: string, sessionId: string, supabase: any) {
  const response = await supabase.functions.invoke('groq_chat', {
    body: {
      messages,
      model,
      systemPrompt,
      session_id: sessionId
    }
  });

  if (response.error) {
    throw new Error(`Groq API error: ${response.error.message}`);
  }

  return response.data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { session_id, user_message, session_secret } = await req.json();
    
    if (!session_id || !user_message || !session_secret) {
      return new Response(JSON.stringify({ error: 'session_id, user_message, and session_secret required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, serviceRole);
    
    // Verify session authorization
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('session_secret', session_secret)
      .single();

    if (sessionError || !session) {
      console.error('Invalid session authorization:', sessionError?.message);
      return new Response(JSON.stringify({ error: 'Invalid session' }), { 
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    console.log(`Processing message for session ${session_id}:`, user_message?.substring(0, 50) + '...');

    // Save user utterance
    const { data: userUtterance } = await supabase
      .from('utterances')
      .insert({
        session_id,
        speaker: 'visitor',
        text: user_message
      })
      .select('id')
      .single();

    // Get conversation history
    const { data: utterances } = await supabase
      .from('utterances')
      .select('speaker, text, ts')
      .eq('session_id', session_id)
      .order('ts', { ascending: true })
      .limit(20);

    // Format messages for Groq
    const messages = (utterances || []).map(u => ({
      role: u.speaker === 'agent' ? 'assistant' : 'user',
      content: u.text
    }));

    // Check if this is the first conversation (no previous agent responses)
    const isFirstMessage = !utterances?.some(u => u.speaker === 'agent');
    
    // Add context about first interaction to system prompt if needed
    let contextualPrompt = SYSTEM_PROMPT;
    if (isFirstMessage) {
      contextualPrompt += `

IMPORTANT: This is the first message from this visitor. You must:
1. Introduce yourself properly as William MacDonald White
2. Mention today's date (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})
3. Ask who they are and what brings them here
4. Be warm and welcoming while staying professional`;
    }

    // Call Groq
    const groqResponse = await callGroqChat(messages, 'llama-3.3-70b-versatile', contextualPrompt, session_id, supabase);
    const agentText = groqResponse.text;

    // Save agent utterance
    const { data: agentUtterance } = await supabase
      .from('utterances')
      .insert({
        session_id,
        speaker: 'agent',
        text: agentText
      })
      .select('id')
      .single();

    // For now, skip function calling since Groq response structure is different
    // TODO: Implement intent detection and lead scoring separately
    let extractData = null;

    // Generate TTS audio using supabase client instead of manual fetch
    let audioBase64 = null;
    try {
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text_to_speech', {
        body: {
          text: agentText,
          session_id: session_id
        }
      });

      if (!ttsError && ttsData) {
        audioBase64 = ttsData.audio_base64;
      } else {
        console.error('TTS generation failed:', ttsError?.message);
      }
    } catch (error) {
      console.error('TTS generation error:', error);
    }

    return new Response(JSON.stringify({
      text: agentText,
      extract: extractData,
      audio_base64: audioBase64,
      session_id
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in agent_reply:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Agent reply failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});