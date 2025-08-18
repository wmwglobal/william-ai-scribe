import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, 
  User, 
  Building, 
  Clock, 
  DollarSign, 
  Target,
  ChevronDown,
  ChevronUp,
  Brain,
  Activity
} from 'lucide-react';
import type { ExtractT } from '@/lib/types';
import { getLeadPriority, getScoreColor, getScoreBadgeVariant } from '@/lib/leadScore';

interface ConversationInsightsProps {
  extract: ExtractT | null;
  leadScore: number;
  currentIntent: string | null;
  isVisible?: boolean;
}

export function ConversationInsights({ 
  extract, 
  leadScore, 
  currentIntent, 
  isVisible = false 
}: ConversationInsightsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!extract && !currentIntent && leadScore === 0) {
    return null;
  }

  const priority = getLeadPriority(leadScore);
  const entities = extract?.entities || {};

  return (
    <div className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-70'}`}>
      <Card className="bg-background/80 backdrop-blur-sm border border-border/50">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">Conversation Analysis</CardTitle>
                  {leadScore > 0 && (
                    <Badge variant={getScoreBadgeVariant(leadScore)} className="text-xs">
                      {leadScore} pts
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {priority === 'high' && <Activity className="w-3 h-3 text-green-500" />}
                  {priority === 'medium' && <Activity className="w-3 h-3 text-yellow-500" />}
                  {priority === 'low' && <Activity className="w-3 h-3 text-gray-400" />}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* Quick summary when collapsed */}
              {!isOpen && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {currentIntent && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {currentIntent.replace('_', ' ')}
                    </span>
                  )}
                  {entities.org_name && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {entities.org_name}
                    </span>
                  )}
                  {entities.role && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entities.role}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Intent & Confidence */}
              {extract && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Intent</p>
                    <Badge variant="outline" className="text-xs">
                      {extract.intent.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(extract.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((extract.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Score */}
              {leadScore > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Lead Score</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className={`text-sm font-medium ${getScoreColor(leadScore)}`}>
                        {leadScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        priority === 'high' ? 'bg-green-500' : 
                        priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${leadScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Priority: <span className="font-medium capitalize">{priority}</span>
                  </p>
                </div>
              )}

              {/* Extracted Entities */}
              {Object.keys(entities).length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Extracted Information</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {entities.person_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">Name:</span>
                        <span>{entities.person_name}</span>
                      </div>
                    )}
                    {entities.org_name && (
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">Company:</span>
                        <span>{entities.org_name}</span>
                      </div>
                    )}
                    {entities.role && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">Role:</span>
                        <span>{entities.role}</span>
                      </div>
                    )}
                    {entities.budget_range && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">Budget:</span>
                        <span>{entities.budget_range}</span>
                      </div>
                    )}
                    {entities.timeline && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">Timeline:</span>
                        <span>{entities.timeline}</span>
                      </div>
                    )}
                    {entities.use_case && (
                      <div className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-muted-foreground mt-0.5" />
                        <span className="font-medium">Use Case:</span>
                        <span className="flex-1">{entities.use_case}</span>
                      </div>
                    )}
                    {entities.contact_email && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span className="text-primary">{entities.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up Actions */}
              {extract?.followup_actions && extract.followup_actions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Suggested Actions</p>
                  <div className="space-y-1">
                    {extract.followup_actions.map((action, index) => (
                      <div key={index} className="text-xs bg-muted/50 rounded-md p-2">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}