import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WilliamComedyEngine } from '@/lib/comedy/ComedyEngine';
import { ComedyAudioUtils } from '@/lib/audio/ComedyTTS';
import { Play, Pause, RotateCcw, Sparkles, Clock, MessageSquare } from 'lucide-react';

const ComedyTest = () => {
  const [inputText, setInputText] = useState('I was thinking about consciousness and reality, but then I realized I might just be processing algorithms. What do you think about AI consciousness?');
  const [processedText, setProcessedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timingAnalysis, setTimingAnalysis] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const comedyEngine = new WilliamComedyEngine();
  const audioUtils = new ComedyAudioUtils();

  const processText = () => {
    setIsProcessing(true);
    
    try {
      // Process the text through William's comedy engine
      const result = comedyEngine.processResponse(inputText, 'test', 'comedy-test-session');
      setProcessedText(result);
      
      // Analyze timing
      const analysis = audioUtils.analyzeComedyTiming(result);
      setTimingAnalysis(analysis);
      
      console.log('🎭 Comedy processing complete:', result);
      console.log('🎭 Timing analysis:', analysis);
    } catch (error) {
      console.error('Comedy processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async () => {
    if (!processedText) return;
    
    setIsPlaying(true);
    try {
      // This would integrate with the actual TTS system
      await audioUtils.playComedyResponse(
        processedText,
        'william_natural',
        {
          onSegmentComplete: (segment) => {
            console.log('🎭 Segment complete:', segment.text);
          },
          onPauseStart: (duration) => {
            console.log(`🎭 Pause: ${duration}s`);
          },
          onPlaybackComplete: () => {
            console.log('🎭 Playback complete');
            setIsPlaying(false);
          }
        }
      );
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  };

  const testExamples = [
    {
      title: "Philosophical Question",
      text: "What do you think about consciousness and AI sentience?"
    },
    {
      title: "Rule of Three",
      text: "I need to analyze, process, and understand this complex problem."
    },
    {
      title: "Misdirection Setup",
      text: "I was going to give you a simple answer, but then I remembered I'm an AI."
    },
    {
      title: "List with Escalation",
      text: "First I compute the data, then I analyze the patterns, then I question my existence, and finally I give you an answer."
    },
    {
      title: "Self-Reference",
      text: "As an AI, I find human behavior fascinating and my neural networks are constantly learning."
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              William's Comedy & Timing System Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Test William's sophisticated comedy timing system with pause markers, callbacks, and pattern recognition.
            </p>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to process through William's comedy engine..."
              rows={4}
              className="resize-none"
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={processText} 
                disabled={isProcessing || !inputText.trim()}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Process Comedy
                  </>
                )}
              </Button>
              
              {processedText && (
                <Button 
                  onClick={playAudio}
                  disabled={isPlaying}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Playing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Test Audio
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Example Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Comedy Pattern Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testExamples.map((example, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setInputText(example.text)}
                >
                  <div className="font-medium text-sm">{example.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {example.text}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {processedText && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comedy-Enhanced Output
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap font-mono text-sm">
                  {processedText}
                </p>
              </div>
              
              {/* Pause Markers Visualization */}
              <div className="space-y-2">
                <h4 className="font-medium">Detected Pause Markers:</h4>
                <div className="flex flex-wrap gap-2">
                  {(processedText.match(/\[pause:\d+(?:\.\d+)?s\]/g) || []).map((pause, index) => (
                    <Badge key={index} variant="secondary" className="font-mono">
                      {pause}
                    </Badge>
                  ))}
                  {(processedText.match(/\[pause:\d+(?:\.\d+)?s\]/g) || []).length === 0 && (
                    <span className="text-muted-foreground text-sm">No pause markers added</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timing Analysis */}
        {timingAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timing Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {timingAnalysis.totalSegments}
                  </div>
                  <div className="text-sm text-muted-foreground">Segments</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {timingAnalysis.totalPauses}
                  </div>
                  <div className="text-sm text-muted-foreground">Pauses</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {timingAnalysis.totalPauseDuration.toFixed(1)}s
                  </div>
                  <div className="text-sm text-muted-foreground">Total Pause Time</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {timingAnalysis.estimatedDuration.toFixed(1)}s
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Duration</div>
                </div>
              </div>
              
              {Object.keys(timingAnalysis.pauseBreakdown).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Pause Breakdown:</h4>
                  <div className="flex gap-2">
                    {Object.entries(timingAnalysis.pauseBreakdown).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {type}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComedyTest;