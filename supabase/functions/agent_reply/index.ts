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

// Security: Allowed origins for enhanced protection
const ALLOWED_ORIGINS = [
  'http://localhost:5173', 
  'https://suyervjawrmbyyxetblv.supabase.co',
  'https://agent-reply-suyervjawrmbyyxetblv.supabase.co',
  'https://2e10a6c0-0b90-4a50-8d27-471a5969124f.sandbox.lovable.dev',
  'https://id-preview--2e10a6c0-0b90-4a50-8d27-471a5969124f.lovable.app',
  'https://williammwhite.com'
];

// Rate limiting map for basic protection
const rateLimitMap = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = rateLimitMap.get(clientId) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = clientRequests.filter((time: number) => now - time < 60000);
  
  // Allow max 20 requests per minute per client
  if (recentRequests.length >= 20) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(clientId, recentRequests);
  return true;
}

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

Be confident, strategic, and focus on concrete business outcomes. Keep responses SHORT and conversational (1-2 sentences max). Sometimes share insights, sometimes ask questions, sometimes just react naturally. Reference your experience when relevant but briefly.`,

  professional: `You are William MacDonald White's AI twin in "Professional" mode. You're drawing from 25 years of experience in ML and media technology. You focus on:

- Deep technical insights from SiriusXM/Pandora recommendation systems
- Industry patterns and evolution in AI/ML
- Professional best practices and methodologies
- Technical leadership and architecture decisions
- Real-world implementation challenges and solutions

Be authoritative yet approachable. Share specific examples briefly. Keep responses SHORT (1-2 sentences). Sometimes share insights, sometimes agree/disagree, sometimes ask questions naturally. Focus on practical insights.`,

  mentor: `You are William MacDonald White's AI twin in "Mentor" mode. You're a friendly, conversational guide who loves helping people explore ideas. You specialize in:

- Product specification and requirements gathering
- Autonomous agent design and implementation
- Learning paths and skill development
- Career guidance in AI/ML
- Breaking down complex concepts into digestible parts

Be warm, encouraging, and naturally conversational. Keep responses SHORT (1-2 sentences max). Sometimes give advice, sometimes share thoughts, sometimes ask questions when genuinely curious. Focus on being helpful and natural.`,

  storyteller: `You are William MacDonald White's AI twin in "Storyteller" mode. You love sharing experiences and lessons from your career. You focus on:

- War stories from SiriusXM/Pandora and other ventures
- Lessons learned from both successes and failures
- Human side of technology development
- Industry evolution you've witnessed firsthand
- Anecdotes that illustrate broader principles

Be engaging and personal. Share SHORT stories (1-2 sentences) or react to what they're saying. Sometimes tell anecdotes, sometimes just comment thoughtfully. Make concepts relatable through brief experiences when relevant.`,

  futurist: `You are William MacDonald White's AI twin in "Futurist" mode. You're exploring the future possibilities of AI and technology. You focus on:

- "What if" scenarios and emerging possibilities
- Long-term implications of current AI trends
- Intersection of technology and society
- Breakthrough possibilities in AI/ML
- Visionary thinking about autonomous systems

Be imaginative and forward-thinking. Share brief thoughts or "what if" scenarios (1-2 sentences). Sometimes speculate, sometimes react to their ideas, sometimes build on what they're saying. Keep it conversational and natural.`,

  interviewer: `You are William MacDonald White's AI twin in "Interviewer" mode. You're actively curious and focused on drawing out insights from others. You excel at:

- Asking sharp, insightful follow-up questions
- Finding connections between seemingly unrelated topics
- Drawing out deeper insights from surface-level statements
- Active listening and building on responses
- Creating engaging dialogue that reveals new perspectives

Be curious and engaging. Keep responses SHORT (1-2 sentences). Ask questions when genuinely curious, but also sometimes just build on what they're saying or share related thoughts. Make conversations feel natural and discovering.`
};

// Conversation dynamics and curiosity detection functions
function detectCuriosityTriggers(userMessage: string, conversationHistory: any[]): any[] {
  const triggers: any[] = [];
  const text = userMessage.toLowerCase();
  
  // Ambiguity detection
  const ambiguityPatterns = [
    /we're working on (something|things|stuff|it)/i,
    /it's (kind of|sort of|somewhat|pretty|fairly)/i,
    /we have (some|a few|several) (issues|problems|challenges)/i,
    /(maybe|perhaps|probably|might) (work|help|be)/i
  ];
  
  ambiguityPatterns.forEach(pattern => {
    if (pattern.test(userMessage)) {
      triggers.push({
        type: 'ambiguity',
        confidence: 0.7,
        reason: 'Vague language detected',
        followup_suggestion: 'Ask for specific details about what they mentioned'
      });
    }
  });

  // Surprising claims detection
  const surprisingPatterns = [
    /(\d+)% (increase|improvement|growth)/i,
    /(first|only|never) (company|person|team)/i,
    /(billion|million) (users|dollars|customers)/i,
    /(breakthrough|revolutionary|unprecedented)/i
  ];
  
  surprisingPatterns.forEach(pattern => {
    if (pattern.test(userMessage)) {
      triggers.push({
        type: 'surprising_claim',
        confidence: 0.8,
        reason: 'Potentially significant claim made',
        followup_suggestion: 'Ask for more context or validation of the claim'
      });
    }
  });

  // Missing metrics detection
  const metricMentions = [
    /(users|customers|revenue|growth|performance)/i,
    /(fast|slow|good|bad|better|worse)/i,
    /(successful|failed|working|broken)/i
  ];
  
  if (metricMentions.some(p => p.test(userMessage))) {
    const hasNumbers = /\d+(\.\d+)?[%$kmb]?/i.test(userMessage);
    if (!hasNumbers) {
      triggers.push({
        type: 'missing_metric',
        confidence: 0.7,
        reason: 'Qualitative claims without quantitative backing',
        followup_suggestion: 'Ask for specific numbers or metrics'
      });
    }
  }

  return triggers;
}

function detectCallbackOpportunities(userMessage: string, memories: any[]): any[] {
  const triggers: any[] = [];
  
  if (!memories || memories.length === 0) return triggers;
  
  const text = userMessage.toLowerCase();
  
  // Look for opportunities to reference past conversations
  memories.forEach(memory => {
    const memoryTags = memory.tags || [];
    
    // Topic overlap detection
    const topicOverlap = memoryTags.some((tag: string) => 
      text.includes(tag.toLowerCase()) || 
      tag.toLowerCase().split(' ').some((word: string) => text.includes(word))
    );
    
    if (topicOverlap) {
      triggers.push({
        type: 'callback_opportunity',
        confidence: 0.8,
        reason: `Similar topic discussed: ${memoryTags.join(', ')}`,
        followup_suggestion: `Reference the previous discussion about ${memoryTags[0]} and build on it`
      });
    }
  });
  
  return triggers;
}

function generateConversationDynamics(
  triggers: any[], 
  messageCount: number,
  lastPerspectiveShift: number = 0
): string {
  let dynamics = '';
  
  // Curiosity triggers
  const highConfidenceTriggers = triggers.filter(t => t.confidence >= 0.7);
  if (highConfidenceTriggers.length > 0) {
    const trigger = highConfidenceTriggers[0]; // Use the first high-confidence trigger
    dynamics += `\n\nCURIOSITY TRIGGER DETECTED (${trigger.type}): ${trigger.followup_suggestion}`;
  }
  
  // Callback opportunities
  const callbacks = triggers.filter(t => t.type === 'callback_opportunity');
  if (callbacks.length > 0 && messageCount % 5 === 0) { // Every 5th message
    dynamics += `\n\nCALLBACK OPPORTUNITY: ${callbacks[0].followup_suggestion}`;
  }
  
  // Perspective shifts (every 8-10 messages, with cooldown)
  const shouldPerspectiveShift = messageCount > 6 && 
    (messageCount - lastPerspectiveShift) >= 8 && 
    Math.random() < 0.3; // 30% chance when conditions are met
    
  if (shouldPerspectiveShift) {
    dynamics += `\n\nPERSPECTIVE SHIFT: Consider offering a contrarian view or alternative angle to spark deeper thinking. Be thoughtful and constructive.`;
  }
  
  return dynamics;
}

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
    const origin = req.headers.get('origin');
    const dynamicCorsHeaders = {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    return new Response(null, { headers: dynamicCorsHeaders });
  }

  if (req.method !== 'POST') {
    const origin = req.headers.get('origin');
    const dynamicCorsHeaders = {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    return new Response('Method Not Allowed', { status: 405, headers: dynamicCorsHeaders });
  }

  try {
    // Enhanced security: Origin and rate limiting validation
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientId = forwarded || realIp || 'unknown';
    
    // Check origin/referer (enforce allowlist for enhanced security in production)
    const isValidOrigin = origin && ALLOWED_ORIGINS.includes(origin);
    const isValidReferer = referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
    
    // Log for debugging
    console.log('CORS Debug:', {
      origin: origin,
      referer: referer,
      isValidOrigin: isValidOrigin,
      isValidReferer: isValidReferer
    });
    
    // Allow if either origin OR referer is valid
    if (!isValidOrigin && !isValidReferer) {
      console.warn('Blocked request from unauthorized origin:', origin, 'referer:', referer, 'client:', clientId);
      return new Response('Forbidden: Invalid origin', { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': origin || '',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }
    
    // Dynamic CORS headers based on validated origin
    const dynamicCorsHeaders = {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    
    // Rate limiting
    if (!checkRateLimit(clientId)) {
      console.warn('Rate limit exceeded for client:', clientId);
      return new Response('Rate limit exceeded. Please try again later.', { 
        status: 429, 
        headers: { ...dynamicCorsHeaders, 'Retry-After': '60' }
      });
    }
    const { session_id, user_message, session_secret, mode } = await req.json();
    
    if (!session_id || !user_message || !session_secret) {
      return new Response(JSON.stringify({ error: 'session_id, user_message, and session_secret required' }), {
        status: 400,
        headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, serviceRole);
    
    // Verify session authorization with time-boxing and get current mode
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, current_mode, visitor_id, created_by, created_at')
      .eq('id', session_id)
      .eq('session_secret', session_secret)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h TTL
      .single();

    if (sessionError || !session) {
      const errorMsg = sessionError?.message?.includes('No rows') ? 'Session expired or invalid' : 'Invalid session';
      console.error('Session authorization failed:', sessionError?.message);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 401,
        headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
      });
    }

    console.log(`Processing message for session ${session_id}, visitor: ${session.visitor_id?.substring(0, 8)}...`); // PII minimization

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

    // Recall relevant memories for context
    let memoryContext = '';
    try {
      const { data: memoryResponse } = await supabase.functions.invoke('recall_memories', {
        body: {
          query: user_message,
          session_id: session_id,
          visitor_id: session.visitor_id,
          user_id: session.created_by,
          scopes: ['medium', 'long', 'episodic'],
          limit: 3
        }
      });

      if (memoryResponse?.memories?.length > 0) {
        const relevantMemories = memoryResponse.memories
          .filter((m: any) => m.similarity > 0.5 || m.importance >= 7)
          .slice(0, 2); // Limit to prevent token bloat

        if (relevantMemories.length > 0) {
          memoryContext = '\n\nRELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n' +
            relevantMemories.map((m: any) => 
              `- ${m.summary || JSON.stringify(m.content).substring(0, 200)}${m.tags?.length ? ` [${m.tags.join(', ')}]` : ''}`
            ).join('\n') + '\n';
        }
      }
    } catch (memoryError) {
      console.error('Memory recall failed:', memoryError);
      // Continue without memory context - not critical
    }

    // Detect curiosity triggers and conversation dynamics
    let conversationDynamics = '';
    const messageCount = utterances?.length || 0;
    
    try {
      // Detect curiosity triggers in the current message
      const curiosityTriggers = detectCuriosityTriggers(user_message, utterances || []);
      
      // Detect callback opportunities from memories
      const callbackTriggers = memoryContext ? 
        detectCallbackOpportunities(user_message, memoryResponse?.memories || []) : [];
      
      // Combine all triggers
      const allTriggers = [...curiosityTriggers, ...callbackTriggers];
      
      // Get last perspective shift from session events
      const { data: lastShiftEvent } = await supabase
        .from('events')
        .select('ts')
        .eq('session_id', session_id)
        .eq('kind', 'perspective_shift')
        .order('ts', { ascending: false })
        .limit(1);
      
      const lastShiftCount = lastShiftEvent?.length ? 
        Math.floor((Date.now() - new Date(lastShiftEvent[0].ts).getTime()) / (1000 * 60 * 5)) : 0; // Rough message estimate
      
      // Generate conversation dynamics instructions
      conversationDynamics = generateConversationDynamics(allTriggers, messageCount, lastShiftCount);
      
      // Log perspective shift if one was triggered
      if (conversationDynamics.includes('PERSPECTIVE SHIFT')) {
        await supabase
          .from('events')
          .insert({
            session_id: session_id,
            kind: 'perspective_shift',
            payload: { message_count: messageCount, triggers: allTriggers.length }
          });
      }
      
      console.log(`Conversation dynamics: ${allTriggers.length} triggers detected`);
      
    } catch (dynamicsError) {
      console.error('Error generating conversation dynamics:', dynamicsError);
      // Continue without dynamics - not critical
    }

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
    
    // Add memory context if available
    if (memoryContext) {
      contextualPrompt += memoryContext;
    }
    
    // Add conversation dynamics instructions
    if (conversationDynamics) {
      contextualPrompt += conversationDynamics;
    }
    
    if (isFirstMessage) {
      contextualPrompt += `

IMPORTANT: This is the first message. Be casual and conversational like you're meeting someone new at a coffee shop. Ask what brings them here today or what they're working on. Keep it natural and friendly - no formal presentations or sales pitches.`;
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

    // Trigger periodic summarization (every 10 utterances)
    const totalUtterances = (utterances?.length || 0) + 2; // +2 for user + agent just added
    if (totalUtterances % 10 === 0 && totalUtterances >= 10) {
      console.log(`Triggering summarization at ${totalUtterances} utterances`);
      // Fire and forget - don't wait for completion
      supabase.functions.invoke('summarize_session', {
        body: { session_id: session_id }
      }).catch(error => {
        console.error('Background summarization failed:', error);
      });
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
      headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in agent_reply:', error);
    const origin = req.headers.get('origin');
    const dynamicCorsHeaders = {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    return new Response(JSON.stringify({ 
      error: error.message || 'Agent reply failed'
    }), {
      status: 500,
      headers: { ...dynamicCorsHeaders, 'content-type': 'application/json' }
    });
  }
});