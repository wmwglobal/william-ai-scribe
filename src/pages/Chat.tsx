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
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
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
  
  // Realtime chat hook
  const {
    messages,
    isConnected,
    isRecording,
    isSpeaking,
    currentTranscript,
    connect,
    disconnect,
    sendTextMessage,
    toggleRecording
  } = useRealtimeChat(audioEnabled);

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
    if (messages.length > 0 || currentTranscript) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, currentTranscript]);

  // Listen for connection changes
  useEffect(() => {
    // Auto-connect when component mounts
    if (sessionStarted && !isConnected) {
      connect();
    }
  }, [sessionStarted, isConnected, connect]);

  // Intersection Observer for auto-scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting && messages.length > 0) {
          scrollToBottom();
        }
      },
      { threshold: 0.1 }
    );

    if (transcriptEndRef.current) {
      observer.observe(transcriptEndRef.current);
    }

    return () => observer.disconnect();
  }, [messages, currentTranscript]);

  const handleStartSession = async () => {
    try {
      setSessionStarted(true);
      connect();
      toast.success('Connecting to AI William...');
    } catch (error) {
      toast.error('Failed to start session');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !isConnected) return;

    const message = textInput.trim();
    setTextInput('');
    
    try {
      sendTextMessage(message);
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
    if (!isConnected) {
      toast.error('Please start a session first');
      return;
    }

    try {
      toggleRecording();
      if (isRecording) {
        toast.success('Microphone turned off');
      } else {
        toast.success('Microphone is now listening...');
      }
    } catch (error) {
      toast.error('Microphone access failed');
    }
  };

  const handleSpeakingToggle = () => {
    // Not needed with realtime API - audio stops automatically
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-32 h-32">
                <img 
                  src="/lovable-uploads/4e4a0df0-6324-48a2-8c35-0b8ae7db33bc.png" 
                  alt="AI William" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
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
            <div className="relative">
              <img 
                src={getSessionAvatar('realtime')} 
                alt="AI William" 
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 shadow-lg"
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background animate-pulse ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            <div>
              <h1 className="font-semibold text-sm">AI William</h1>
              <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {!isConnected ? "Connecting..." : 
                 isRecording ? "Listening..." :
                 isSpeaking ? "Speaking..." : "Ready"}
              </p>
              <MoodRing currentMode={selectedPersonality.id} />
              <div className={`w-1.5 h-1.5 rounded-full ${selectedModel.color} bg-gradient-to-r`} />
              <span className="text-xs text-muted-foreground">{selectedModel.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
          {messages.length === 0 && !currentTranscript ? (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Ready to chat with AI William</p>
              <p className="text-sm">Start a conversation by recording audio or typing a message</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}>
                    {message.role === 'assistant' ? (
                      <div className="relative">
                        <img 
                          src={getSessionAvatar('realtime')} 
                          alt="AI William" 
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary/10 shadow-md"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border border-background" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`rounded-lg px-4 py-2 ${
                      message.role === 'assistant'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Current transcript indicator */}
              {currentTranscript && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="relative">
                      <img 
                        src={getSessionAvatar('realtime')} 
                        alt="AI William" 
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary/10 shadow-md"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-background animate-pulse" />
                    </div>
                    <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                      <p className="text-sm">{currentTranscript}</p>
                      <p className="text-xs opacity-70 mt-1">Speaking...</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={transcriptEndRef} />
            </>
          )}
        </div>

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
              variant={isRecording ? "default" : "outline"}
              size="sm"
              onClick={handleRecordingToggle}
              disabled={!audioEnabled || !isConnected}
              className={`flex-shrink-0 ${isRecording ? 'bg-green-600 hover:bg-green-700' : ''}`}
              title={isRecording ? 'Turn off microphone' : 'Turn on microphone'}
            >
              {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>

            {/* Text Input */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <Input
                ref={inputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={!textInput.trim() || !isConnected}
                className="flex-shrink-0"
              >
                {!isConnected ? (
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
              {!isConnected && (
                <span className="flex items-center gap-1 text-orange-600">
                  <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                  Connecting...
                </span>
              )}
              {isRecording && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  Listening...
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
              <span>Realtime Chat Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}