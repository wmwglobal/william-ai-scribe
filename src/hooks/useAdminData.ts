import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  visitor_id: string | null;
  final_intent: string | null;
  lead_score: number | null;
  email: string | null;
  contact_name: string | null;
  cta_chosen: string | null;
  current_mode: string | null;
  created_at: string;
  updated_at: string;
  channel: string | null;
  consent: boolean | null;
  notes: string | null;
  session_secret: string | null;
  created_by: string | null;
}

export interface SessionSummary {
  session_id: string;
  executive_summary: string | null;
  action_items: any;
  crm_payload: any;
  created_at: string;
}

export interface SessionWithSummary extends AdminSession {
  summary?: SessionSummary;
  duration?: string;
  utterance_count?: number;
}

export const useAdminSessions = (dateRange: string = '7d', intentFilter: string = 'all') => {
  const [sessions, setSessions] = useState<SessionWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const days = getDaysFromRange(dateRange);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      // First, fetch sessions
      let sessionsQuery = supabase
        .from('sessions')
        .select('*')
        .gte('created_at', dateThreshold.toISOString())
        .order('created_at', { ascending: false });

      if (intentFilter !== 'all') {
        sessionsQuery = sessionsQuery.eq('final_intent', intentFilter);
      }

      const { data: sessionsData, error: sessionsError } = await sessionsQuery;

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        return;
      }

      // Fetch summaries for these sessions
      const sessionIds = sessionsData.map(s => s.id);
      const { data: summariesData, error: summariesError } = await supabase
        .from('summaries')
        .select('*')
        .in('session_id', sessionIds);

      if (summariesError) {
        console.error('Error fetching summaries:', summariesError);
      }

      // Fetch utterance counts for duration estimation
      const { data: utteranceCounts, error: utteranceError } = await supabase
        .from('utterances')
        .select('session_id')
        .in('session_id', sessionIds);

      if (utteranceError) {
        console.error('Error fetching utterance counts:', utteranceError);
      }

      // Combine the data
      const sessionsWithSummaries: SessionWithSummary[] = sessionsData.map(session => {
        const summary = summariesData?.find(s => s.session_id === session.id);
        const utteranceCount = utteranceCounts?.filter(u => u.session_id === session.id).length || 0;
        
        // Calculate duration
        let duration = 'Unknown';
        if (session.started_at && session.ended_at) {
          const start = new Date(session.started_at);
          const end = new Date(session.ended_at);
          const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          duration = `${diffMinutes}m`;
        } else if (utteranceCount > 0) {
          // Estimate based on utterance count (roughly 2 utterances per minute)
          const estimatedMinutes = Math.max(1, Math.round(utteranceCount / 2));
          duration = `~${estimatedMinutes}m`;
        }

        return {
          ...session,
          summary,
          duration,
          utterance_count: utteranceCount
        };
      });

      setSessions(sessionsWithSummaries);
    } catch (err) {
      console.error('Error fetching admin sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [dateRange, intentFilter]);

  return { sessions, loading, error, refetch: fetchSessions };
};

export const useAdminStats = (dateRange: string = '7d') => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    highQualityLeads: 0,
    avgSessionTime: '0m',
    conversionRate: '0%'
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('created_at', dateThreshold.toISOString());

      if (error) throw error;

      const totalSessions = sessionsData?.length || 0;
      const highQualityLeads = sessionsData?.filter(s => (s.lead_score || 0) >= 70).length || 0;
      const conversions = sessionsData?.filter(s => s.cta_chosen).length || 0;
      const conversionRate = totalSessions > 0 ? Math.round((conversions / totalSessions) * 100) : 0;

      // Calculate average session time
      const validSessions = sessionsData?.filter(s => s.started_at && s.ended_at) || [];
      const totalMinutes = validSessions.reduce((acc, session) => {
        const start = new Date(session.started_at);
        const end = new Date(session.ended_at!);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0);
      const avgMinutes = validSessions.length > 0 ? Math.round(totalMinutes / validSessions.length) : 0;

      setStats({
        totalSessions,
        highQualityLeads,
        avgSessionTime: `${avgMinutes}m`,
        conversionRate: `${conversionRate}%`
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  return { stats, loading, refetch: fetchStats };
};