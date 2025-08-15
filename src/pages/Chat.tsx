import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Phone, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState(0);

  const startSession = async () => {
    try {
      // Request microphone permissions
      await navigator.mediaDevices.getUserMedia({ audio: true });
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
    setIsRecording(false);
    navigate('/');
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
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
              <h1 className="font-semibold">AI William</h1>
              <p className="text-sm text-muted-foreground">
                {sessionStarted ? (isSpeaking ? "Speaking..." : "Listening...") : "Ready to start"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentIntent && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Intent: {currentIntent}
              </Badge>
            )}
            {leadScore > 0 && (
              <Badge variant={leadScore >= 70 ? "default" : "secondary"} className="hidden sm:inline-flex">
                Score: {leadScore}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleEscalate}>
              Human Please
            </Button>
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
              <h2 className="text-2xl font-bold mb-4">Chat with AI William</h2>
              <p className="text-muted-foreground mb-6">
                Start a voice conversation with William's AI twin. He can help with consulting inquiries, 
                partnerships, and more.
              </p>
              <Button onClick={startSession} size="lg" className="w-full shadow-glow">
                Start Conversation
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                By starting, you agree to our privacy policy and consent to voice recording.
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
                <h3 className="text-xl font-semibold mb-2">AI William</h3>
                <p className="text-muted-foreground">
                  {isSpeaking ? "Speaking..." : isRecording ? "Listening..." : "Ready"}
                </p>
              </div>
            </div>

            {/* Live Captions Area */}
            <Card className="p-4 mb-6 min-h-[120px]">
              <h4 className="font-medium mb-2">Live Transcript</h4>
              <div className="text-sm text-muted-foreground">
                <p className="italic">Conversation will appear here...</p>
              </div>
            </Card>

            {/* Extraction Chips */}
            {(currentIntent || leadScore > 0) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {currentIntent && (
                  <Badge variant="outline">Intent: {currentIntent}</Badge>
                )}
                {leadScore > 0 && (
                  <Badge variant={leadScore >= 70 ? "default" : "outline"}>
                    Lead Score: {leadScore}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {sessionStarted && (
        <div className="bg-background/90 backdrop-blur-sm border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleAudio}
              className="w-12 h-12"
            >
              {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={toggleRecording}
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
        </div>
      )}
    </div>
  );
};

export default Chat;