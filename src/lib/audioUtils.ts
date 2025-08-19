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
  private transcriptionCheckInterval: number | null = null;
  private lastWordTime = 0;
  private wordSilenceThreshold = 4000; // 4 seconds of no new words (longer pause)
  private volumeThreshold = 0.01; // Basic threshold for initial speech detection
  private isCurrentlySpeaking = false;
  private maxRecordingDuration = 30000; // 30 seconds max per segment (shorter to prevent long segments)
  private minRecordingDuration = 3000; // Minimum 3 seconds before allowing stop
  private recordingStartTime = 0;
  private lastTranscript = '';
  private transcriptCheckDuration = 2000; // Check every 2 seconds to reduce frequency
  private volumeHistory: number[] = [];
  private readonly volumeHistorySize = 5;
  private isProcessingTranscription = false; // Prevent overlapping transcription checks

  constructor(
    private onDataAvailable?: (audioBlob: Blob) => void,
    private onRecordingChange?: (isRecording: boolean) => void,
    private onSpeechActivity?: (isSpeaking: boolean) => void,
    private onTranscriptionCheck?: (audioBlob: Blob) => Promise<string>
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

  private smoothVolume(currentVolume: number): number {
    // Add to volume history
    this.volumeHistory.push(currentVolume);
    if (this.volumeHistory.length > this.volumeHistorySize) {
      this.volumeHistory.shift();
    }
    
    // Return smoothed average
    return this.volumeHistory.reduce((sum, vol) => sum + vol, 0) / this.volumeHistory.length;
  }

  private startVoiceActivityDetection(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let lastLogTime = 0;

    const checkVoiceActivity = () => {
      if (!this.analyser || !this.isContinuousMode) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Simple average volume calculation for initial speech detection
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const normalizedVolume = average / 255;
      const smoothedVolume = this.smoothVolume(normalizedVolume);
      
      const now = Date.now();
      const isSpeaking = smoothedVolume > this.volumeThreshold;

      // Reduce logging frequency to prevent UI overload
      if (smoothedVolume > 0.002 && now - lastLogTime > 1000) {
        console.log('🎤 Voice Activity Summary:', {
          smoothed: smoothedVolume.toFixed(4),
          threshold: this.volumeThreshold,
          isSpeaking,
          isRecording: this.isRecording
        });
        lastLogTime = now;
      }

      if (isSpeaking) {
        // Start recording if not already recording
        if (!this.isRecording && this.isContinuousMode) {
          console.log('🎤 ✅ TRIGGERING RECORDING - volume:', smoothedVolume.toFixed(4));
          this.startRecordingSegment();
          this.startWordBasedDetection();
          this.onSpeechActivity?.(true);
        }
      }

      // Fallback: max recording duration check
      if (this.isRecording) {
        const recordingDuration = now - this.recordingStartTime;
        if (recordingDuration > this.maxRecordingDuration) {
          console.log('🎤 🛑 Stopping recording due to max duration:', recordingDuration, 'ms');
          this.stopRecordingSegment();
          this.onSpeechActivity?.(false);
        }
      }
    };

    // Reduce frequency from 50ms to 100ms to improve performance
    this.vadCheckInterval = window.setInterval(checkVoiceActivity, 100);
  }

  private startWordBasedDetection(): void {
    // Start checking for new words every 2 seconds
    this.transcriptionCheckInterval = window.setInterval(async () => {
      if (!this.isRecording || !this.onTranscriptionCheck || this.isProcessingTranscription) return;

      try {
        this.isProcessingTranscription = true;
        // Get current audio chunk for transcription check
        const currentBlob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
        if (currentBlob.size > 0) {
          const transcript = await this.onTranscriptionCheck(currentBlob);
          
          // Only log significant transcript changes
          if (transcript && transcript.length > this.lastTranscript.length + 5) {
            console.log('🎤 📝 Transcript update:', { 
              current: transcript, 
              last: this.lastTranscript
            });
          }
          
          // Check if we have meaningful new words (require substantial progress)
          if (transcript && transcript.length > 15 && 
              transcript.length > this.lastTranscript.length + 5) {
            this.lastWordTime = Date.now();
            this.lastTranscript = transcript;
            console.log('🎤 📝 NEW WORDS detected, continuing...', transcript.slice(-50));
          } else {
            // Only consider stopping if:
            // 1. We've been recording for at least minimum duration
            // 2. We have substantial content (more than just noise)
            // 3. We've been silent for the threshold time
            const recordingDuration = Date.now() - this.recordingStartTime;
            const timeSinceLastWord = Date.now() - this.lastWordTime;
            const hasSubstantialContent = transcript && transcript.length > 20;
            
            if (recordingDuration > this.minRecordingDuration && 
                hasSubstantialContent && 
                timeSinceLastWord > this.wordSilenceThreshold) {
              console.log('🎤 🛑 STOPPING - Complete thought detected:', {
                duration: recordingDuration,
                silenceTime: timeSinceLastWord,
                finalLength: transcript?.length
              });
              this.stopRecordingSegment();
              this.onSpeechActivity?.(false);
            }
          }
        }
      } catch (error) {
        console.error('🎤 ❌ Transcription check error:', error);
      } finally {
        this.isProcessingTranscription = false;
      }
    }, this.transcriptCheckDuration);
  }

  private startRecordingSegment(): void {
    if (!this.stream || this.isRecording || !this.isContinuousMode) {
      console.log('🎤 ❌ Cannot start recording:', {
        hasStream: !!this.stream,
        isRecording: this.isRecording,
        isContinuous: this.isContinuousMode
      });
      return;
    }

    try {
      console.log('🎤 🚀 CREATING MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 📦 Data chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('🎤 🛑 MediaRecorder stopped, chunks:', this.chunks.length);
        if (this.chunks.length > 0) {
          const audioBlob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
          console.log('🎤 ✅ Speech segment captured:', audioBlob.size, 'bytes - CALLING CALLBACK');
          this.onDataAvailable?.(audioBlob);
        } else {
          console.log('🎤 ⚠️ No chunks available - no audio captured');
        }
        this.chunks = [];
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('🎤 ❌ MediaRecorder error:', event);
      };

      this.mediaRecorder.start(100); // Request data every 100ms
      this.isRecording = true;
      this.recordingStartTime = Date.now(); // Track when recording started
      console.log('🎤 ✅ Recording started successfully, state:', this.mediaRecorder.state);
    } catch (error) {
      console.error('Error starting recording segment:', error);
    }
  }

  private stopRecordingSegment(): void {
    // Clear transcription checking
    if (this.transcriptionCheckInterval) {
      clearInterval(this.transcriptionCheckInterval);
      this.transcriptionCheckInterval = null;
    }

    if (this.mediaRecorder && this.isRecording) {
      console.log('🎤 🛑 Stopping MediaRecorder, state before:', this.mediaRecorder.state);
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      this.isRecording = false;
      console.log('🎤 ✅ Recording segment stopped');
    } else {
      console.log('🎤 ⚠️ No MediaRecorder to stop or not recording');
    }

    // Reset transcript tracking
    this.lastTranscript = '';
    this.lastWordTime = 0;
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

    // Clear transcription checking
    if (this.transcriptionCheckInterval) {
      clearInterval(this.transcriptionCheckInterval);
      this.transcriptionCheckInterval = null;
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