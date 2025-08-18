import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Volume2, VolumeX, Phone, User, Send, MessageSquare, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { getScoreBadgeVariant } from '@/lib/leadScore';
import { PersonalitySelector } from '@/components/PersonalitySelector';
import { ModelSelector } from '@/components/ModelSelector';
import { MoodRing } from '@/components/MoodRing';
import { getSessionAvatar } from '@/lib/avatarUtils';
import { WILLIAM_PERSONALITIES, Personality, GroqModel, getDefaultPersonality, getDefaultModel } from '@/lib/models';

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality>(getDefaultPersonality());
  const [selectedModel, setSelectedModel] = useState<GroqModel>(getDefaultModel());
  const [selectedAsrModel, setSelectedAsrModel] = useState<string>('distil-whisper-large-v3-en');
  const [currentAvatar, setCurrentAvatar] = useState<string>('');
  const [typingText, setTypingText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const {
    sessionId,
    isRecording,
    isSpeaking,
    isTyping,
    currentIntent,
    leadScore,
    transcript,
    debugCommands,
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  } = useVoiceChat(audioEnabled, selectedAsrModel, selectedPersonality);

  const startSession = async () => {
    try {
      // Test if audio can play (important for autoplay restrictions)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          console.log('🎵 Audio context suspended - will resume on user interaction');
          await audioContext.resume();
        }
        console.log('🎵 Audio context state:', audioContext.state);
      } catch (audioError) {
        console.warn('🎵 Audio context setup warning:', audioError);
      }
      
      // Create session with consent
      const newSessionId = await createSession(consent);
      setCurrentAvatar(getSessionAvatar(newSessionId));
      setSessionStarted(true);
      
      toast({
        title: "Session Started",
        description: "AI William is ready to chat with you! Audio should work now.",
      });
    } catch (error) {
      toast({
        title: "Session Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const endSession = () => {
    setSessionStarted(false);
    if (isSpeaking) stopSpeaking();
    navigate('/');
  };


  const handleSendText = async () => {
    if (!textMessage.trim() || isSpeaking || isTyping) return;
    
    const messageToSend = textMessage;
    setTextMessage(''); // Clear immediately when user presses send
    
    try {
      await sendTextMessage(messageToSend);
    } catch (error) {
      toast({
        title: "Message Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setTextMessage(messageToSend); // Restore message on error
    }
  };

  const handleEscalate = () => {
    toast({
      title: "Escalating to Human",
      description: "We'll connect you with a human representative shortly.",
    });
  };

  // Stochastic typing indicator with varied speed and effects
  useEffect(() => {
    if (!isTyping) {
      setTypingText('');
      return;
    }

    const typingMessages = [
      'thinking about your question...',
      'processing your message...',
      'analyzing the context...',
      'formulating a thoughtful response...',
      'considering different perspectives...',
      'reviewing what we\'ve discussed...',
      'crafting the perfect reply...',
      'almost ready to respond...',
      'putting thoughts together...',
      'drawing from experience...'
    ];

    let messageIndex = Math.floor(Math.random() * typingMessages.length);
    let charIndex = 0;
    let isDeleting = false;
    let hasTyped = false;
    
    const getTypingSpeed = () => {
      // Vary speed: sometimes fast bursts, sometimes slower thinking
      if (Math.random() < 0.3) return Math.random() * 50 + 30; // Fast burst
      if (Math.random() < 0.2) return Math.random() * 200 + 150; // Thinking pause
      return Math.random() * 80 + 60; // Normal speed
    };
    
    const typeInterval = setInterval(() => {
      const currentMessage = typingMessages[messageIndex];
      
      if (!isDeleting) {
        if (charIndex < currentMessage.length) {
          // Occasional backspace effect (typo correction)
          if (hasTyped && Math.random() < 0.05 && charIndex > 3) {
            charIndex = Math.max(0, charIndex - 2);
            setTypingText(currentMessage.substring(0, charIndex));
            return;
          }
          
          setTypingText(currentMessage.substring(0, charIndex + 1));
          charIndex++;
          hasTyped = true;
        } else {
          // Random pause before starting to delete
          setTimeout(() => { 
            isDeleting = true; 
          }, Math.random() * 1200 + 600);
        }
      } else {
        if (charIndex > Math.floor(currentMessage.length * 0.3)) {
          setTypingText(currentMessage.substring(0, charIndex - 1));
          charIndex--;
        } else {
          // Move to next message
          isDeleting = false;
          messageIndex = (messageIndex + 1) % typingMessages.length;
          hasTyped = false;
          setTimeout(() => {}, Math.random() * 300 + 100);
        }
      }
    }, isDeleting ? Math.random() * 40 + 30 : getTypingSpeed());

    return () => clearInterval(typeInterval);
  }, [isTyping]);

  // Auto-scroll transcript with intersection observer fallback
  useEffect(() => {
    const scrollToBottom = () => {
      if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };

    // Immediate scroll
    scrollToBottom();

    // Intersection observer fallback for better reliability
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
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

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-sm border-b p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
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
              disabled={sessionStarted}
            />
            <PersonalitySelector
              selectedPersonality={selectedPersonality}
              onPersonalityChange={setSelectedPersonality}
              disabled={sessionStarted}
            />
            
            {/* ASR Model Selector */}
            <select
              value={selectedAsrModel}
              onChange={(e) => setSelectedAsrModel(e.target.value)}
              disabled={sessionStarted}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="distil-whisper-large-v3-en">English (Fast)</option>
              <option value="whisper-large-v3-turbo">Multilingual</option>
            </select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                if (!audioEnabled && !sessionStarted) {
                  // If turning audio on and no session exists, start one automatically
                  try {
                    await startSession();
                    setAudioEnabled(true);
                  } catch (error) {
                    toast({
                      title: "Session Error",
                      description: "Failed to start session. Please try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  setAudioEnabled(!audioEnabled);
                }
              }}
              className="flex items-center gap-2"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{audioEnabled ? 'Audio On' : 'Audio Off'}</span>
            </Button>
            {sessionStarted && (
              <Button variant="outline" size="sm" onClick={handleEscalate}>
                Human Please
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {!sessionStarted ? (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md shadow-elegant">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-primary flex items-center justify-center overflow-hidden rounded-lg shadow-elegant">
                <img src={currentAvatar || getSessionAvatar('')} alt="AI William" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Chat with AI William</h2>
              <p className="text-muted-foreground mb-6">
                Start a conversation with AI William's digital twin. Choose from different personalities and models 
                for varied expertise and interaction styles.
              </p>
              
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={consent} 
                    onChange={(e) => setConsent(e.target.checked)}
                    className="rounded"
                  />
                  I consent to voice recording and follow-up contact
                </label>
              </div>
              
              <Button 
                onClick={startSession} 
                size="lg" 
                className="w-full shadow-glow"
                disabled={!consent}
              >
                Start Conversation
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Powered by AI William's voice cloning technology
              </p>
            </Card>
          </div>
        ) : (
          /* Active Chat Interface */
          <div className="flex-1 flex flex-col">
            {/* Visual Presentation Area */}
            <div className="flex-1 bg-card rounded-lg mb-6 p-8 shadow-card">
              <div className="text-center">
                <div className={`w-48 h-48 mx-auto mb-6 bg-gradient-primary flex items-center justify-center overflow-hidden rounded-lg shadow-elegant ${
                  isSpeaking ? 'speaking-indicator' : ''
                }`}>
                  <img src={currentAvatar} alt="AI William" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI William</h3>
                <p className="text-muted-foreground">
                  {isSpeaking ? "AI William speaking..." : isTyping ? "AI William thinking..." : "Ready"}
                </p>
              </div>
            </div>

            {/* Live Transcript Area */}
            <Card className="p-4 mb-6 min-h-[200px] max-h-[300px]">
              <h4 className="font-medium mb-2">Live Transcript</h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-3 pr-4">
                  {transcript.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Conversation will appear here...
                    </p>
                  ) : (
                    <>
                      {transcript.map((entry, index) => (
                      <div key={index} className={`text-sm p-2 rounded ${
                        entry.speaker === 'agent' 
                          ? 'bg-primary/10 ml-4' 
                          : 'bg-muted mr-4'
                      }`}>
                        <div className="font-medium text-xs mb-1">
                          {entry.speaker === 'agent' ? 'AI William' : 'You'}
                          <span className="text-muted-foreground ml-2">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div>{entry.text}</div>
                      </div>
                      ))}
                      {isTyping && (
                        <div className="text-sm p-2 rounded bg-primary/10 ml-4 animate-fade-in">
                          <div className="font-medium text-xs mb-1">
                            AI William
                            <span className="text-muted-foreground ml-2">
                              {new Date().toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{typingText}</span>
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse ml-1"></div>
                          </div>
                        </div>
                      )}
                      <div ref={transcriptEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Text Input Area */}
            <Card className="p-4 mb-6">
              <div className="flex gap-2">
                <Input
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  disabled={isSpeaking || isTyping}
                />
                <Button 
                  onClick={handleSendText}
                  disabled={!textMessage.trim() || isSpeaking || isTyping}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Extraction Chips */}
            {(currentIntent || leadScore > 0) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {currentIntent && (
                  <Badge variant="outline">
                    Intent: {currentIntent.replace('_', ' ')}
                  </Badge>
                )}
                {leadScore > 0 && (
                  <Badge variant={getScoreBadgeVariant(leadScore)}>
                    Lead Score: {leadScore}
                  </Badge>
                )}
              </div>
            )}

            {/* Debug Commands Section */}
            {debugCommands.length > 0 && (
              <Card className="p-4 mb-6">
                <h4 className="font-medium mb-2 text-sm">Debug Commands</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {debugCommands.slice(-5).map((cmd, index) => (
                    <div key={index} className="text-xs font-mono bg-muted p-2 rounded">
                      <span className="text-muted-foreground">
                        {cmd.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="ml-2">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

          {/* Voice Controls */}
      {sessionStarted && (
        <div className="bg-background/90 backdrop-blur-sm border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            {/* Microphone Button */}
            <Button
              variant={isRecording ? "default" : "outline"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSpeaking}
              className={`w-12 h-12 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="w-12 h-12"
            >
              <VolumeX className="w-5 h-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={endSession}
              className="w-12 h-12"
            >
              <Phone className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="text-center mt-2 text-sm text-muted-foreground">
            {isRecording ? "Recording... Release to send" : 
             isSpeaking ? "AI William is speaking..." : 
             isTyping ? "AI William is thinking..." :
             "Hold mic to record voice message"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;