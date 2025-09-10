import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Download, Eye, Settings, Users, TrendingUp, Clock, FileText, AlertCircle, ChevronRight, Sparkles, Target, ArrowUpRight } from 'lucide-react';
import { useAdminSessions, useAdminStats } from '@/hooks/useAdminData';
import { getScoreBadgeVariant } from '@/lib/leadScore';

const Admin = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('7d');
  const [intentFilter, setIntentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'duration'>('score');
  
  const { sessions, loading: sessionsLoading, error: sessionsError } = useAdminSessions(dateRange, intentFilter);
  const { stats, loading: statsLoading } = useAdminStats(dateRange);

  // Filter and sort sessions
  const filteredSessions = sessions
    .filter(session => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        session.contact_name?.toLowerCase().includes(searchLower) ||
        session.email?.toLowerCase().includes(searchLower) ||
        session.visitor_id?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.lead_score || 0) - (a.lead_score || 0);
      } else if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const aDuration = a.duration ? parseInt(a.duration) : 0;
        const bDuration = b.duration ? parseInt(b.duration) : 0;
        return bDuration - aDuration;
      }
    });

  const getIntentBadgeVariant = (intent: string | null) => {
    if (!intent) return 'outline';
    const highValue = ['consulting_inquiry', 'partnership_vendor', 'speaking_request'];
    return highValue.includes(intent) ? 'default' : 'secondary';
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI William Dashboard</h1>
              <p className="text-muted-foreground">Monitor conversations and analyze leads</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.totalSessions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dateRange === '7d' ? 'Last 7 days' : `Last ${dateRange.replace('d', ' days')}`}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High-Quality Leads</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.highQualityLeads}
                  </div>
                  <p className="text-xs text-muted-foreground">Score ≥70</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.avgSessionTime}
                  </div>
                  <p className="text-xs text-muted-foreground">Average duration</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.conversionRate}
                  </div>
                  <p className="text-xs text-muted-foreground">CTAs clicked</p>
                </CardContent>
              </Card>
            </div>

            {/* Priority Sessions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Priority Sessions
                  </CardTitle>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">By Score</SelectItem>
                      <SelectItem value="date">By Date</SelectItem>
                      <SelectItem value="duration">By Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sessionsError ? (
                  <div className="flex items-center justify-center py-8 text-destructive">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Error loading sessions: {sessionsError}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSessions.slice(0, 5).map((session) => {
                      const isHighPriority = (session.lead_score || 0) >= 75;
                      const isMediumPriority = (session.lead_score || 0) >= 50;
                      
                      return (
                        <div 
                          key={session.id} 
                          className={`
                            relative p-4 rounded-lg border transition-all cursor-pointer
                            ${isHighPriority ? 'border-primary bg-primary/5 hover:bg-primary/10' : 
                              isMediumPriority ? 'border-orange-500/50 hover:bg-orange-500/5' : 
                              'hover:bg-muted/50'}
                          `}
                          onClick={() => navigate(`/admin/session/${session.id}`)}
                        >
                          {isHighPriority && (
                            <div className="absolute -top-2 -right-2">
                              <div className="relative">
                                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                                <Sparkles className="w-6 h-6 text-primary absolute top-0 left-0 animate-ping" />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`
                                w-3 h-3 rounded-full 
                                ${isHighPriority ? 'bg-primary animate-pulse' : 
                                  isMediumPriority ? 'bg-orange-500' : 'bg-muted-foreground'}
                              `} />
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-lg">
                                    {session.contact_name || 'Anonymous Visitor'}
                                  </p>
                                  {session.summary && (
                                    <Badge variant="outline" className="gap-1">
                                      <FileText className="w-3 h-3" />
                                      Summary
                                    </Badge>
                                  )}
                                  {session.cta_chosen && (
                                    <Badge variant="default" className="gap-1">
                                      <Target className="w-3 h-3" />
                                      CTA
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>{new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                                  <span>•</span>
                                  <span>{session.duration || 'Unknown'}</span>
                                  {session.email && (
                                    <>
                                      <span>•</span>
                                      <span className="text-primary">{session.email}</span>
                                    </>
                                  )}
                                </div>
                                
                                {session.final_intent && (
                                  <div className="mt-2">
                                    <Badge variant={getIntentBadgeVariant(session.final_intent)}>
                                      {session.final_intent.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className={`
                                  text-2xl font-bold 
                                  ${isHighPriority ? 'text-primary' : 
                                    isMediumPriority ? 'text-orange-500' : 'text-muted-foreground'}
                                `}>
                                  {session.lead_score || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">Score</div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredSessions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No sessions found matching your criteria
                      </div>
                    )}
                    
                    {filteredSessions.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          // Find the tabs trigger for sessions and click it
                          const sessionsTab = document.querySelector('[role="tab"][data-state][value="sessions"]') as HTMLButtonElement;
                          if (sessionsTab) {
                            sessionsTab.click();
                          } else {
                            // Fallback: Try to find any element with value="sessions" 
                            const anySessionsElement = document.querySelector('[value="sessions"]') as HTMLElement;
                            if (anySessionsElement) anySessionsElement.click();
                          }
                        }}
                      >
                        View All {filteredSessions.length} Sessions
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <Select value={intentFilter} onValueChange={setIntentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Intents</SelectItem>
                        <SelectItem value="consulting_inquiry">Consulting</SelectItem>
                        <SelectItem value="partnership_vendor">Partnership</SelectItem>
                        <SelectItem value="speaking_request">Speaking</SelectItem>
                        <SelectItem value="advice_request">Advice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Input 
                    placeholder="Search by email or name..." 
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sessions Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : sessionsError ? (
                  <div className="flex items-center justify-center py-8 text-destructive">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Error loading sessions: {sessionsError}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>CTA</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No sessions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSessions.map((session) => (
                          <TableRow 
                            key={session.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => navigate(`/admin/session/${session.id}`)}
                          >
                            <TableCell>
                              <div>
                                <p>{new Date(session.started_at).toLocaleDateString()}</p>
                                <p className="text-xs text-muted-foreground">{new Date(session.started_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{session.contact_name || 'Anonymous'}</p>
                                {session.email && (
                                  <p className="text-sm text-muted-foreground">{session.email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {session.final_intent ? (
                                <Badge variant={getIntentBadgeVariant(session.final_intent)}>
                                  {session.final_intent.replace('_', ' ')}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getScoreBadgeVariant(session.lead_score || 0)}>
                                {session.lead_score || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {session.cta_chosen ? (
                                <Badge variant="outline">{session.cta_chosen.replace('_', ' ')}</Badge>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>{session.duration}</TableCell>
                            <TableCell>
                              {session.summary ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/session/${session.id}`);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Coming Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced analytics including intent trends, conversion funnels, and lead scoring insights will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configuration options for API keys, notification thresholds, and data retention will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AuthGuard>
  );
};

export default Admin;