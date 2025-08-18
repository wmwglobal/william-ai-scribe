import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  User, 
  Bot,
  Loader2,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { ModelSelector } from '@/components/ModelSelector';
import { PersonalitySelector } from '@/components/PersonalitySelector';
import { MoodRing } from '@/components/MoodRing';
import { ConversationInsights } from '@/components/ConversationInsights';
import { GROQ_MODELS, WILLIAM_PERSONALITIES, getDefaultModel, getDefaultPersonality } from '@/lib/models';
import { getScoreBadgeVariant } from '@/lib/leadScore';
import { getSessionAvatar } from '@/lib/avatarUtils';

export default function Chat() {
  // State for model/personality selection
  const [selectedModel, setSelectedModel] = useState(getDefaultModel());
  const [selectedPersonality, setSelectedPersonality] = useState(getDefaultPersonality());
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Voice chat hook
  const {
    sessionId,
    isRecording,
    isSpeaking,
    isTyping,
    currentIntent,
    leadScore,
    latestExtract,
    transcript,
    debugCommands,
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  } = useVoiceChat(audioEnabled, selectedModel.id, selectedPersonality);

  // State for UI
  const [sessionStarted, setSessionStarted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [autoInitiated, setAutoInitiated] = useState(false);

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (transcript.length > 0 || isTyping) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [transcript, isTyping]);

  // Listen for new extracts from the latest agent reply
  useEffect(() => {
    // This would be updated by the voice chat hook if we had real-time extract updates
    // For now, we'll use a simple approach
  }, [transcript]);

  // Intersection Observer for auto-scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting && transcript.length > 0) {
          scrollToBottom();
        }
      },
      { threshold: 0.1 }
    );

    if (transcriptEndRef.current) {
      observer.observe(transcriptEndRef.current);
    }

    return () => observer.disconnect();
  }, [transcript, isTyping]);

  const handleStartSession = async () => {
    try {
      await createSession(true);
      setSessionStarted(true);
      toast.success('Session started successfully');
      
      // Auto-initiate conversation after a short delay
      setTimeout(() => {
        if (!autoInitiated && transcript.length === 0) {
          setAutoInitiated(true);
          sendTextMessage("Hi! I'm William. I noticed you just started a chat - what brings you here today? Are you working on something interesting?");
        }
      }, 3000);
    } catch (error) {
      toast.error('Failed to start session');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !sessionId) return;

    const message = textInput.trim();
    setTextInput('');
    
    try {
      await sendTextMessage(message);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  const handleRecordingToggle = async () => {
    if (!sessionId) {
      toast.error('Please start a session first');
      return;
    }

    try {
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } catch (error) {
      toast.error('Microphone access failed');
    }
  };

  const handleSpeakingToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <Brain className="w-12 h-12 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">Chat with AI William</h1>
              <p className="text-muted-foreground">
                Start a conversation with AI William to explore ideas, get advice, or discuss your projects.
              </p>
            </div>

            <div className="space-y-4">
              <PersonalitySelector
                selectedPersonality={selectedPersonality}
                onPersonalityChange={setSelectedPersonality}
              />
              
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Audio Enabled</span>
                <Button
                  variant={audioEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleStartSession} 
              className="w-full"
              size="lg"
            >
              Start Conversation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-sm border-b p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={getSessionAvatar(sessionId || '')} 
              alt="AI William" 
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <h1 className="font-semibold text-sm">AI William</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {!sessionStarted ? "Ready to start" : 
                   isSpeaking ? "Speaking..." : "Ready"}
                </p>
                <MoodRing currentMode={selectedPersonality.id} />
                <div className={`w-1.5 h-1.5 rounded-full ${selectedModel.color} bg-gradient-to-r`} />
                <span className="text-xs text-muted-foreground">{selectedModel.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentIntent && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Intent: {currentIntent.replace('_', ' ')}
              </Badge>
            )}
            {leadScore > 0 && (
              <Badge variant={getScoreBadgeVariant(leadScore)} className="hidden sm:inline-flex">
                Score: {leadScore}
              </Badge>
            )}
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <PersonalitySelector
              selectedPersonality={selectedPersonality}
              onPersonalityChange={setSelectedPersonality}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {transcript.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Ready to chat with AI William</p>
              <p className="text-sm">Start a conversation by recording audio or typing a message</p>
            </div>
          ) : (
            <>
              {transcript.map((entry, index) => (
                <div key={index} className={`flex gap-3 ${entry.speaker === 'agent' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${entry.speaker === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                    {entry.speaker === 'agent' ? (
                      <img 
                        src={getSessionAvatar(sessionId || '')} 
                        alt="AI William" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`rounded-lg px-4 py-2 ${
                      entry.speaker === 'agent'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{entry.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <img 
                      src={getSessionAvatar(sessionId || '')} 
                      alt="AI William" 
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">William is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={transcriptEndRef} />
            </>
          )}
        </div>

        {/* Conversation Insights */}
        {(latestExtract || currentIntent || leadScore > 0) && (
          <div className="px-4 pb-4">
            <ConversationInsights 
              extract={latestExtract}
              leadScore={leadScore}
              currentIntent={currentIntent}
              isVisible={true}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="bg-background/90 backdrop-blur-sm border-t p-4">
          <div className="flex items-center gap-2">
            {/* Audio Controls */}
            <Button
              variant={audioEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="flex-shrink-0"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={handleRecordingToggle}
              disabled={!audioEnabled}
              className="flex-shrink-0"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            {isSpeaking && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSpeakingToggle}
                className="flex-shrink-0"
              >
                <VolumeX className="w-4 h-4" />
              </Button>
            )}

            {/* Text Input */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <Input
                ref={inputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={isTyping}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={!textInput.trim() || isTyping}
                className="flex-shrink-0"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {isRecording && (
                <span className="flex items-center gap-1 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Recording...
                </span>
              )}
              {isSpeaking && (
                <span className="flex items-center gap-1 text-blue-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Playing...
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {sessionId && (
                <span>Session: {sessionId.slice(0, 8)}...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}