export class AudioPlayer {
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(private onPlayingChange?: (isPlaying: boolean) => void) {}

  async playAudio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎵 AudioPlayer: Attempting to play audio');
        console.log('🎵 Base64 audio length:', base64Audio.length);
        console.log('🎵 First 50 chars:', base64Audio.substring(0, 50));
        
        // Convert base64 to blob
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        
        const audio = new Audio(audioUrl);
        
        // Set volume to ensure it's audible
        audio.volume = 1.0;
        
        audio.onloadeddata = () => {
          console.log('🎵 Audio loaded successfully, duration:', audio.duration, 'seconds');
          console.log('🎵 Audio ready state:', audio.readyState);
        };
        
        audio.onplay = () => {
          this.isPlaying = true;
          this.currentAudio = audio;
          this.onPlayingChange?.(true);
          console.log('🎵 Audio playback started - you should hear sound now!');
        };
        
        audio.onended = () => {
          this.isPlaying = false;
          this.currentAudio = null;
          this.onPlayingChange?.(false);
          URL.revokeObjectURL(audioUrl);
          console.log('Audio playback ended');
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          this.isPlaying = false;
          this.currentAudio = null;
          this.onPlayingChange?.(false);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        // Start playback with user interaction check
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('🎵 Audio playback promise resolved successfully!');
          }).catch(error => {
            console.error('Error starting audio playback:', error);
            if (error.name === 'NotAllowedError') {
              console.error('Audio autoplay blocked - user interaction required');
              reject(new Error('Audio autoplay blocked. Please interact with the page first.'));
            } else {
              this.isPlaying = false;
              this.currentAudio = null;
              this.onPlayingChange?.(false);
              URL.revokeObjectURL(audioUrl);
              reject(error);
            }
          });
        }
        
      } catch (error) {
        console.error('Error processing audio:', error);
        reject(error);
      }
    });
  }

  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      this.currentAudio = null;
      this.onPlayingChange?.(false);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;
  private isContinuousMode = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private vadCheckInterval: number | null = null;
  private lastSpeechTime = 0;
  private silenceThreshold = 800; // Reduced to 800ms for more responsive detection
  private volumeThreshold = 0.002; // Further lowered threshold for more sensitivity
  private isCurrentlySpeaking = false;

  constructor(
    private onDataAvailable?: (audioBlob: Blob) => void,
    private onRecordingChange?: (isRecording: boolean) => void,
    private onSpeechActivity?: (isSpeaking: boolean) => void
  ) {}

  async startContinuousListening(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio context for voice activity detection
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);

      this.isContinuousMode = true;
      this.onRecordingChange?.(true);
      
      // Start voice activity detection
      this.startVoiceActivityDetection();
      
      console.log('Continuous listening started');
    } catch (error) {
      console.error('Error starting continuous listening:', error);
      throw new Error('Failed to start continuous listening. Please check microphone permissions.');
    }
  }

  private startVoiceActivityDetection(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVoiceActivity = () => {
      if (!this.analyser || !this.isContinuousMode) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const normalizedVolume = average / 255;

      const now = Date.now();
      const isSpeaking = normalizedVolume > this.volumeThreshold;

      // Log voice activity for debugging (always log to help with debugging)
      console.log('🎤 Voice Activity:', {
        volume: normalizedVolume.toFixed(4),
        threshold: this.volumeThreshold,
        isSpeaking,
        isRecording: this.isRecording,
        isContinuous: this.isContinuousMode
      });

      if (isSpeaking) {
        this.lastSpeechTime = now;
        
        // Start recording if not already recording
        if (!this.isRecording) {
          console.log('🎤 Starting recording due to speech detection');
          this.startRecordingSegment();
          this.onSpeechActivity?.(true);
          this.isCurrentlySpeaking = true;
        }
      } else if (this.isRecording && (now - this.lastSpeechTime) > this.silenceThreshold) {
        // Stop recording after silence threshold
        console.log('🎤 Stopping recording due to silence');
        this.stopRecordingSegment();
        this.onSpeechActivity?.(false);
        this.isCurrentlySpeaking = false;
      }
    };

    this.vadCheckInterval = window.setInterval(checkVoiceActivity, 50); // Check more frequently
  }

  private startRecordingSegment(): void {
    if (!this.stream || this.isRecording) return;

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.chunks.length > 0) {
          const audioBlob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
          console.log('🎤 Speech segment captured:', audioBlob.size, 'bytes');
          this.onDataAvailable?.(audioBlob);
        }
        this.chunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Started recording speech segment');
    } catch (error) {
      console.error('Error starting recording segment:', error);
    }
  }

  private stopRecordingSegment(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('Stopped recording speech segment');
    }
  }

  async startRecording(): Promise<void> {
    // Legacy method for backward compatibility
    await this.startContinuousListening();
  }

  stopRecording(): void {
    // Stop any current recording segment
    this.stopRecordingSegment();
  }

  stopContinuousListening(): void {
    this.isContinuousMode = false;
    
    // Clear voice activity detection
    if (this.vadCheckInterval) {
      clearInterval(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }

    // Stop any current recording
    this.stopRecordingSegment();

    // Clean up audio context
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.onRecordingChange?.(false);
    this.onSpeechActivity?.(false);
    console.log('Continuous listening stopped');
  }

  getIsRecording(): boolean {
    return this.isContinuousMode;
  }

  getIsSpeaking(): boolean {
    return this.isRecording; // Currently recording a speech segment
  }
}

// Utility to convert audio blob to base64
export async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:audio/webm;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}