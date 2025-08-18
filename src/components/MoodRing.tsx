import { getPersonalityById } from '@/lib/models';

interface MoodRingProps {
  currentMode: string;
  className?: string;
}

export const MoodRing = ({ currentMode, className = "" }: MoodRingProps) => {
  const personality = getPersonalityById(currentMode);
  
  if (!personality) return null;

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border text-xs font-medium transition-all ${className}`}
      title={`AI William is in ${personality.name} mode`}
    >
      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${personality.color} animate-pulse`} />
      <span className="text-muted-foreground">{personality.name}</span>
    </div>
  );
};