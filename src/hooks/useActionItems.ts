import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActionItem } from '@/components/ActionCards';
import { toast } from 'sonner';

interface CreateActionItemParams {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  owner?: 'you' | 'agent' | 'prospect';
  dueDate?: Date;
  category?: string;
  tags?: string[];
}

interface UpdateActionItemParams {
  id: string;
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  owner?: 'you' | 'agent' | 'prospect';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  category?: string;
  tags?: string[];
}

export function useActionItems(sessionId: string | null) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load action items for current session on mount and subscribe to realtime updates
  useEffect(() => {
    if (sessionId) {
      loadSessionActionItems();
      
      // Subscribe to realtime updates for action items
      const actionItemsChannel = supabase
        .channel(`action_items:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'action_items',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('Action item realtime update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newItem: ActionItem = {
                id: payload.new.id,
                title: payload.new.title,
                description: payload.new.description || '',
                priority: payload.new.priority as 'high' | 'medium' | 'low',
                owner: payload.new.owner as 'you' | 'agent' | 'prospect',
                dueDate: payload.new.due_date ? new Date(payload.new.due_date) : undefined,
                completed: payload.new.status === 'completed',
                category: payload.new.category,
                tags: payload.new.tags || []
              };
              
              setActionItems(prev => {
                // Check if item already exists
                if (prev.find(item => item.id === newItem.id)) {
                  return prev;
                }
                return [newItem, ...prev];
              });
              
              toast.success('New action item created');
            } else if (payload.eventType === 'UPDATE') {
              setActionItems(prev => 
                prev.map(item => item.id === payload.new.id ? {
                  ...item,
                  title: payload.new.title || item.title,
                  description: payload.new.description || item.description,
                  priority: payload.new.priority || item.priority,
                  owner: payload.new.owner || item.owner,
                  dueDate: payload.new.due_date ? new Date(payload.new.due_date) : item.dueDate,
                  completed: payload.new.status === 'completed',
                  category: payload.new.category || item.category,
                  tags: payload.new.tags || item.tags
                } : item)
              );
              
              if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
                toast.success('Action item completed! 🎉');
              }
            } else if (payload.eventType === 'DELETE') {
              setActionItems(prev => prev.filter(item => item.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      
      return () => {
        actionItemsChannel.unsubscribe();
      };
    }
  }, [sessionId]);

  // Load all action items for the current session
  const loadSessionActionItems = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedItems: ActionItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        priority: item.priority as 'high' | 'medium' | 'low',
        owner: item.owner as 'you' | 'agent' | 'prospect',
        dueDate: item.due_date ? new Date(item.due_date) : undefined,
        completed: item.status === 'completed',
        category: item.category,
        tags: item.tags || []
      }));

      setActionItems(formattedItems);
    } catch (err) {
      console.error('Error loading action items:', err);
      setError('Failed to load action items');
    } finally {
      setLoading(false);
    }
  };

  // Create a new action item
  const createActionItem = useCallback(async (params: CreateActionItemParams): Promise<ActionItem | null> => {
    if (!sessionId) {
      console.error('No session ID available');
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          session_id: sessionId,
          title: params.title,
          description: params.description,
          priority: params.priority || 'medium',
          owner: params.owner || 'you',
          due_date: params.dueDate?.toISOString(),
          category: params.category,
          tags: params.tags || [],
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: ActionItem = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        priority: data.priority as 'high' | 'medium' | 'low',
        owner: data.owner as 'you' | 'agent' | 'prospect',
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        completed: false,
        category: data.category,
        tags: data.tags || []
      };

      setActionItems(prev => [newItem, ...prev]);
      toast.success('Action item created');
      
      return newItem;
    } catch (err) {
      console.error('Error creating action item:', err);
      setError('Failed to create action item');
      toast.error('Failed to create action item');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Update an existing action item
  const updateActionItem = useCallback(async (params: UpdateActionItemParams): Promise<boolean> => {
    try {
      setLoading(true);
      
      const updateData: any = {};
      if (params.title !== undefined) updateData.title = params.title;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.priority !== undefined) updateData.priority = params.priority;
      if (params.owner !== undefined) updateData.owner = params.owner;
      if (params.status !== undefined) updateData.status = params.status;
      if (params.dueDate !== undefined) updateData.due_date = params.dueDate.toISOString();
      if (params.category !== undefined) updateData.category = params.category;
      if (params.tags !== undefined) updateData.tags = params.tags;

      // Add completed_at timestamp if marking as completed
      if (params.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('action_items')
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      // Update local state
      setActionItems(prev => 
        prev.map(item => {
          if (item.id === params.id) {
            return {
              ...item,
              ...(params.title !== undefined && { title: params.title }),
              ...(params.description !== undefined && { description: params.description }),
              ...(params.priority !== undefined && { priority: params.priority }),
              ...(params.owner !== undefined && { owner: params.owner }),
              ...(params.status !== undefined && { completed: params.status === 'completed' }),
              ...(params.dueDate !== undefined && { dueDate: params.dueDate }),
              ...(params.category !== undefined && { category: params.category }),
              ...(params.tags !== undefined && { tags: params.tags })
            };
          }
          return item;
        })
      );

      if (params.status === 'completed') {
        toast.success('Action item completed! 🎉');
      }
      
      return true;
    } catch (err) {
      console.error('Error updating action item:', err);
      setError('Failed to update action item');
      toast.error('Failed to update action item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete an action item
  const deleteActionItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setActionItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Action item deleted');
      
      return true;
    } catch (err) {
      console.error('Error deleting action item:', err);
      setError('Failed to delete action item');
      toast.error('Failed to delete action item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Complete an action item
  const completeActionItem = useCallback(async (itemId: string): Promise<boolean> => {
    return updateActionItem({ id: itemId, status: 'completed' });
  }, [updateActionItem]);

  // Schedule an action item (update due date)
  const scheduleActionItem = useCallback(async (itemId: string, dueDate: Date): Promise<boolean> => {
    return updateActionItem({ id: itemId, dueDate });
  }, [updateActionItem]);

  // Delegate an action item (change owner)
  const delegateActionItem = useCallback(async (itemId: string, owner: 'you' | 'agent' | 'prospect'): Promise<boolean> => {
    return updateActionItem({ id: itemId, owner });
  }, [updateActionItem]);

  // Clear session action items (for cleanup)
  const clearActionItems = useCallback(() => {
    setActionItems([]);
  }, []);

  return {
    actionItems,
    loading,
    error,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    completeActionItem,
    scheduleActionItem,
    delegateActionItem,
    clearActionItems,
    refreshActionItems: loadSessionActionItems
  };
}