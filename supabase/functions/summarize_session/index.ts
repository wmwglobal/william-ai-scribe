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

async function callOpenAI(messages: any[], systemPrompt: string) {
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
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, force_summarize = false } = await req.json();

    console.log(`Summarizing session: ${session_id}`);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get recent utterances (last 20 exchanges)
    const { data: utterances, error: utterancesError } = await supabase
      .from('utterances')
      .select('*')
      .eq('session_id', session_id)
      .order('ts', { ascending: true })
      .limit(40); // Last 20 exchanges (user + agent)

    if (utterancesError) {
      throw new Error('Failed to fetch utterances');
    }

    if (!utterances || utterances.length < 6) {
      console.log('Not enough utterances to summarize');
      return new Response(JSON.stringify({ success: true, message: 'Not enough content to summarize' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we already have a recent short-term memory
    const { data: existingMemory } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', session_id)
      .eq('scope', 'short')
      .order('created_at', { ascending: false })
      .limit(1);

    const shouldSummarize = force_summarize || 
      !existingMemory?.length || 
      utterances.length >= (existingMemory[0]?.content?.utterance_count || 0) + 10;

    if (!shouldSummarize) {
      console.log('Recent summary exists, skipping');
      return new Response(JSON.stringify({ success: true, message: 'Recent summary exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare conversation for summarization
    const conversation = utterances.map(u => 
      `${u.speaker === 'visitor' ? 'User' : 'William'}: ${u.text}`
    ).join('\n');

    const systemPrompt = `You are summarizing a conversation between a user and AI William (William MacDonald White's AI twin). 

Create a concise summary that captures:
1. Key topics discussed
2. User's interests/needs/challenges mentioned
3. Important insights or advice shared
4. Any personal details the user shared
5. The overall context and flow

Keep it factual and preserve important details for future reference. Be concise but comprehensive.`;

    const summary = await callOpenAI(
      [{ role: 'user', content: `Summarize this conversation:\n\n${conversation}` }],
      systemPrompt
    );

    // Determine importance based on conversation depth and content
    const importance = Math.min(10, Math.max(3, Math.floor(utterances.length / 4) + 2));

    // Save short-term memory summary
    const { error: saveError } = await supabase.functions.invoke('save_memory', {
      body: {
        session_id,
        visitor_id: session.visitor_id,
        user_id: session.created_by,
        scope: 'short',
        content: {
          conversation_summary: summary,
          utterance_count: utterances.length,
          session_mode: session.current_mode,
          timestamp: new Date().toISOString()
        },
        summary,
        importance,
        tags: ['conversation', 'summary', session.current_mode].filter(Boolean)
      }
    });

    if (saveError) {
      console.error('Error saving memory:', saveError);
      throw new Error('Failed to save memory');
    }

    // Check if we should create medium-term themes
    if (utterances.length >= 15) {
      const themePrompt = `Analyze this conversation and identify 2-3 key themes or topics that emerged. For each theme, provide:
1. Theme name (2-4 words)
2. Brief description
3. Key insights or user preferences related to this theme

Format as JSON: {"themes": [{"name": "Theme Name", "description": "...", "insights": "..."}]}`;

      try {
        const themesResponse = await callOpenAI(
          [{ role: 'user', content: `${themePrompt}\n\nConversation:\n${conversation}` }],
          'You are an expert at identifying conversation themes and user preferences.'
        );

        const themes = JSON.parse(themesResponse);
        
        if (themes.themes && themes.themes.length > 0) {
          await supabase.functions.invoke('save_memory', {
            body: {
              session_id,
              visitor_id: session.visitor_id,
              user_id: session.created_by,
              scope: 'medium',
              content: themes,
              summary: `Key themes: ${themes.themes.map((t: any) => t.name).join(', ')}`,
              importance: importance + 1,
              tags: ['themes', 'analysis', ...themes.themes.map((t: any) => t.name.toLowerCase())]
            }
          });
        }
      } catch (themeError) {
        console.error('Error generating themes:', themeError);
        // Continue without themes - not critical
      }
    }

    console.log(`Session summarized successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      summary,
      utterance_count: utterances.length,
      importance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in summarize_session function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});