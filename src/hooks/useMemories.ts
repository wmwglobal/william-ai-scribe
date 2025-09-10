import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Memory } from '@/components/MemoryTimeline';
import { toast } from 'sonner';

interface SaveMemoryParams {
  content: string;
  scope?: 'short' | 'medium' | 'long' | 'episodic';
  importance?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface RecallMemoriesParams {
  query?: string;
  limit?: number;
  scope?: 'short' | 'medium' | 'long' | 'episodic';
  minImportance?: number;
}

export function useMemories(sessionId: string | null, sessionSecret?: string | null) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load memories for current session on mount and subscribe to realtime updates
  useEffect(() => {
    if (sessionId) {
      loadSessionMemories();
      
      // Subscribe to realtime updates for memories
      const memoriesChannel = supabase
        .channel(`memories:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'memories',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('Memory realtime update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newMemory: Memory = {
                id: payload.new.id,
                content: payload.new.content,
                timestamp: new Date(payload.new.created_at).getTime(),
                scope: payload.new.scope || 'short',
                importance: payload.new.importance || 0.5,
                source: 'conversation',
                relevance: 0,
                tags: payload.new.tags || [],
                isRecalled: false,
                isNew: true
              };
              
              setMemories(prev => {
                // Check if memory already exists
                if (prev.find(m => m.id === newMemory.id)) {
                  return prev;
                }
                return [newMemory, ...prev];
              });
              
              // Remove new flag after animation
              setTimeout(() => {
                setMemories(prev => 
                  prev.map(m => m.id === newMemory.id ? { ...m, isNew: false } : m)
                );
              }, 2000);
            } else if (payload.eventType === 'UPDATE') {
              setMemories(prev => 
                prev.map(m => m.id === payload.new.id ? {
                  ...m,
                  importance: payload.new.importance || m.importance,
                  scope: payload.new.scope || m.scope,
                  tags: payload.new.tags || m.tags
                } : m)
              );
            } else if (payload.eventType === 'DELETE') {
              setMemories(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      
      return () => {
        memoriesChannel.unsubscribe();
      };
    }
  }, [sessionId]);

  // Load all memories for the current session
  const loadSessionMemories = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMemories: Memory[] = (data || []).map(mem => ({
        id: mem.id,
        content: mem.content,
        timestamp: new Date(mem.created_at).getTime(),
        scope: mem.scope || 'short',
        importance: mem.importance || 0.5,
        source: 'conversation',
        relevance: 0,
        tags: mem.tags || [],
        isRecalled: false,
        isNew: false
      }));

      setMemories(formattedMemories);
    } catch (err) {
      console.error('Error loading memories:', err);
      setError('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  // Save a new memory
  const saveMemory = useCallback(async (params: SaveMemoryParams): Promise<Memory | null> => {
    if (!sessionId) {
      console.error('No session ID available');
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('save_memory', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          content: params.content,
          scope: params.scope || 'short',
          importance: params.importance || 0.5,
          tags: params.tags || [],
          metadata: params.metadata || {}
        }
      });

      if (error) throw error;

      // Create the Memory object for UI
      const newMemory: Memory = {
        id: data.memory.id,
        content: params.content,
        timestamp: Date.now(),
        scope: params.scope || 'short',
        importance: params.importance || 0.5,
        source: 'conversation',
        relevance: 0,
        tags: params.tags || [],
        isRecalled: false,
        isNew: true
      };

      // Add to local state with animation flag
      setMemories(prev => [newMemory, ...prev]);

      // Remove the "new" flag after animation
      setTimeout(() => {
        setMemories(prev => 
          prev.map(m => m.id === newMemory.id ? { ...m, isNew: false } : m)
        );
      }, 2000);

      return newMemory;
    } catch (err) {
      console.error('Error saving memory:', err);
      setError('Failed to save memory');
      toast.error('Failed to save memory');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Recall memories based on query/context
  const recallMemories = useCallback(async (params: RecallMemoriesParams = {}): Promise<Memory[]> => {
    if (!sessionId) {
      console.error('No session ID available');
      return [];
    }

    // If no session secret provided, skip memory recall (not critical for UI display)
    if (!sessionSecret) {
      console.warn('No session secret available for memory recall');
      return [];
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('recall_memories', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          query: params.query || '',
          limit: params.limit || 10,
          scope: params.scope,
          min_importance: params.minImportance
        }
      });

      if (error) throw error;

      const recalledMemories: Memory[] = (data.memories || []).map((mem: any) => ({
        id: mem.id,
        content: mem.content,
        timestamp: new Date(mem.created_at).getTime(),
        scope: mem.scope || 'short',
        importance: mem.importance || 0.5,
        source: 'recall',
        relevance: mem.similarity || 0,
        tags: mem.tags || [],
        isRecalled: true,
        isNew: false
      }));

      // Mark recalled memories in the UI
      const recalledIds = new Set(recalledMemories.map(m => m.id));
      setMemories(prev => 
        prev.map(m => ({
          ...m,
          isRecalled: recalledIds.has(m.id),
          relevance: recalledMemories.find(r => r.id === m.id)?.relevance || m.relevance
        }))
      );

      // Clear recall status after animation
      setTimeout(() => {
        setMemories(prev => 
          prev.map(m => ({ ...m, isRecalled: false }))
        );
      }, 3000);

      return recalledMemories;
    } catch (err) {
      console.error('Error recalling memories:', err);
      setError('Failed to recall memories');
      return [];
    } finally {
      setLoading(false);
    }
  }, [sessionId, sessionSecret]);

  // Update memory importance
  const updateMemoryImportance = useCallback(async (memoryId: string, importance: number) => {
    try {
      // Build update object dynamically
      const updateData: any = { importance };
      
      // Only add last_accessed if the column exists (for backward compatibility)
      try {
        updateData.last_accessed = new Date().toISOString();
      } catch {
        // Column might not exist yet
      }
      
      const { error } = await supabase
        .from('memories')
        .update(updateData)
        .eq('id', memoryId);

      if (error) throw error;

      setMemories(prev => 
        prev.map(m => m.id === memoryId ? { ...m, importance } : m)
      );
    } catch (err) {
      console.error('Error updating memory importance:', err);
      toast.error('Failed to update memory importance');
    }
  }, []);

  // Clear session memories (for cleanup)
  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  return {
    memories,
    loading,
    error,
    saveMemory,
    recallMemories,
    updateMemoryImportance,
    clearMemories,
    refreshMemories: loadSessionMemories
  };
}