import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Clock, Hash, Star, Zap, Heart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Memory {
  id: string;
  content: string;
  summary: string;
  importance: number;
  scope: 'short' | 'medium' | 'long' | 'episodic';
  tags?: string[];
  timestamp: Date;
  isNew?: boolean;
  similarity?: number;
}

interface MemoryTimelineProps {
  memories: Memory[];
  currentSessionId?: string;
  isRecalling?: boolean;
  className?: string;
}

const scopeConfig = {
  short: { 
    icon: Clock, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10',
    label: 'Recent',
    glow: 'shadow-blue-500/50'
  },
  medium: { 
    icon: Hash, 
    color: 'text-purple-500', 
    bgColor: 'bg-purple-500/10',
    label: 'Contextual',
    glow: 'shadow-purple-500/50'
  },
  long: { 
    icon: Star, 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10',
    label: 'Core',
    glow: 'shadow-amber-500/50'
  },
  episodic: { 
    icon: Heart, 
    color: 'text-rose-500', 
    bgColor: 'bg-rose-500/10',
    label: 'Special',
    glow: 'shadow-rose-500/50'
  }
};

export function MemoryTimeline({ 
  memories, 
  currentSessionId, 
  isRecalling = false,
  className 
}: MemoryTimelineProps) {
  const [visibleMemories, setVisibleMemories] = useState<Memory[]>([]);
  const [pulsingMemoryId, setPulsingMemoryId] = useState<string | null>(null);

  useEffect(() => {
    // Animate new memories appearing
    const newMemories = memories.filter(m => m.isNew);
    newMemories.forEach((memory, index) => {
      setTimeout(() => {
        setVisibleMemories(prev => [...prev, memory]);
        setPulsingMemoryId(memory.id);
        
        // Stop pulsing after animation
        setTimeout(() => setPulsingMemoryId(null), 2000);
      }, index * 300);
    });

    // Show existing memories immediately
    const existingMemories = memories.filter(m => !m.isNew);
    setVisibleMemories(prev => [...existingMemories, ...prev]);
  }, [memories]);

  const getImportanceIcon = (importance: number) => {
    if (importance >= 9) return <Zap className="w-3 h-3" />;
    if (importance >= 7) return <TrendingUp className="w-3 h-3" />;
    if (importance >= 5) return <Star className="w-3 h-3" />;
    return null;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">Memory Timeline</h3>
        {isRecalling && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </motion.div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />

        {/* Memory items */}
        <AnimatePresence>
          {visibleMemories.map((memory, index) => {
            const config = scopeConfig[memory.scope];
            const Icon = config.icon;
            const isPulsing = pulsingMemoryId === memory.id;
            const isBeingRecalled = isRecalling && memory.similarity && memory.similarity > 0.5;

            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: isPulsing ? [1, 1.05, 1] : 1,
                }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.5,
                  scale: { duration: 1, repeat: isPulsing ? Infinity : 0 }
                }}
                className="relative mb-4 pl-12"
              >
                {/* Node on timeline */}
                <motion.div
                  className={cn(
                    "absolute left-4 w-4 h-4 rounded-full border-2 border-background",
                    config.bgColor,
                    isPulsing && "animate-pulse",
                    isBeingRecalled && `shadow-lg ${config.glow}`
                  )}
                  animate={isBeingRecalled ? {
                    scale: [1, 1.3, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(0,0,0,0)',
                      '0 0 20px 10px rgba(59,130,246,0.5)',
                      '0 0 0 0 rgba(0,0,0,0)'
                    ]
                  } : {}}
                  transition={{ duration: 1, repeat: isBeingRecalled ? Infinity : 0 }}
                />

                {/* Memory card */}
                <Card className={cn(
                  "p-3 transition-all duration-300",
                  isPulsing && "ring-2 ring-primary ring-offset-2",
                  isBeingRecalled && "bg-accent/50"
                )}>
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "p-2 rounded-lg",
                      config.bgColor
                    )}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {memory.importance >= 7 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            {getImportanceIcon(memory.importance)}
                          </div>
                        )}
                        {isBeingRecalled && (
                          <Badge className="text-xs bg-blue-500">
                            Recalling
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {memory.summary || memory.content}
                      </p>

                      {/* Tags */}
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {memory.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Similarity indicator */}
                      {memory.similarity && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Relevance</span>
                            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${memory.similarity * 100}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {Math.round(memory.similarity * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Floating animation for new memories */}
                {isPulsing && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                  >
                    <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-400" />
                    <Sparkles className="absolute bottom-0 left-0 w-4 h-4 text-yellow-400" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {visibleMemories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No memories yet. Start a conversation!</p>
          </div>
        )}
      </div>

      {/* Memory creation indicator */}
      {isRecalling && (
        <motion.div
          className="absolute top-4 right-4"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-xs font-medium">Accessing memories...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}