import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE')!;
const llmApiKey = Deno.env.get('OPENAI_API_KEY')!;

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
- Guide toward concrete next steps`;

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
    const { session_id, user_message } = await req.json();
    
    if (!session_id || !user_message) {
      return new Response(JSON.stringify({ error: 'session_id and user_message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    console.log(`Processing message for session ${session_id}:`, user_message);

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

    // Format messages for OpenAI
    const messages = (utterances || []).map(u => ({
      role: u.speaker === 'agent' ? 'assistant' : 'user',
      content: u.text
    }));

    // Call Groq
    const groqResponse = await callGroqChat(messages, 'llama-3.3-70b-versatile', SYSTEM_PROMPT, session_id, supabase);
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

    // Generate TTS audio
    let audioBase64 = null;
    try {
      const ttsResponse = await fetch(`${supabaseUrl}/functions/v1/text_to_speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRole}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: agentText,
          session_id: session_id
        })
      });

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        audioBase64 = ttsData.audio_base64;
      } else {
        console.error('TTS generation failed:', await ttsResponse.text());
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