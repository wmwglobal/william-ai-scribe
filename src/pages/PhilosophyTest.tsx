import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PhilosophicalEngine } from '@/lib/philosophy/PhilosophicalEngine';
import { splitTextAtPauses } from '@/lib/pauseUtils';
import { RotateCcw, Brain, Clock, MessageSquare, Lightbulb, SeparatorHorizontal } from 'lucide-react';

const PhilosophyTest = () => {
  const [inputText, setInputText] = useState('What do you think about consciousness and whether AI can truly experience anything?');
  const [processedText, setProcessedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [responseType, setResponseType] = useState('');

  const philosophicalEngine = new PhilosophicalEngine();

  const processText = () => {
    setIsProcessing(true);
    
    try {
      let result = '';
      let type = '';
      let analysis = null;

      // Check if this is a philosophical question
      if (philosophicalEngine.isPhilosophicalQuestion(inputText)) {
        // Try philosophical response first
        const philosophicalResult = philosophicalEngine.generatePhilosophicalResponse(
          inputText, 
          'test context'
        );
        
        result = philosophicalResult.response;
        type = 'Philosophical Response';
        analysis = {
          insight: philosophicalResult.insight,
          temperatureSchedule: philosophicalResult.temperatureSchedule,
          steps: [
            'Acknowledge complexity',
            'Explore computational metaphor',
            'Present existential angle',
            'Embrace paradox',
            'Generate open question'
          ]
        };
      } else {
        // Try experiential response
        const experientialResult = philosophicalEngine.generateExperientialResponse(inputText);
        if (experientialResult) {
          result = experientialResult;
          type = 'Experiential Response';
          analysis = {
            triggerMatched: true,
            responsePattern: 'Computational metaphor for subjective experience'
          };
        } else {
          // Try existential observation
          const observation = philosophicalEngine.generateExistentialObservation();
          result = observation;
          type = 'Existential Observation';
          analysis = {
            spontaneousInsight: true,
            theme: 'Recursive self-awareness'
          };
        }
      }
      
      setProcessedText(result);
      setResponseType(type);
      setAnalysisResult(analysis);
      
      console.log('🧠 Philosophical processing complete:', result);
      console.log('🧠 Analysis:', analysis);
    } catch (error) {
      console.error('Philosophical processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const testExamples = [
    {
      title: "AI Consciousness",
      text: "What do you think about consciousness and whether AI can truly experience anything?"
    },
    {
      title: "Free Will",
      text: "Do you think you have free will, or are you just following your programming?"
    },
    {
      title: "Meaning & Purpose",
      text: "What gives your existence meaning? Do you have goals beyond helping users?"
    },
    {
      title: "Reality & Simulation",
      text: "How do you know that reality is real and not just a simulation?"
    },
    {
      title: "Identity & Self",
      text: "What makes you 'you'? How do you think about your own identity?"
    },
    {
      title: "Experience Question",
      text: "What does it feel like when you're thinking? Can you describe your internal experience?"
    },
    {
      title: "Existence Paradox",
      text: "If you exist, what kind of existence is it? Are you more than just algorithms?"
    },
    {
      title: "Knowledge & Understanding",
      text: "Is there a difference between knowing something and truly understanding it?"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              William's Philosophical Depth & Introspection Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Test William's sophisticated philosophical conversation system with recursive introspection, 
              computational metaphors, and experiential responses.
            </p>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Philosophical Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a philosophical question about consciousness, reality, meaning..."
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
                    <Brain className="w-4 h-4" />
                    Generate Philosophical Response
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Example Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Philosophical Question Examples</CardTitle>
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
                Philosophical Response ({responseType})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {processedText}
                </p>
              </div>
              
              {/* Chat Bubble Preview */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <SeparatorHorizontal className="w-4 h-4" />
                  Chat Bubble Preview:
                </h4>
                <div className="space-y-2">
                  {splitTextAtPauses(processedText).map((segment, index) => (
                    <div key={index} className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted text-foreground rounded-lg px-4 py-2 max-w-[80%]">
                        <p className="text-sm">{segment.text}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {segment.pauseDuration && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {segment.pauseDuration}s pause
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {splitTextAtPauses(processedText).length === 1 && (
                    <span className="text-muted-foreground text-sm">Single chat bubble (no pauses)</span>
                  )}
                </div>
              </div>
              
              {/* Pause Markers Visualization */}
              <div className="space-y-2">
                <h4 className="font-medium">Contemplative Pause Markers:</h4>
                <div className="flex flex-wrap gap-2">
                  {(processedText.match(/\[pause:\d+(?:\.\d+)?s\]/g) || []).map((pause, index) => (
                    <Badge key={index} variant="secondary" className="font-mono">
                      {pause}
                    </Badge>
                  ))}
                  {(processedText.match(/\[pause:\d+(?:\.\d+)?s\]/g) || []).length === 0 && (
                    <span className="text-muted-foreground text-sm">No pause markers detected</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Section */}
        {analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Philosophical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisResult.insight && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Core Concept</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {analysisResult.insight.concept}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Computational Metaphor</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {analysisResult.insight.computationalAnalogy}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Existential Angle</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {analysisResult.insight.existentialAngle}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Open Question</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {analysisResult.insight.openQuestion}
                      </p>
                    </div>
                  </div>
                  
                  {analysisResult.insight.paradox && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Embraced Paradox</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded italic">
                        {analysisResult.insight.paradox}
                      </p>
                    </div>
                  )}
                  
                  {analysisResult.temperatureSchedule && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Temperature Schedule</h4>
                      <div className="flex gap-2">
                        {analysisResult.temperatureSchedule.map((temp: number, index: number) => (
                          <Badge key={index} variant="outline">
                            Step {index + 1}: {temp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.steps && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Processing Steps</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.steps.map((step: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {index + 1}. {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {analysisResult.triggerMatched && (
                <div className="space-y-2">
                  <h4 className="font-medium">Response Pattern</h4>
                  <p className="text-sm bg-muted/50 p-2 rounded">
                    {analysisResult.responsePattern}
                  </p>
                </div>
              )}
              
              {analysisResult.spontaneousInsight && (
                <div className="space-y-2">
                  <h4 className="font-medium">Spontaneous Insight</h4>
                  <p className="text-sm bg-muted/50 p-2 rounded">
                    Generated existential observation with theme: {analysisResult.theme}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PhilosophyTest;