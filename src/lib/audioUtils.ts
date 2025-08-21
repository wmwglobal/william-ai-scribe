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
  private transcriptStabilityThreshold = 3000; // 3 seconds of no transcript changes
  private volumeThreshold = 0.01; // Basic threshold for initial speech detection
  private isCurrentlySpeaking = false;
  private maxRecordingDuration = 10000; // 10 seconds max per segment 
  private minRecordingDuration = 2000; // Minimum 2 seconds before allowing stop
  private recordingStartTime = 0;
  private lastTranscript = '';
  private lastTranscriptChangeTime = 0;
  private transcriptCheckDuration = 1000; // Check every 1 second for faster response
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

    // Hysteresis + hangover endpointing
    const START_THRESH = this.volumeThreshold;   // trigger threshold to start
    const STOP_THRESH = this.volumeThreshold * 0.5; // lower threshold to keep speaking until clearly silent
    const SILENCE_WINDOW_MS = 700;              // how long below STOP to end utterance
    const HANGOVER_MS = 180;                    // keep "speaking" true briefly after drop
    const MIN_SPEECH_MS = this.minRecordingDuration; // honor existing min duration
    let speaking = false;
    let speechStartAt = 0;
    let lastAboveStopAt = 0;

    const checkVoiceActivity = () => {
      if (!this.analyser || !this.isContinuousMode) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Use average magnitude as a simple proxy for energy; smooth to avoid chatter
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const normalized = average / 255;
      const smoothed = this.smoothVolume(normalized);
      const now = Date.now();

      // Determine if we are "above" thresholds depending on state
      const aboveStart = smoothed > START_THRESH;
      const aboveStop  = smoothed > STOP_THRESH;

      if (!speaking) {
        if (aboveStart) {
          // start of speech, begin recording a segment
          speaking = true;
          speechStartAt = now;
          lastAboveStopAt = now;
          if (!this.isRecording && this.isContinuousMode) {
            this.startRecordingSegment();
            this.startTranscriptBasedDetection();
            this.onSpeechActivity?.(true);
          }
        }
      } else {
        // we're in a speech segment
        if (aboveStop) {
          lastAboveStopAt = now;
        }

        // hangover to prevent chopping breaths
        const effectiveEnd = Math.max(lastAboveStopAt, now - HANGOVER_MS);

        // End if we've been below STOP for long enough and met min duration
        const elapsed = now - speechStartAt;
        const silentFor = now - lastAboveStopAt;
        if (silentFor >= SILENCE_WINDOW_MS && elapsed >= MIN_SPEECH_MS) {
          // stop segment
          speaking = false;
          this.stopRecordingSegment();
          this.onSpeechActivity?.(false);
          // reset timers
          speechStartAt = 0;
          lastAboveStopAt = 0;
        } else {
          // Safety valve: force stop at max duration
          const recordingDuration = now - this.recordingStartTime;
          if (this.isRecording && recordingDuration > this.maxRecordingDuration) {
            this.stopRecordingSegment();
            this.onSpeechActivity?.(false);
            speaking = false;
            speechStartAt = 0;
            lastAboveStopAt = 0;
          }
        }
      }
    };

    // Run detector ~10Hz; lower CPU and adequate for endpointing
    this.vadCheckInterval = window.setInterval(checkVoiceActivity, 100);
  }

  private startTranscriptBasedDetection(): void {
    // Check transcript for completion every 1 second
    this.transcriptionCheckInterval = window.setInterval(async () => {
      if (!this.isRecording || !this.onTranscriptionCheck || this.isProcessingTranscription) return;

      try {
        this.isProcessingTranscription = true;
        // Get current audio chunk for transcription check
        const currentBlob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
        if (currentBlob.size > 0) {
          const transcript = await this.onTranscriptionCheck(currentBlob);
          const now = Date.now();
          
          if (transcript && transcript !== this.lastTranscript) {
            // Transcript has changed - update tracking
            this.lastTranscriptChangeTime = now;
            
            console.log('🎤 📝 Transcript updated:', { 
              previous: this.lastTranscript.slice(-30), 
              current: transcript.slice(-30),
              length: transcript.length
            });
            
            this.lastTranscript = transcript;
          }
          
          // Check if we should stop based on transcript analysis
          if (this.shouldStopBasedOnTranscript(transcript, now)) {
            console.log('🎤 🛑 STOPPING - Complete thought detected via transcript analysis');
            this.stopRecordingSegment();
            this.onSpeechActivity?.(false);
          }
        }
      } catch (error) {
        console.error('🎤 ❌ Transcription check error:', error);
      } finally {
        this.isProcessingTranscription = false;
      }
    }, this.transcriptCheckDuration);
  }

  private shouldStopBasedOnTranscript(transcript: string, now: number): boolean {
    const recordingDuration = now - this.recordingStartTime;
    const timeSinceLastChange = now - this.lastTranscriptChangeTime;
    
    // Don't stop if recording is too short
    if (recordingDuration < this.minRecordingDuration) {
      return false;
    }
    
    // Don't process if transcript is too short or empty
    if (!transcript || transcript.trim().length < 10) {
      return false;
    }
    
    // Check for natural completion indicators
    const hasCompletionMarkers = this.hasNaturalCompletion(transcript);
    const isTranscriptStable = timeSinceLastChange > this.transcriptStabilityThreshold;
    
    console.log('🎤 📊 Transcript analysis:', {
      duration: recordingDuration,
      timeSinceChange: timeSinceLastChange,
      hasCompletion: hasCompletionMarkers,
      isStable: isTranscriptStable,
      transcriptEnd: transcript.slice(-20)
    });
    
    // Stop if transcript is stable AND has completion markers
    if (isTranscriptStable && hasCompletionMarkers) {
      return true;
    }
    
    // Stop if transcript has been stable for longer period (fallback)
    if (timeSinceLastChange > this.transcriptStabilityThreshold * 2) {
      return true;
    }
    
    return false;
  }

  private hasNaturalCompletion(transcript: string): boolean {
    const trimmed = transcript.trim();
    if (trimmed.length < 10) return false;
    
    // Check for sentence endings
    const sentenceEndings = /[.!?]\s*$/;
    if (sentenceEndings.test(trimmed)) {
      console.log('🎤 ✅ Found sentence ending:', trimmed.slice(-10));
      return true;
    }
    
    // Check for natural pause words/phrases at the end
    const pauseWords = /\b(so|well|anyway|okay|alright|um|uh|you know|I think|I guess|that's|and yeah|and so)\s*$/i;
    if (pauseWords.test(trimmed)) {
      console.log('🎤 ✅ Found natural pause word:', trimmed.slice(-15));
      return true;
    }
    
    // Check for complete clauses (basic pattern)
    const completePatterns = /\b(that's it|that's all|I'm done|finished|complete|ready)\s*$/i;
    if (completePatterns.test(trimmed)) {
      console.log('🎤 ✅ Found completion phrase:', trimmed.slice(-15));
      return true;
    }
    
    return false;
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
    this.lastTranscriptChangeTime = 0;
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