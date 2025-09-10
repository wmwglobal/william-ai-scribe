import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  MessageSquare,
  Target,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Activity,
  Brain,
  Sparkles
} from 'lucide-react';
import { getScoreBadgeVariant } from '@/lib/leadScore';

interface Utterance {
  id: string;
  speaker: 'visitor' | 'agent';
  text: string;
  ts: string;
}

interface SessionData {
  id: string;
  visitor_id: string;
  started_at: string;
  ended_at: string | null;
  final_intent: string | null;
  lead_score: number | null;
  email: string | null;
  contact_name: string | null;
  cta_chosen: string | null;
  channel: string | null;
  consent: boolean | null;
  notes: string | null;
  current_mode: string | null;
}

interface Summary {
  executive_summary: string | null;
  action_items: any[];
  crm_payload: any;
}

interface Extract {
  intent: string | null;
  confidence: number | null;
  entities: any;
  lead_score: number | null;
}

interface Event {
  kind: string;
  payload: any;
  ts: string;
}

const SessionDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch utterances
      const { data: utterancesData } = await supabase
        .from('utterances')
        .select('*')
        .eq('session_id', sessionId)
        .order('ts', { ascending: true });
      
      if (utterancesData) setUtterances(utterancesData);

      // Fetch summary
      const { data: summaryData } = await supabase
        .from('summaries')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (summaryData) setSummary(summaryData);

      // Fetch extracts
      const { data: extractsData } = await supabase
        .from('extracts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (extractsData) setExtracts(extractsData);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('session_id', sessionId)
        .order('ts', { ascending: true });
      
      if (eventsData) setEvents(eventsData);

    } catch (err) {
      console.error('Error fetching session data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const getDuration = () => {
    if (!session?.started_at) return 'Unknown';
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  const getIntentIcon = (intent: string | null) => {
    if (!intent) return <MessageSquare className="w-4 h-4" />;
    if (intent.includes('purchase') || intent.includes('demo')) return <TrendingUp className="w-4 h-4" />;
    if (intent.includes('support')) return <AlertCircle className="w-4 h-4" />;
    if (intent.includes('partner')) return <Target className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-center text-destructive">{error || 'Session not found'}</p>
            <Button onClick={() => navigate('/admin')} className="w-full mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold">Session Details</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getScoreBadgeVariant(session.lead_score || 0)} className="text-lg px-3 py-1">
                Score: {session.lead_score || 0}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{session.contact_name || 'Anonymous'}</p>
              {session.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" />
                  {session.email}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getIntentIcon(session.final_intent)}
                Intent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {session.final_intent?.replace(/_/g, ' ') || 'Unknown'}
              </p>
              {session.cta_chosen && (
                <Badge variant="outline" className="mt-1">
                  CTA: {session.cta_chosen.replace(/_/g, ' ')}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{getDuration()}</p>
              <p className="text-sm text-muted-foreground">
                {utterances.length} messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {new Date(session.started_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(session.started_at).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        {summary?.executive_summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{summary.executive_summary}</p>
              
              {summary.action_items && summary.action_items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Action Items
                  </h4>
                  <div className="space-y-2">
                    {summary.action_items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">{item.text}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.owner}
                            </Badge>
                            <Badge 
                              variant={item.priority === 'high' ? 'destructive' : 'secondary'} 
                              className="text-xs"
                            >
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lead Scoring Insights */}
        {extracts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Lead Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {extracts.map((extract, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{extract.intent?.replace(/_/g, ' ') || 'Unknown Intent'}</p>
                      {extract.confidence && (
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={extract.confidence * 100} className="w-24 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {Math.round(extract.confidence * 100)}% confidence
                          </span>
                        </div>
                      )}
                    </div>
                    {extract.lead_score && (
                      <Badge variant={getScoreBadgeVariant(extract.lead_score)}>
                        {extract.lead_score}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="conversation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conversation">
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversation
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversation">
            <Card>
              <CardHeader>
                <CardTitle>Full Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                {utterances.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No conversation recorded</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {utterances.map((utterance) => (
                      <div
                        key={utterance.id}
                        className={`flex ${utterance.speaker === 'visitor' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            utterance.speaker === 'visitor'
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1">
                            {utterance.speaker === 'visitor' ? 'Visitor' : 'AI Agent'}
                          </p>
                          <p className="text-sm">{utterance.text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(utterance.ts).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Session Events</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No events tracked</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{event.kind.replace(/_/g, ' ')}</p>
                          {event.payload && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {JSON.stringify(event.payload, null, 2)}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.ts).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Session Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {session.notes ? (
                  <p className="text-lg leading-relaxed">{session.notes}</p>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No notes available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SessionDetail;