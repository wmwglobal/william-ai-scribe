import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Download, Play, Settings, Users, TrendingUp, Clock } from 'lucide-react';

// Mock data for demonstration
const mockSessions = [
  {
    id: '1',
    started_at: '2024-01-15T10:30:00Z',
    ended_at: '2024-01-15T10:45:00Z',
    visitor_id: 'visitor_123',
    intent: 'consulting_inquiry',
    lead_score: 85,
    email: 'john@acme.com',
    contact_name: 'John Smith',
    cta_chosen: 'book_call',
    duration: '15m'
  },
  {
    id: '2',
    started_at: '2024-01-15T14:20:00Z',
    ended_at: '2024-01-15T14:35:00Z',
    visitor_id: 'visitor_456',
    intent: 'partnership_vendor',
    lead_score: 65,
    email: null,
    contact_name: null,
    cta_chosen: 'share_deck',
    duration: '15m'
  },
  {
    id: '3',
    started_at: '2024-01-14T16:45:00Z',
    ended_at: '2024-01-14T17:00:00Z',
    visitor_id: 'visitor_789',
    intent: 'advice_request',
    lead_score: 25,
    email: null,
    contact_name: null,
    cta_chosen: null,
    duration: '15m'
  }
];

const Admin = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [intentFilter, setIntentFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getIntentBadgeVariant = (intent: string) => {
    const highValue = ['consulting_inquiry', 'partnership_vendor', 'speaking_request'];
    return highValue.includes(intent) ? 'default' : 'secondary';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'outline';
  };

  return (
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
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">+12% from last week</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High-Quality Leads</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">Score ≥70</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12m</div>
                  <p className="text-xs text-muted-foreground">+2m from last week</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">33%</div>
                  <p className="text-xs text-muted-foreground">CTAs clicked</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent High-Value Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSessions.filter(s => s.lead_score >= 60).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="font-medium">{session.contact_name || 'Anonymous'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.started_at).toLocaleDateString()} • {session.duration}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getIntentBadgeVariant(session.intent)}>
                          {session.intent.replace('_', ' ')}
                        </Badge>
                        <Badge variant={getScoreBadgeVariant(session.lead_score)}>
                          {session.lead_score}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  
                  <Input placeholder="Search by email or name..." className="max-w-sm" />
                </div>
              </CardContent>
            </Card>

            {/* Sessions Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>CTA</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {new Date(session.started_at).toLocaleDateString()}
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
                          <Badge variant={getIntentBadgeVariant(session.intent)}>
                            {session.intent.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getScoreBadgeVariant(session.lead_score)}>
                            {session.lead_score}
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
                          <Button variant="ghost" size="sm">
                            <Play className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
  );
};

export default Admin;