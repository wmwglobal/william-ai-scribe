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
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    audioContextRef.current?.close();
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
    
    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    try {
      // Convert base64 to audio buffer
      const binaryString = atob(audioData.toString());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create WAV file from PCM data
      const wavBuffer = createWavFromPCM(bytes);
      const audioBuffer = await audioContextRef.current.decodeAudioData(wavBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        playAudioQueue();
      };
      
      source.start(0);
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      isPlayingRef.current = false;
      playAudioQueue();
    }
  };

  const createWavFromPCM = (pcmData: Uint8Array): ArrayBuffer => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);
    
    const wavArray = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(pcmData, wavHeader.byteLength);
    
    return wavArray.buffer;
  };

  // WebSocket connection (much simpler!)
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 Already connected');
      return;
    }

    console.log('🔌 Connecting via WebSocket proxy...');
    
    try {
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Get project URL and create WebSocket connection  
      const hostname = window.location.hostname;
      const projectRef = hostname.includes('localhost') ? 'localhost:54321' : hostname.split('.')[0] + '.functions.supabase.co';
      const protocol = hostname.includes('localhost') ? 'ws' : 'wss';
      const wsUrl = `${protocol}://${projectRef}/realtime_chat`;
      
      console.log('🔌 Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        toast.success('Connected to AI William');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        toast.error('Connection failed');
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);
      };
      
      // Start audio recording
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodeAudioData(audioData)
          }));
        }
      });
      
      await recorderRef.current.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('❌ Connection error:', error);
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

  // Handle realtime messages from WebSocket
  const handleRealtimeMessage = (event: any) => {
    console.log('📨 Received:', event.type);
    
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
        console.log('🎤 📝 User transcription:', event.transcript);
        if (event.transcript?.trim()) {
          addMessage('user', event.transcript.trim());
        }
        break;

      case 'response.audio.delta':
        console.log('🔊 Audio delta received');
        setIsSpeaking(true);
        // Queue audio for playback
        if (event.delta) {
          audioQueueRef.current.push(event.delta);
          playAudioQueue();
        }
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          setCurrentTranscript(prev => prev + event.delta);
        }
        break;

      case 'response.audio_transcript.done':
        console.log('🤖 📝 AI transcription complete:', currentTranscript);
        if (currentTranscript.trim()) {
          addMessage('assistant', currentTranscript.trim());
          setCurrentTranscript('');
        }
        break;

      case 'response.audio.done':
        console.log('🔊 Audio response complete');
        setIsSpeaking(false);
        break;

      case 'response.done':
        console.log('🤖 ✅ Response completed');
        setIsSpeaking(false);
        break;

      case 'error':
        console.error('🔌 ❌ WebSocket error:', event.message);
        toast.error('Connection error: ' + event.message);
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

  // Send text message via WebSocket
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Not connected');
      return;
    }

    try {
      // Add user message immediately
      addMessage('user', text);

      // Send to OpenAI via WebSocket proxy
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

      wsRef.current.send(JSON.stringify(event));
      
      // Trigger response
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      
      console.log('💬 Sent text message:', text);
    } catch (error) {
      console.error('💬 ❌ Error sending text:', error);
      toast.error('Failed to send message');
    }
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    console.log('🎤 Recording is handled automatically via server VAD');
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