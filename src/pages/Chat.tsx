import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, VolumeX, Phone, User, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { getScoreBadgeVariant } from '@/lib/leadScore';
import { PersonalitySelector } from '@/components/PersonalitySelector';
import { ModelSelector } from '@/components/ModelSelector';
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
  
  const {
    sessionId,
    isRecording,
    isSpeaking,
    isTyping,
    currentIntent,
    leadScore,
    transcript,
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  } = useVoiceChat(audioEnabled);

  const startSession = async () => {
    try {
      // Request microphone permissions
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create session with consent
      await createSession(consent);
      setSessionStarted(true);
      
      toast({
        title: "Session Started",
        description: "AI William is ready to chat with you!",
      });
    } catch (error) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to chat with AI William.",
        variant: "destructive",
      });
    }
  };

  const endSession = () => {
    setSessionStarted(false);
    if (isRecording) stopRecording();
    if (isSpeaking) stopSpeaking();
    navigate('/');
  };

  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast({
          title: "Recording Error",
          description: "Failed to start recording. Please check microphone permissions.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendText = async () => {
    if (!textMessage.trim()) return;
    
    try {
      await sendTextMessage(textMessage);
      setTextMessage('');
    } catch (error) {
      toast({
        title: "Message Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEscalate = () => {
    toast({
      title: "Escalating to Human",
      description: "We'll connect you with a human representative shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">AI William MacDonald White</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {!sessionStarted ? "Ready to start" : 
                   isSpeaking ? "Speaking..." : 
                   isRecording ? "Listening..." : "Ready"}
                </p>
                <div className={`w-2 h-2 rounded-full ${selectedModel.color} bg-gradient-to-r`} />
                <span className="text-xs text-muted-foreground">{selectedModel.name} • {selectedPersonality.name}</span>
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAudioEnabled(!audioEnabled)}
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
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Chat with AI William MacDonald White</h2>
              <p className="text-muted-foreground mb-6">
                Start a voice conversation with William's AI twin. Choose from different personalities and models 
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
                Powered by AI voice cloning technology
              </p>
            </Card>
          </div>
        ) : (
          /* Active Chat Interface */
          <div className="flex-1 flex flex-col">
            {/* Visual Presentation Area */}
            <div className="flex-1 bg-card rounded-lg mb-6 p-8 shadow-card">
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center ${
                  isSpeaking ? 'speaking-indicator' : ''
                }`}>
                  <User className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI William MacDonald White</h3>
                <p className="text-muted-foreground">
                  {isSpeaking ? "Speaking with cloned voice..." : 
                   isRecording ? "Listening..." : "Ready"}
                </p>
              </div>
            </div>

            {/* Live Transcript Area */}
            <Card className="p-4 mb-6 min-h-[200px] max-h-[300px] overflow-y-auto">
              <h4 className="font-medium mb-2">Live Transcript</h4>
              <div className="space-y-3">
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
                          <span>typing</span>
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Text Input Area */}
            <Card className="p-4 mb-6">
              <div className="flex gap-2">
                <Input
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                  disabled={isRecording || isSpeaking}
                />
                <Button 
                  onClick={handleSendText}
                  disabled={!textMessage.trim() || isRecording || isSpeaking}
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
          </div>
        )}
      </div>

      {/* Voice Controls */}
      {sessionStarted && (
        <div className="bg-background/90 backdrop-blur-sm border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
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
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={handleRecordingToggle}
              disabled={isSpeaking}
              className="w-16 h-16 rounded-full shadow-glow"
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
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
            {isRecording ? "Recording..." : 
             isSpeaking ? "AI William is speaking..." :
             "Click microphone to start recording"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;