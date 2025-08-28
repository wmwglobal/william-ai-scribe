import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { getScoreBadgeVariant } from '@/lib/leadScore';
import { SessionWithSummary } from '@/hooks/useAdminData';
import { User, Bot, Clock, Mail, Target, MessageSquare, Sparkles, Lightbulb } from 'lucide-react';

interface SessionDetailModalProps {
  session: SessionWithSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Utterance {
  id: string;
  speaker: string;
  text: string;
  ts: string;
  audio_url?: string;
}

export const SessionDetailModal = ({ session, isOpen, onClose }: SessionDetailModalProps) => {
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [loadingUtterances, setLoadingUtterances] = useState(false);

  const fetchUtterances = async (sessionId: string) => {
    try {
      setLoadingUtterances(true);
      const { data, error } = await supabase
        .from('utterances')
        .select('*')
        .eq('session_id', sessionId)
        .order('ts', { ascending: true });

      if (error) throw error;
      setUtterances(data || []);
    } catch (err) {
      console.error('Error fetching utterances:', err);
    } finally {
      setLoadingUtterances(false);
    }
  };

  useEffect(() => {
    if (session?.id && isOpen) {
      fetchUtterances(session.id);
    }
  }, [session?.id, isOpen]);

  if (!session) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getIntentBadgeVariant = (intent: string | null) => {
    if (!intent) return 'outline';
    const highValue = ['consulting_inquiry', 'partnership_vendor', 'speaking_request'];
    return highValue.includes(intent) ? 'default' : 'secondary';
  };

  const renderActionItems = (actionItems: any) => {
    if (!actionItems || !Array.isArray(actionItems)) return null;

    return (
      <div className="space-y-2">
        {actionItems.map((item: any, index: number) => (
          <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Target className="w-4 h-4 mt-0.5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.action || item.task || item}</p>
              {item.priority && (
                <Badge variant="outline" className="mt-1">
                  {item.priority} priority
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Session Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="summary">AI Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Session Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Started</p>
                      <p>{formatDate(session.started_at)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Duration</p>
                      <p>{session.duration || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Channel</p>
                      <p className="capitalize">{session.channel || 'web'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Mode</p>
                      <p className="capitalize">{session.current_mode || 'entrepreneur'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">Visitor ID</p>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {session.visitor_id || 'Anonymous'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact & Lead Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Contact & Lead Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {session.contact_name && (
                      <div>
                        <p className="font-medium text-muted-foreground">Name</p>
                        <p>{session.contact_name}</p>
                      </div>
                    )}
                    
                    {session.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${session.email}`} className="text-primary hover:underline">
                          {session.email}
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Lead Score</p>
                        <Badge variant={getScoreBadgeVariant(session.lead_score || 0)}>
                          {session.lead_score || 0}/100
                        </Badge>
                      </div>
                      
                      {session.final_intent && (
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Intent</p>
                          <Badge variant={getIntentBadgeVariant(session.final_intent)}>
                            {session.final_intent.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {session.cta_chosen && (
                      <div>
                        <p className="font-medium text-muted-foreground">CTA Chosen</p>
                        <Badge variant="outline" className="mt-1">
                          {session.cta_chosen.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {session.notes && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{session.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="conversation" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Full Conversation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {utterances.length} messages • {session.utterance_count} total utterances
                </p>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {loadingUtterances ? (
                    <div className="flex items-century justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : utterances.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No conversation data available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {utterances.map((utterance) => (
                        <div
                          key={utterance.id}
                          className={`flex gap-3 ${
                            utterance.speaker === 'agent' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`flex gap-3 max-w-[80%] ${
                              utterance.speaker === 'agent' ? 'flex-row' : 'flex-row-reverse'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              {utterance.speaker === 'agent' ? (
                                <Bot className="w-4 h-4" />
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </div>
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                utterance.speaker === 'agent'
                                  ? 'bg-muted text-foreground'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <p className="text-sm">{utterance.text}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(utterance.ts).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-y-auto">
            {session.summary ? (
              <div className="space-y-6">
                {/* Executive Summary */}
                {session.summary.executive_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{session.summary.executive_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items */}
                {session.summary.action_items && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Action Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderActionItems(session.summary.action_items)}
                    </CardContent>
                  </Card>
                )}

                {/* CRM Data */}
                {session.summary.crm_payload && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">CRM Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(session.summary.crm_payload, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No AI Summary Available</h3>
                    <p className="text-muted-foreground mb-4">
                      This session hasn't been summarized yet.
                    </p>
                    <Button variant="outline">
                      Generate Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};