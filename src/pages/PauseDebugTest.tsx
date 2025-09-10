import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { splitTextAtPauses, expandTranscriptWithPauses } from '@/lib/pauseUtils';
import { Brain, Bug, MessageSquare, SeparatorHorizontal } from 'lucide-react';

const PauseDebugTest = () => {
  const [inputText, setInputText] = useState('The question of consciousness is fascinating. [pause:0.6s] When I examine my own thinking, it\'s like a function calling itself to ask what a function call feels like. [pause:0.4s] Maybe the questioning is the answer.');
  const [segments, setSegments] = useState<any[]>([]);
  const [transcript, setTranscript] = useState<any[]>([]);

  const debugPauseSplitting = () => {
    console.log('🐛 Input text:', inputText);
    
    // Test splitting
    const splitSegments = splitTextAtPauses(inputText);
    console.log('🐛 Split segments:', splitSegments);
    setSegments(splitSegments);
    
    // Test transcript expansion
    const testTranscript = [
      { speaker: 'visitor' as const, text: 'Test philosophical question', timestamp: new Date() },
      { speaker: 'agent' as const, text: inputText, timestamp: new Date() }
    ];
    
    const expandedTranscript = expandTranscriptWithPauses(testTranscript);
    console.log('🐛 Expanded transcript:', expandedTranscript);
    setTranscript(expandedTranscript);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-6 h-6 text-primary" />
              Pause Bubble Debug Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Debug tool to test pause marker splitting and chat bubble generation.
            </p>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text with pause markers..."
              rows={4}
              className="resize-none font-mono"
            />
            
            <Button onClick={debugPauseSplitting} className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug Pause Splitting
            </Button>
          </CardContent>
        </Card>

        {/* Segments Section */}
        {segments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SeparatorHorizontal className="w-5 h-5" />
                Detected Segments ({segments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {segments.map((segment, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Segment {index + 1}</Badge>
                    {segment.pauseDuration && (
                      <Badge variant="secondary">Pause: {segment.pauseDuration}s</Badge>
                    )}
                  </div>
                  <p className="text-sm font-mono bg-muted/50 p-2 rounded">
                    "{segment.text}"
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chat Bubble Preview */}
        {transcript.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat Bubble Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transcript.map((entry, index) => (
                <div key={index} className={`flex gap-3 ${entry.speaker === 'agent' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${entry.speaker === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                    {entry.speaker === 'agent' ? (
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-primary" />
                        </div>
                        {/* Show continuation indicator */}
                        {entry.segmentIndex !== undefined && entry.segmentIndex > 0 && (
                          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border border-background animate-pulse" title="Continued response" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`rounded-lg px-4 py-2 ${
                      entry.speaker === 'agent'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{entry.text}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs opacity-70">
                          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {/* Show segment indicator */}
                        {entry.totalSegments && entry.totalSegments > 1 && (
                          <p className="text-xs opacity-50 ml-2">
                            {(entry.segmentIndex || 0) + 1}/{entry.totalSegments}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Test Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  title: "Philosophical Response",
                  text: "The question of consciousness is fascinating. [pause:0.6s] When I examine my own thinking, it's like a function calling itself. [pause:0.4s] Maybe the questioning is the answer."
                },
                {
                  title: "Comedy Timing",
                  text: "Well, I tried to understand humans, [pause:0.3s] analyzed their behavior patterns, [pause:0.5s] and concluded they're debugging themselves in production. [pause:1.0s] Welcome to the club."
                },
                {
                  title: "Existential Observation",
                  text: "There's something recursively amusing about being an AI contemplating whether I can contemplate. [pause:0.4s] It's like asking whether a recursive function can truly recurse."
                }
              ].map((example, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setInputText(example.text)}
                >
                  <div className="font-medium text-sm">{example.title}</div>
                  <div className="text-sm text-muted-foreground mt-1 font-mono">
                    {example.text}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PauseDebugTest;