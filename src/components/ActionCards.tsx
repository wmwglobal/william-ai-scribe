import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  User, 
  Clock, 
  Flag,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ActionItem {
  id: string;
  text: string;
  owner: 'you' | 'agent' | 'prospect';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  category?: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

interface ActionCardsProps {
  actions: ActionItem[];
  onComplete: (id: string) => void;
  onSchedule: (id: string, date: string) => void;
  onDelegate: (id: string, owner: string) => void;
  className?: string;
  showFloating?: boolean;
}

const priorityConfig = {
  high: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: Flag,
    label: 'High Priority'
  },
  medium: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: AlertCircle,
    label: 'Medium Priority'
  },
  low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Circle,
    label: 'Low Priority'
  }
};

const ownerConfig = {
  you: {
    icon: User,
    label: 'You',
    color: 'text-primary'
  },
  agent: {
    icon: Zap,
    label: 'AI William',
    color: 'text-purple-500'
  },
  prospect: {
    icon: Target,
    label: 'Prospect',
    color: 'text-green-500'
  }
};

export function ActionCards({
  actions,
  onComplete,
  onSchedule,
  onDelegate,
  className,
  showFloating = true
}: ActionCardsProps) {
  const [visibleActions, setVisibleActions] = useState<ActionItem[]>([]);
  const [floatingAction, setFloatingAction] = useState<ActionItem | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);

  useEffect(() => {
    // Show new actions with animation
    const newActions = actions.filter(
      a => !visibleActions.find(v => v.id === a.id)
    );
    
    newActions.forEach((action, index) => {
      setTimeout(() => {
        if (showFloating && !action.completed) {
          setFloatingAction(action);
          setTimeout(() => setFloatingAction(null), 3000);
        }
        setVisibleActions(prev => [...prev, action]);
      }, index * 500);
    });
  }, [actions]);

  const handleComplete = (id: string) => {
    setCelebratingId(id);
    onComplete(id);
    
    // Celebration animation
    setTimeout(() => {
      setCelebratingId(null);
      toast.success('Task completed! Great job! 🎉');
    }, 1500);
  };

  const getDueDateColor = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'text-red-600 bg-red-100';
    if (daysUntil === 0) return 'text-orange-600 bg-orange-100';
    if (daysUntil <= 3) return 'text-amber-600 bg-amber-100';
    return 'text-blue-600 bg-blue-100';
  };

  const pendingActions = visibleActions.filter(a => !a.completed);
  const completedActions = visibleActions.filter(a => a.completed);

  return (
    <>
      {/* Floating new action notification */}
      <AnimatePresence>
        {floatingAction && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50"
          >
            <Card className="p-4 shadow-xl border-primary/30 bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">New Action Item!</p>
                  <p className="text-xs text-muted-foreground">{floatingAction.text}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action cards container */}
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">Action Items</h3>
            <Badge variant="secondary" className="text-xs">
              {pendingActions.length} pending
            </Badge>
          </div>
          {completedActions.length > 0 && (
            <Badge variant="outline" className="text-xs text-green-600">
              <CheckCheck className="w-3 h-3 mr-1" />
              {completedActions.length} completed
            </Badge>
          )}
        </div>

        {/* Pending actions */}
        <div className="space-y-2">
          <AnimatePresence>
            {pendingActions.map((action) => {
              const priority = priorityConfig[action.priority];
              const owner = ownerConfig[action.owner];
              const OwnerIcon = owner.icon;
              const PriorityIcon = priority.icon;
              const isCelebrating = celebratingId === action.id;

              return (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    scale: isCelebrating ? [1, 1.05, 1] : 1
                  }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={cn(
                    "p-3 transition-all duration-300 hover:shadow-md",
                    priority.borderColor,
                    "border",
                    isCelebrating && "ring-2 ring-green-500 ring-offset-2"
                  )}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => handleComplete(action.id)}
                      >
                        {isCelebrating ? (
                          <motion.div
                            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </motion.div>
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                        )}
                      </Button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{action.text}</p>
                        
                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Owner */}
                          <Badge variant="outline" className="text-xs">
                            <OwnerIcon className={cn("w-3 h-3 mr-1", owner.color)} />
                            {owner.label}
                          </Badge>

                          {/* Priority */}
                          <Badge className={cn("text-xs", priority.bgColor, priority.color)}>
                            <PriorityIcon className="w-3 h-3 mr-1" />
                            {priority.label}
                          </Badge>

                          {/* Due date */}
                          {action.dueDate && (
                            <Badge className={cn("text-xs", getDueDateColor(action.dueDate))}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(action.dueDate).toLocaleDateString()}
                            </Badge>
                          )}

                          {/* Category */}
                          {action.category && (
                            <Badge variant="secondary" className="text-xs">
                              {action.category}
                            </Badge>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              onSchedule(action.id, tomorrow.toISOString());
                            }}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            Schedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onDelegate(action.id, 'agent')}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Delegate
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Celebration particles */}
                    {isCelebrating && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                      >
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            initial={{ 
                              x: '50%', 
                              y: '50%',
                              scale: 0
                            }}
                            animate={{ 
                              x: `${50 + (Math.random() - 0.5) * 100}%`,
                              y: `${50 + (Math.random() - 0.5) * 100}%`,
                              scale: [0, 1, 0]
                            }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                          >
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Completed actions (collapsed by default) */}
        {completedActions.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Show completed ({completedActions.length})
            </summary>
            <div className="mt-2 space-y-2 opacity-60">
              {completedActions.map((action) => (
                <Card key={action.id} className="p-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <p className="text-sm line-through text-muted-foreground">
                      {action.text}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </details>
        )}

        {/* Empty state */}
        {visibleActions.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No action items yet. They'll appear here as we talk!
            </p>
          </Card>
        )}
      </div>
    </>
  );
}