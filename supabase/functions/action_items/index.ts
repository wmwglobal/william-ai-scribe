import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

interface ActionItemRequest {
  action: 'create' | 'update' | 'delete' | 'list' | 'extract';
  session_id?: string;
  item_id?: string;
  data?: {
    title?: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    owner?: 'you' | 'agent' | 'prospect';
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    due_date?: string;
    category?: string;
    tags?: string[];
  };
  extract_from?: string; // For extracting action items from conversation text
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: ActionItemRequest = await req.json();
    const { action, session_id, item_id, data, extract_from } = request;

    // Validate session
    if (session_id && action !== 'extract') {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        throw new Error('Invalid session');
      }
    }

    switch (action) {
      case 'create': {
        if (!session_id || !data?.title) {
          throw new Error('Session ID and title are required');
        }

        const { data: actionItem, error } = await supabase
          .from('action_items')
          .insert({
            session_id,
            title: data.title,
            description: data.description,
            priority: data.priority || 'medium',
            owner: data.owner || 'you',
            status: 'pending',
            due_date: data.due_date,
            category: data.category,
            tags: data.tags || []
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action_item: actionItem }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!item_id) {
          throw new Error('Item ID is required');
        }

        const updateData: any = {};
        if (data?.title !== undefined) updateData.title = data.title;
        if (data?.description !== undefined) updateData.description = data.description;
        if (data?.priority !== undefined) updateData.priority = data.priority;
        if (data?.owner !== undefined) updateData.owner = data.owner;
        if (data?.status !== undefined) updateData.status = data.status;
        if (data?.due_date !== undefined) updateData.due_date = data.due_date;
        if (data?.category !== undefined) updateData.category = data.category;
        if (data?.tags !== undefined) updateData.tags = data.tags;

        // Add completed_at timestamp if marking as completed
        if (data?.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }

        const { data: actionItem, error } = await supabase
          .from('action_items')
          .update(updateData)
          .eq('id', item_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action_item: actionItem }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!item_id) {
          throw new Error('Item ID is required');
        }

        const { error } = await supabase
          .from('action_items')
          .delete()
          .eq('id', item_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        if (!session_id) {
          throw new Error('Session ID is required');
        }

        const { data: actionItems, error } = await supabase
          .from('action_items')
          .select('*')
          .eq('session_id', session_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action_items: actionItems }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'extract': {
        if (!extract_from) {
          throw new Error('Text to extract from is required');
        }

        // Extract action items from conversation text using AI
        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
          throw new Error('GROQ API key not configured');
        }

        const extractionPrompt = `Extract action items from the following conversation text. Return a JSON array of action items with the following structure:
        {
          "action_items": [
            {
              "title": "Brief title of the action",
              "description": "More detailed description if available",
              "priority": "high|medium|low",
              "owner": "you|agent|prospect",
              "due_date": "ISO date string if mentioned, null otherwise",
              "category": "category if identifiable, null otherwise"
            }
          ]
        }
        
        Conversation text:
        ${extract_from}
        
        Only extract clear action items that require follow-up. Return an empty array if no action items are found.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant that extracts action items from conversations. Always return valid JSON.'
              },
              {
                role: 'user',
                content: extractionPrompt
              }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to extract action items');
        }

        const completion = await response.json();
        const extracted = JSON.parse(completion.choices[0].message.content);

        // Save extracted action items if session_id provided
        if (session_id && extracted.action_items && extracted.action_items.length > 0) {
          const itemsToInsert = extracted.action_items.map((item: any) => ({
            session_id,
            title: item.title,
            description: item.description,
            priority: item.priority || 'medium',
            owner: item.owner || 'you',
            status: 'pending',
            due_date: item.due_date,
            category: item.category,
            tags: []
          }));

          const { data: savedItems, error: saveError } = await supabase
            .from('action_items')
            .insert(itemsToInsert)
            .select();

          if (saveError) {
            console.error('Error saving extracted action items:', saveError);
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              extracted: extracted.action_items,
              saved: savedItems || []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            extracted: extracted.action_items || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in action_items function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});