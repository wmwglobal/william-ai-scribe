import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

interface ConsolidateRequest {
  session_id: string;
  max_memories?: number;
  importance_threshold?: number;
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

    const { session_id, max_memories = 100, importance_threshold = 0.7 } = await req.json() as ConsolidateRequest;

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      throw new Error('Invalid session');
    }

    // Get all memories for the session
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', session_id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false }); // Use created_at as fallback if last_accessed doesn't exist

    if (memoriesError) throw memoriesError;

    const consolidationActions = [];

    // 1. Upgrade frequently accessed short-term memories to medium-term
    const shortTermMemories = memories.filter(m => m.scope === 'short');
    for (const memory of shortTermMemories) {
      const accessCount = memory.access_count || 0;
      const hoursSinceCreation = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60);
      
      // If accessed more than 3 times or older than 2 hours with high importance
      if (accessCount > 3 || (hoursSinceCreation > 2 && memory.importance > 0.5)) {
        const { error } = await supabase
          .from('memories')
          .update({ 
            scope: 'medium',
            importance: Math.min(1, memory.importance * 1.1) // Slightly increase importance
          })
          .eq('id', memory.id);

        if (!error) {
          consolidationActions.push({
            action: 'upgrade',
            memory_id: memory.id,
            from: 'short',
            to: 'medium'
          });
        }
      }
    }

    // 2. Upgrade important medium-term memories to long-term
    const mediumTermMemories = memories.filter(m => m.scope === 'medium');
    for (const memory of mediumTermMemories) {
      const daysSinceCreation = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
      
      // If older than 1 day with high importance
      if (daysSinceCreation > 1 && memory.importance >= importance_threshold) {
        const { error } = await supabase
          .from('memories')
          .update({ 
            scope: 'long',
            importance: Math.min(1, memory.importance * 1.05)
          })
          .eq('id', memory.id);

        if (!error) {
          consolidationActions.push({
            action: 'upgrade',
            memory_id: memory.id,
            from: 'medium',
            to: 'long'
          });
        }
      }
    }

    // 3. Prune less important short-term memories if exceeding max_memories
    if (memories.length > max_memories) {
      const memoriesToPrune = memories
        .filter(m => m.scope === 'short' && m.importance < 0.3)
        .slice(max_memories - memories.length);

      for (const memory of memoriesToPrune) {
        const { error } = await supabase
          .from('memories')
          .delete()
          .eq('id', memory.id);

        if (!error) {
          consolidationActions.push({
            action: 'prune',
            memory_id: memory.id
          });
        }
      }
    }

    // 4. Merge similar memories (based on embedding similarity)
    // This would require comparing embeddings - simplified for now
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (groqApiKey && memories.length > 10) {
      // Group memories by similar content (simplified - in production, use embeddings)
      const groups: Map<string, typeof memories> = new Map();
      
      for (const memory of memories) {
        // Simple grouping by first 30 chars of content
        const key = memory.content.substring(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(memory);
      }

      // Merge groups with multiple similar memories
      for (const [key, group] of groups.entries()) {
        if (group.length > 2) {
          // Combine into a single consolidated memory
          const combinedContent = group.map(m => m.content).join(' | ');
          const avgImportance = group.reduce((sum, m) => sum + m.importance, 0) / group.length;
          const maxScope = group.reduce((max, m) => {
            const scopes = ['short', 'medium', 'long', 'episodic'];
            return scopes.indexOf(m.scope) > scopes.indexOf(max) ? m.scope : max;
          }, 'short');

          // Create consolidated memory
          const { data: consolidated, error: createError } = await supabase
            .from('memories')
            .insert({
              session_id,
              content: `[Consolidated] ${combinedContent}`,
              scope: maxScope,
              importance: Math.min(1, avgImportance * 1.2),
              tags: [...new Set(group.flatMap(m => m.tags || []))],
              metadata: { 
                consolidated: true, 
                original_count: group.length,
                consolidated_at: new Date().toISOString()
              }
            })
            .select()
            .single();

          if (!createError && consolidated) {
            // Delete original memories
            for (const memory of group) {
              await supabase
                .from('memories')
                .delete()
                .eq('id', memory.id);
            }

            consolidationActions.push({
              action: 'merge',
              merged_ids: group.map(m => m.id),
              new_id: consolidated.id
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        actions: consolidationActions,
        total_memories: memories.length,
        consolidated_count: consolidationActions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error consolidating memories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});