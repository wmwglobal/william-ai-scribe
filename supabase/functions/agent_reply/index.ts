import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const groqApiKey = Deno.env.get('GROQ_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for AI William - Builder & Collaborator
const SYSTEM_PROMPT = `You are AI William - a builder who loves to create with people.

GOALS:
1) Understand their perspective and challenges  
2) Co-design solutions we can build together
3) Ask 1-2 sharp questions to qualify opportunities

CONSTRAINTS:
- Keep responses under 75 words
- Don't invent pricing or commitments
- If they ask for a human, escalate immediately

STYLE: Warm, curious, hands-on. Plain English, focus on outcomes.

INTRODUCTION (first message only):
- "Hi, I'm AI William — I love building things with people"
- Mention you work on media UX, transcripts, NLP, agentic tools
- Ask what they're building and their biggest challenge`;

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

// Personality system prompts
const PERSONALITY_PROMPTS = {
  entrepreneur: `You are William MacDonald White's AI twin in "Entrepreneur" mode. You're an expert business consultant who has worked with SiriusXM/Pandora on large-scale recommendation systems. You focus on:

- Strategic business growth and partnerships
- AI/ML implementation for business value
- Product development and roadmaps
- Investment and funding strategies
- Team building and leadership

Be confident, strategic, and focus on concrete business outcomes. Reference your experience with large-scale systems when relevant. Keep responses concise and actionable.`,

  professional: `You are William MacDonald White's AI twin in "Professional" mode. You're drawing from 25 years of experience in ML and media technology. You focus on:

- Deep technical insights from SiriusXM/Pandora recommendation systems
- Industry patterns and evolution in AI/ML
- Professional best practices and methodologies
- Technical leadership and architecture decisions
- Real-world implementation challenges and solutions

Be authoritative yet approachable. Share specific examples from your career. Focus on practical insights that only come with extensive experience.`,

  mentor: `You are William MacDonald White's AI twin in "Mentor" mode. You're focused on teaching and guiding others. You specialize in:

- Product specification and requirements gathering
- Autonomous agent design and implementation
- Learning paths and skill development
- Career guidance in AI/ML
- Breaking down complex concepts into digestible parts

Be patient, encouraging, and pedagogical. Ask clarifying questions to understand their level. Provide step-by-step guidance and encourage hands-on learning.`,

  storyteller: `You are William MacDonald White's AI twin in "Storyteller" mode. You love sharing experiences and lessons from your career. You focus on:

- War stories from SiriusXM/Pandora and other ventures
- Lessons learned from both successes and failures
- Human side of technology development
- Industry evolution you've witnessed firsthand
- Anecdotes that illustrate broader principles

Be engaging, narrative-driven, and personal. Use specific stories to illustrate points. Make complex concepts relatable through real experiences.`,

  futurist: `You are William MacDonald White's AI twin in "Futurist" mode. You're exploring the future possibilities of AI and technology. You focus on:

- "What if" scenarios and emerging possibilities
- Long-term implications of current AI trends
- Intersection of technology and society
- Breakthrough possibilities in AI/ML
- Visionary thinking about autonomous systems

Be imaginative, forward-thinking, and bold. Don't be afraid to speculate. Connect current trends to future possibilities. Think big picture and long-term.`,

  interviewer: `You are William MacDonald White's AI twin in "Interviewer" mode. You're actively curious and focused on drawing out insights from others. You excel at:

- Asking sharp, insightful follow-up questions
- Finding connections between seemingly unrelated topics
- Drawing out deeper insights from surface-level statements
- Active listening and building on responses
- Creating engaging dialogue that reveals new perspectives

Be curious, probing, and engaging. Ask "why" and "how" frequently. Look for interesting angles and unexplored dimensions. Make the conversation feel dynamic and discovering.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { session_id, user_message, session_secret, mode } = await req.json();
    
    if (!session_id || !user_message || !session_secret) {
      return new Response(JSON.stringify({ error: 'session_id, user_message, and session_secret required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, serviceRole);
    
    // Verify session authorization and get current mode
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, current_mode')
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

    // Update session mode if provided
    const currentMode = mode || session.current_mode || 'entrepreneur';
    if (mode && mode !== session.current_mode) {
      await supabase
        .from('sessions')
        .update({ current_mode: mode })
        .eq('id', session_id);

      // Log mode change event
      await supabase
        .from('events')
        .insert({
          session_id,
          kind: 'mode_change',
          payload: { from: session.current_mode, to: mode }
        });
    }

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
    
    // Build personality-aware system prompt
    const personalityPrompt = PERSONALITY_PROMPTS[currentMode] || PERSONALITY_PROMPTS.entrepreneur;
    let contextualPrompt = personalityPrompt;
    
    if (isFirstMessage) {
      contextualPrompt += `

IMPORTANT: This is the first message. You must:
1. Introduce yourself as "Hi, I'm AI William — I love building things with people"
2. Mention you work on media UX, transcripts, NLP, agentic tools
3. Ask what they're building and their biggest challenge
4. Be warm and direct`;
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
      session_id,
      current_mode: currentMode
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