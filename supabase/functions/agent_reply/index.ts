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

async function callOpenAI(messages: any[], sessionId: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${llmApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      functions: [
        {
          name: 'save_extract',
          description: 'Save conversation analysis and lead scoring data',
          parameters: {
            type: 'object',
            properties: {
              intent: {
                type: 'string',
                enum: ['consulting_inquiry', 'collaboration', 'media_request', 'speaking_request', 'job_opportunity', 'product_feedback', 'partnership_vendor', 'advice_request', 'supporter_fan']
              },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              entities: {
                type: 'object',
                properties: {
                  org_name: { type: 'string' },
                  person_name: { type: 'string' },
                  role: { type: 'string' },
                  budget_range: { type: 'string' },
                  timeline: { type: 'string' },
                  use_case: { type: 'string' },
                  contact_email: { type: 'string' }
                }
              },
              followup_actions: {
                type: 'array',
                items: { type: 'string' }
              },
              lead_score: { type: 'number', minimum: 0, maximum: 100 }
            },
            required: ['intent', 'confidence']
          }
        }
      ],
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return await response.json();
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

    // Call OpenAI
    const completion = await callOpenAI(messages, session_id);
    const reply = completion.choices[0].message;
    const agentText = reply.content;

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

    // Process function call if present
    let extractData = null;
    if (reply.function_call?.name === 'save_extract') {
      try {
        const functionArgs = JSON.parse(reply.function_call.arguments);
        extractData = functionArgs;

        // Save extract to database
        await supabase.from('extracts').insert({
          session_id,
          utterance_id: agentUtterance?.id,
          intent: extractData.intent,
          confidence: extractData.confidence,
          entities: extractData.entities || {},
          followup_actions: extractData.followup_actions || [],
          lead_score: extractData.lead_score || 0
        });

        // Update session with latest scoring
        await supabase.from('sessions').update({
          final_intent: extractData.intent,
          lead_score: extractData.lead_score || 0
        }).eq('id', session_id);

        console.log(`Extracted data for session ${session_id}:`, extractData);

      } catch (error) {
        console.error('Error processing function call:', error);
      }
    }

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