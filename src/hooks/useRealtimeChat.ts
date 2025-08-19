import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AudioRecorder {
  start(): Promise<void>;
  stop(): void;
  isRecording(): boolean;
}

interface AudioPlayer {
  play(audioData: Uint8Array): Promise<void>;
  stop(): void;
  isPlaying(): boolean;
}

export const useRealtimeChat = (audioEnabled: boolean = true) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingAudioRef = useRef(false);

  // Initialize audio context and components
  useEffect(() => {
    if (audioEnabled) {
      initializeAudio();
    }
    return () => {
      cleanup();
    };
  }, [audioEnabled]);

  const initializeAudio = async () => {
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Initialize audio recorder
      audioRecorderRef.current = new RealtimeAudioRecorder(onAudioData);
      
      // Initialize audio player
      audioPlayerRef.current = new RealtimeAudioPlayer(
        audioContextRef.current,
        setIsSpeaking
      );
      
      console.log('🎵 Audio system initialized');
    } catch (error) {
      console.error('🎵 ❌ Failed to initialize audio:', error);
      toast.error('Failed to initialize audio system');
    }
  };

  const cleanup = () => {
    audioRecorderRef.current?.stop();
    audioPlayerRef.current?.stop();
    audioContextRef.current?.close();
    wsRef.current?.close();
  };

  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 Already connected');
      return;
    }

    console.log('🔌 Connecting to realtime chat...');
    
    // Use the correct Supabase function URL
    const wsUrl = 'wss://suyervjawrmbyyxetblv.functions.supabase.co/realtime_chat';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('🔌 ✅ Connected to realtime chat');
      setIsConnected(true);
      toast.success('Connected to AI William');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('🔌 ❌ Error parsing message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('🔌 ❌ WebSocket error:', error);
      setIsConnected(false);
      toast.error('Connection error');
    };

    wsRef.current.onclose = () => {
      console.log('🔌 🔌 WebSocket closed');
      setIsConnected(false);
      setIsRecording(false);
      setIsSpeaking(false);
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('🔌 📨 Received:', data.type);

    switch (data.type) {
      case 'session.created':
        console.log('🤖 ✅ Session created');
        break;

      case 'session.updated':
        console.log('🤖 ✅ Session updated');
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
        console.log('🎤 📝 Transcription completed:', data.transcript);
        if (data.transcript) {
          addMessage('user', data.transcript);
        }
        break;

      case 'response.audio.delta':
        if (data.delta) {
          handleAudioDelta(data.delta);
        }
        break;

      case 'response.audio_transcript.delta':
        if (data.delta) {
          setCurrentTranscript(prev => prev + data.delta);
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
        break;

      case 'error':
        console.error('🔌 ❌ Server error:', data.message);
        console.error('🔌 ❌ Full error data:', data);
        toast.error('Server error: ' + data.message);
        break;

      default:
        console.log('🔌 📨 Unhandled message type:', data.type, data);
    }
  };

  // Handle audio data from OpenAI
  const handleAudioDelta = (base64Audio: string) => {
    try {
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Add to audio queue
      audioQueueRef.current.push(bytes);
      
      // Start playing if not already playing
      if (!isPlayingAudioRef.current) {
        playNextAudioChunk();
      }
    } catch (error) {
      console.error('🎵 ❌ Error processing audio delta:', error);
    }
  };

  // Play audio chunks sequentially
  const playNextAudioChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingAudioRef.current = true;
    setIsSpeaking(true);

    const audioData = audioQueueRef.current.shift()!;
    
    try {
      await audioPlayerRef.current?.play(audioData);
    } catch (error) {
      console.error('🎵 ❌ Error playing audio chunk:', error);
    }
    
    // Play next chunk
    playNextAudioChunk();
  };

  // Handle audio data from microphone
  const onAudioData = (audioData: Float32Array) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Encode audio for API
      const encodedAudio = encodeAudioForAPI(audioData);
      
      // Send to OpenAI via WebSocket
      const message = {
        type: 'input_audio_buffer.append',
        audio: encodedAudio
      };
      
      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('🎤 ❌ Error sending audio:', error);
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
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
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

      wsRef.current.send(JSON.stringify(event));
      
      // Trigger response
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      
      console.log('💬 Sent text message:', text);
    } catch (error) {
      console.error('💬 ❌ Error sending text:', error);
      toast.error('Failed to send message');
    }
  }, []);

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (!audioEnabled) {
      toast.error('Audio is disabled');
      return;
    }

    try {
      if (isRecording) {
        audioRecorderRef.current?.stop();
        setIsRecording(false);
      } else {
        audioRecorderRef.current?.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('🎤 ❌ Error toggling recording:', error);
      toast.error('Microphone error');
    }
  }, [audioEnabled, isRecording]);

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

// Audio recorder class for realtime streaming
class RealtimeAudioRecorder implements AudioRecorder {
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

  isRecording(): boolean {
    return this.recording;
  }
}

// Audio player class for realtime playback
class RealtimeAudioPlayer implements AudioPlayer {
  constructor(
    private audioContext: AudioContext,
    private onPlayingChange: (isPlaying: boolean) => void
  ) {}

  async play(audioData: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert PCM to WAV
        const wavData = this.createWavFromPCM(audioData);
        
        this.audioContext.decodeAudioData(wavData.buffer)
          .then(audioBuffer => {
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            
            source.onended = () => {
              resolve();
            };
            
            source.start(0);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    // Stop is handled by the audio queue system
  }

  isPlaying(): boolean {
    return false; // Managed by the queue system
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    // Convert bytes to 16-bit samples (little endian)
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // WAV header parameters
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);
    
    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }
}

// Encode audio for OpenAI API
const encodeAudioForAPI = (float32Array: Float32Array): string => {
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