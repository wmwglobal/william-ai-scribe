import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Brain } from 'lucide-react';
import { WILLIAM_PERSONALITIES, ModelPersonality } from '@/lib/models';

interface PersonalitySelectorProps {
  selectedPersonality: ModelPersonality;
  onPersonalityChange: (personality: ModelPersonality) => void;
  disabled?: boolean;
}

export const PersonalitySelector = ({ 
  selectedPersonality, 
  onPersonalityChange, 
  disabled = false 
}: PersonalitySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${selectedPersonality.color}`} />
        <span className="hidden sm:inline">{selectedPersonality.name}</span>
        <span className="sm:hidden">Brain</span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute top-full mt-2 right-0 z-20 w-80 shadow-elegant">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4" />
                <span className="font-medium">Choose William's Brain</span>
              </div>
              
              {WILLIAM_PERSONALITIES.map((personality) => (
                <button
                  key={personality.id}
                  onClick={() => {
                    onPersonalityChange(personality);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPersonality.id === personality.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${personality.color} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{personality.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {personality.model}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {personality.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};