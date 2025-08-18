import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const groqApiKey = Deno.env.get('GROQ_API_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Function calling schema for conversation analysis
const EXTRACT_FUNCTION_SCHEMA = {
  type: "function",
  function: {
    name: "save_extract",
    description: "Analyze the conversation to extract intent, entities, and lead scoring information",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: [
            "consulting_inquiry",
            "collaboration", 
            "media_request",
            "speaking_request",
            "job_opportunity",
            "product_feedback",
            "partnership_vendor",
            "advice_request",
            "supporter_fan"
          ],
          description: "Primary intent of the conversation"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in the intent classification"
        },
        entities: {
          type: "object",
          properties: {
            org_name: { type: "string", description: "Organization name" },
            person_name: { type: "string", description: "Person's name" },
            role: { type: "string", description: "Person's job title/role" },
            budget_range: { type: "string", description: "Mentioned budget or project size" },
            timeline: { type: "string", description: "Project timeline or urgency" },
            use_case: { type: "string", description: "Specific use case or project description" },
            channel: { type: "string", description: "How they found us" },
            geo: { type: "string", description: "Geographic location" },
            contact_email: { type: "string", description: "Email address if provided" },
            permissions: {
              type: "object",
              properties: {
                email_opt_in: { type: "boolean", description: "Opted in for email updates" },
                quote_ok: { type: "boolean", description: "OK to be quoted publicly" }
              }
            }
          },
          additionalProperties: false
        },
        followup_actions: {
          type: "array",
          items: { type: "string" },
          description: "Suggested follow-up actions"
        }
      },
      required: ["intent", "confidence", "entities"]
    }
  }
};

// Lead scoring function
function scoreLead(entities: any, intent: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const txt = `${entities.role ?? ''} ${entities.use_case ?? ''}`.toLowerCase();

  // Senior title bonus (+30 points)
  if (/vp|vice president|chief|head|director|founder|ceo|cto|cmo/i.test(txt)) { 
    s += 30; 
    reasons.push('senior_title'); 
  }
  
  // Budget indicators (+20 points)
  if (/\b(50k|100k|200k|500k|\$50,?000|\$100,?000|\$200,?000|\$500,?000)/i.test(entities.budget_range ?? '')) {
    s += 20; 
    reasons.push('budget_>=50k');
  }
  
  // Timeline urgency (+15 points)
  if (/(now|urgent|asap|6\s*weeks?|q[1-4]|quarter|this month|next month)/i.test(entities.timeline ?? '')) { 
    s += 15; 
    reasons.push('urgent_timeline'); 
  }
  
  // Warm intro indicators (+10 points)
  if (/(intro|introduction|referred|referral|recommendation|@(google|microsoft|apple|amazon|meta|netflix)\.com)/i.test(JSON.stringify(entities))) { 
    s += 10; 
    reasons.push('warm_intro'); 
  }
  
  // Strategic alignment with William's expertise (+10 points)
  if (/(rag|retrieval|personalization|content routing|ai strategy|machine learning|recommendation|search|discovery|growth|scale)/i.test(entities.use_case ?? '')) { 
    s += 10; 
    reasons.push('aligned_thesis'); 
  }
  
  // High-value company indicators (+10 points)
  if (/(enterprise|fortune|funded|series|ipo|billion|million users)/i.test(entities.org_name ?? '')) {
    s += 10;
    reasons.push('enterprise_client');
  }
  
  // Negative indicators - vendor/low-value
  if (/(agency|reseller|partnership|vendor|discount|cheap|free|student|academic)/i.test(entities.use_case ?? '')) { 
    s -= 15; 
    reasons.push('vendor_pitch'); 
  }
  
  // General interest (not immediate business)
  if (intent === 'supporter_fan' || intent === 'advice_request') { 
    s -= 10; 
    reasons.push('general_interest'); 
  }
  
  // Academic/research inquiries
  if (/(research|thesis|dissertation|university|academic|student)/i.test(entities.use_case ?? '')) {
    s -= 10;
    reasons.push('academic_inquiry');
  }

  // Ensure score stays within bounds
  s = Math.max(0, Math.min(100, s));
  
  return { score: s, reasons };
}

// Enhanced OpenAI function calling
async function callOpenAIWithFunctions(messages: any[], systemPrompt: string, sessionId: string) {
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: [EXTRACT_FUNCTION_SCHEMA],
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 500
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  return data;
}

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

    // Format messages for AI
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

    // Use OpenAI for function calling and extract generation
    let agentText: string;
    let extractData: any = null;

    try {
      console.log('Calling OpenAI with function calling for session:', session_id);
      const openaiResponse = await callOpenAIWithFunctions(messages, contextualPrompt, session_id);
      
      const choice = openaiResponse.choices[0];
      agentText = choice.message.content || '';
      
      // Check if function was called for extraction
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        if (toolCall.function.name === 'save_extract') {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            const leadScore = scoreLead(functionArgs.entities || {}, functionArgs.intent);
            
            extractData = {
              ...functionArgs,
              lead_score: leadScore.score,
              scoring_reasons: leadScore.reasons
            };
            
            console.log('Generated extract:', extractData);
          } catch (parseError) {
            console.error('Error parsing function call arguments:', parseError);
          }
        }
      }
      
    } catch (openaiError) {
      console.error('OpenAI error, falling back to Groq:', openaiError);
      // Fallback to Groq for response generation
      const groqResponse = await callGroqChat(messages, 'llama-3.3-70b-versatile', contextualPrompt, session_id, supabase);
      agentText = groqResponse.text;
    }

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

    // Save extract data if generated
    if (extractData && agentUtterance) {
      try {
        await supabase
          .from('extracts')
          .insert({
            session_id,
            utterance_id: agentUtterance.id,
            intent: extractData.intent,
            confidence: extractData.confidence,
            entities: extractData.entities,
            followup_actions: extractData.followup_actions,
            lead_score: extractData.lead_score
          });

        // Update session with latest lead score and intent
        await supabase
          .from('sessions')
          .update({
            lead_score: extractData.lead_score,
            final_intent: extractData.intent
          })
          .eq('id', session_id);

        console.log('Saved extract with lead score:', extractData.lead_score);
      } catch (extractError) {
        console.error('Error saving extract:', extractError);
      }
    }

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