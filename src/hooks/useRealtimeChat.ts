import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useRealtimeChat = (audioEnabled: boolean = true) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioElementRef.current = document.createElement("audio");
    audioElementRef.current.autoplay = true;
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    recorderRef.current?.stop();
    dcRef.current?.close();
    pcRef.current?.close();
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }
  };

  // WebRTC connection with OpenAI
  const connect = useCallback(async () => {
    if (pcRef.current?.connectionState === 'connected') {
      console.log('🔌 Already connected');
      return;
    }

    console.log('🔌 Connecting to OpenAI Realtime API...');
    
    try {
      // Get ephemeral token from our edge function
      console.log('🔑 Requesting ephemeral token...');
      const { data: tokenData, error } = await supabase.functions.invoke('openai_token');
      
      if (error || !tokenData) {
        throw new Error('Failed to get ephemeral token: ' + (error?.message || 'Unknown error'));
      }

      if (!tokenData.client_secret?.value) {
        throw new Error("No ephemeral token received");
      }

      const ephemeralKey = tokenData.client_secret.value;
      console.log('🔑 ✅ Got ephemeral token');

      // Create peer connection
      pcRef.current = new RTCPeerConnection();

      // Set up remote audio
      pcRef.current.ontrack = (e) => {
        console.log('🎵 ✅ Remote audio track received');
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      pcRef.current.addTrack(ms.getTracks()[0]);

      // Set up data channel
      dcRef.current = pcRef.current.createDataChannel("oai-events");
      dcRef.current.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("🔌 📨 Received event:", event.type);
        handleRealtimeMessage(event);
      });

      // Create and set local description
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-10-01";
      console.log('🔌 Connecting to OpenAI WebRTC...');
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`OpenAI WebRTC connection failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await pcRef.current.setRemoteDescription(answer);
      console.log("🔌 ✅ WebRTC connection established");

      setIsConnected(true);
      toast.success('Connected to AI William');

      // Start recording
      recorderRef.current = new AudioRecorder((audioData) => {
        if (dcRef.current?.readyState === 'open') {
          dcRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeAudioData(audioData)
          }));
        }
      });
      
      await recorderRef.current.start();
      setIsRecording(true);

    } catch (error) {
      console.error('🔌 ❌ Connection error:', error);
      setIsConnected(false);
      toast.error('Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  }, []);

  // Handle realtime messages
  const handleRealtimeMessage = (event: any) => {
    switch (event.type) {
      case 'session.created':
        console.log('🤖 ✅ Session created');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 🗣️ Speech started');
        setIsRecording(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('🎤 🛑 Speech stopped');
        setIsRecording(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('🎤 📝 Transcription completed:', event.transcript);
        if (event.transcript) {
          addMessage('user', event.transcript);
        }
        break;

      case 'response.audio.delta':
        // Audio is handled by WebRTC audio track
        setIsSpeaking(true);
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          setCurrentTranscript(prev => prev + event.delta);
        }
        break;

      case 'response.audio_transcript.done':
        if (currentTranscript.trim()) {
          addMessage('assistant', currentTranscript.trim());
          setCurrentTranscript('');
        }
        break;

      case 'response.done':
        console.log('🤖 ✅ Response completed');
        setIsSpeaking(false);
        break;

      default:
        console.log('🔌 📨 Unhandled message type:', event.type);
    }
  };

  // Add message to conversation
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    console.log('💬 Added message:', { role, content: content.slice(0, 50) + '...' });
  };

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      toast.error('Not connected');
      return;
    }

    try {
      // Add user message immediately
      addMessage('user', text);

      // Send to OpenAI
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: text
            }
          ]
        }
      };

      dcRef.current.send(JSON.stringify(event));
      
      // Trigger response
      dcRef.current.send(JSON.stringify({ type: 'response.create' }));
      
      console.log('💬 Sent text message:', text);
    } catch (error) {
      console.error('💬 ❌ Error sending text:', error);
      toast.error('Failed to send message');
    }
  }, []);

  // Toggle recording (not needed with WebRTC)
  const toggleRecording = useCallback(() => {
    // Recording is handled automatically by WebRTC
    console.log('🎤 Recording is handled automatically by WebRTC');
  }, []);

  return {
    messages,
    isConnected,
    isRecording,
    isSpeaking,
    currentTranscript,
    connect,
    disconnect,
    sendTextMessage,
    toggleRecording
  };
};

// Audio recorder class for WebRTC
class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.recording) {
          const inputData = e.inputBuffer.getChannelData(0);
          this.onAudioData(new Float32Array(inputData));
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.recording = true;

      console.log('🎤 ✅ Recording started');
    } catch (error) {
      console.error('🎤 ❌ Error starting recording:', error);
      throw error;
    }
  }

  stop(): void {
    this.recording = false;
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🎤 🛑 Recording stopped');
  }
}

// Encode audio for OpenAI API
const encodeAudioData = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};