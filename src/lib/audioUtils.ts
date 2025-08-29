// Audio utilities for voice chat functionality

export class AudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    // Initialize audio element
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    
    // Add event listeners
    this.audioElement.addEventListener('loadstart', () => {
      console.log('🔊 Audio loading started');
    });

    this.audioElement.addEventListener('canplaythrough', () => {
      console.log('🔊 Audio can play through');
    });

    this.audioElement.addEventListener('play', () => {
      console.log('🔊 Audio playback started');
      this.isPlaying = true;
    });

    this.audioElement.addEventListener('pause', () => {
      console.log('🔊 Audio playback paused');
      this.isPlaying = false;
    });

    this.audioElement.addEventListener('ended', () => {
      console.log('🔊 Audio playback ended');
      this.isPlaying = false;
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error('🔊 Audio playback error:', e);
      this.isPlaying = false;
    });
  }

  async playAudio(base64Audio: string, onPlaybackStateChange?: (isPlaying: boolean) => void): Promise<void> {
    try {
      if (!this.audioElement) {
        throw new Error('Audio element not initialized');
      }

      // Stop current audio if playing
      if (this.isPlaying) {
        this.stopCurrentAudio();
      }

      // Convert base64 to blob URL
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Set audio source and play
      this.audioElement.src = audioUrl;
      
      // Notify playback started
      onPlaybackStateChange?.(true);
      
      await this.audioElement.play();

      // Clean up blob URL when audio ends and notify playback stopped
      this.audioElement.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        onPlaybackStateChange?.(false);
      }, { once: true });

      // Also notify on pause/stop
      this.audioElement.addEventListener('pause', () => {
        onPlaybackStateChange?.(false);
      }, { once: true });

    } catch (error) {
      console.error('🔊 Error playing audio:', error);
      this.isPlaying = false;
      onPlaybackStateChange?.(false);
      throw error;
    }
  }

  stopCurrentAudio(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      console.log('🔊 Audio stopped');
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private isRecording = false;
  private isContinuousMode = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private vadCheckInterval: number | null = null;
  
  // VAD state
  private volumeThreshold = 0.01;
  private volumeHistory: number[] = [];
  private volumeHistorySize = 5;
  private isSpeaking = false;
  private speechStartTime = 0;
  private speechBuffer: Float32Array[] = [];
  private isCapturingAudio = false;
  
  // Audio playback suppression to prevent feedback
  private isAudioPlaybackActive = false;
  private suppressionTimeout: NodeJS.Timeout | null = null;

  // Callbacks
  private onRecordingStateChange?: (isRecording: boolean) => void;
  private onSpeechActivityChange?: (isSpeaking: boolean) => void;
  private onTranscriptReady?: (audioBlob: Blob) => void;

  constructor(
    onRecordingStateChange?: (isRecording: boolean) => void,
    onSpeechActivityChange?: (isSpeaking: boolean) => void,
    onTranscriptReady?: (audioBlob: Blob) => void
  ) {
    this.onRecordingStateChange = onRecordingStateChange;
    this.onSpeechActivityChange = onSpeechActivityChange;
    this.onTranscriptReady = onTranscriptReady;
  }

  // Method to suppress audio processing during playback
  suppressDuringPlayback(duration: number = 3000) {
    console.log('🎤 🔇 Suppressing microphone for', duration, 'ms during audio playback');
    this.isAudioPlaybackActive = true;
    
    // Clear any existing timeout
    if (this.suppressionTimeout) {
      clearTimeout(this.suppressionTimeout);
    }
    
    // Stop any active speech detection
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeechActivityChange?.(false);
      this.stopAudioCapture();
    }
    
    // Set timeout to re-enable after playback
    this.suppressionTimeout = setTimeout(() => {
      console.log('🎤 ✅ Re-enabling microphone after playback');
      this.isAudioPlaybackActive = false;
    }, duration);
  }

  // Method to immediately re-enable microphone (for barge-in)
  enableImmediately() {
    console.log('🎤 ⚡ Immediately re-enabling microphone for barge-in');
    this.isAudioPlaybackActive = false;
    if (this.suppressionTimeout) {
      clearTimeout(this.suppressionTimeout);
      this.suppressionTimeout = null;
    }
  }

  async startContinuousListening(): Promise<void> {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Clean up any existing resources first
      if (this.stream) {
        console.log('🎤 Cleaning up existing stream before starting new one');
        this.stopContinuousListening();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎤 Requesting microphone access...');
      
      // Try with minimal constraints first
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        console.log('🎤 ✅ Microphone access granted with basic constraints');
      } catch (basicError) {
        console.log('🎤 Basic constraints failed, trying with specific constraints...');
        // Fallback to specific constraints
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('🎤 ✅ Microphone access granted with specific constraints');
      }

      // Log detailed track info for debugging
      const audioTrack = this.stream.getAudioTracks()[0];
      console.log('🎤 Audio track state:', {
        enabled: audioTrack.enabled,
        readyState: audioTrack.readyState,
        muted: audioTrack.muted,
        constraints: audioTrack.getConstraints()
      });

      // Set up audio context for VAD
      this.audioContext = new AudioContext();
      console.log('🎤 AudioContext state:', this.audioContext.state);

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source.connect(this.analyser);

      this.isContinuousMode = true;
      this.isRecording = true;
      this.onRecordingStateChange?.(true);

      console.log('🎤 Recording state changed:', this.isRecording);

      // Start VAD
      this.startVoiceActivityDetection();

      console.log('🎤 ✅ Continuous listening started successfully');

    } catch (error) {
      console.error('🎤 ❌ Error starting continuous listening:', error);
      this.stopContinuousListening();
      throw error;
    }
  }

  private smoothVolume(currentVolume: number): number {
    this.volumeHistory.push(currentVolume);
    if (this.volumeHistory.length > this.volumeHistorySize) {
      this.volumeHistory.shift();
    }
    
    return this.volumeHistory.reduce((sum, vol) => sum + vol, 0) / this.volumeHistory.length;
  }

  private startVoiceActivityDetection(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // VAD thresholds - balanced for good sensitivity without false positives
    const START_THRESH = Math.max(0.08, this.volumeThreshold * 8);
    const STOP_THRESH = Math.max(0.04, this.volumeThreshold * 4);
    const MIN_SPEECH_MS = 1200; // Balanced minimum speech duration
    let speaking = false;
    let speechStartAt = 0;
    let lastAboveStopAt = 0;
    let lastLogTime = 0;

    console.log('🎤 VAD Started with thresholds:', { START_THRESH, STOP_THRESH, MIN_SPEECH_MS });

    const checkVoiceActivity = () => {
      if (!this.analyser || !this.isContinuousMode) {
        return;
      }

      // Skip processing if audio playback is active (prevent feedback)
      if (this.isAudioPlaybackActive) {
        // Continue VAD loop but don't process audio
        if (this.isContinuousMode) {
          this.vadCheckInterval = requestAnimationFrame(checkVoiceActivity);
        }
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const normalized = average / 255;
      const smoothed = this.smoothVolume(normalized);
      const now = Date.now();

      const aboveStart = smoothed > START_THRESH;
      const aboveStop = smoothed > STOP_THRESH;

      // Debug logging every 2 seconds
      if (smoothed > 0.001 && now - lastLogTime > 2000) {
        console.log('🎤 VAD State:', {
          smoothed: smoothed.toFixed(4),
          startThresh: START_THRESH.toFixed(4),
          stopThresh: STOP_THRESH.toFixed(4),
          aboveStart,
          aboveStop,
          speaking,
          isCapturingAudio: this.isCapturingAudio,
          hasStream: !!this.stream
        });
        lastLogTime = now;
      }

      // Start speech detection
      if (!speaking && aboveStart) {
        speaking = true;
        speechStartAt = now;
        this.isSpeaking = true;
        this.onSpeechActivityChange?.(true);
        console.log('🎤 🗣️ Speech started');
        
        // Start capturing audio for transcription
        this.startAudioCapture();
      }

      // Continue tracking while above stop threshold
      if (speaking && aboveStop) {
        lastAboveStopAt = now;
      }

      // Stop speech detection after silence
      if (speaking && !aboveStop && (now - lastAboveStopAt > 1000)) {
        const speechDuration = now - speechStartAt;
        if (speechDuration >= MIN_SPEECH_MS) {
          console.log('🎤 🔇 Speech ended, duration:', speechDuration, 'ms');
          speaking = false;
          this.isSpeaking = false;
          this.onSpeechActivityChange?.(false);
          
          // Stop capturing and process the audio
          this.stopAudioCapture();
        }
      }

      // Continue VAD if still in continuous mode
      if (this.isContinuousMode) {
        this.vadCheckInterval = requestAnimationFrame(checkVoiceActivity);
      }
    };

    checkVoiceActivity();
  }

  private startAudioCapture(): void {
    if (!this.audioContext || !this.source || this.isCapturingAudio) return;

    this.isCapturingAudio = true;
    this.speechBuffer = [];

    // Create a script processor to capture audio data
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (this.isCapturingAudio) {
        const inputData = event.inputBuffer.getChannelData(0);
        this.speechBuffer.push(new Float32Array(inputData));
      }
    };

    this.source.connect(processor);
    processor.connect(this.audioContext.destination);

    // Store reference to disconnect later
    (this as any).currentProcessor = processor;
  }

  private async stopAudioCapture(): Promise<void> {
    if (!this.isCapturingAudio) return;

    this.isCapturingAudio = false;

    // Disconnect the processor
    if ((this as any).currentProcessor) {
      (this as any).currentProcessor.disconnect();
      (this as any).currentProcessor = null;
    }

    // Process the captured audio
    if (this.speechBuffer.length > 0) {
      try {
        const audioBlob = await this.processAudioBuffer();
        console.log('🎤 📝 Audio blob ready, size:', audioBlob.size);
        this.onTranscriptReady?.(audioBlob);
      } catch (error) {
        console.error('🎤 ❌ Error processing audio:', error);
      }
    }

    this.speechBuffer = [];
  }

  private async processAudioBuffer(): Promise<Blob> {
    if (!this.speechBuffer.length || !this.audioContext) {
      throw new Error('No audio buffer or context');
    }

    // Combine all audio chunks
    const totalLength = this.speechBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of this.speechBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to WAV format
    const wavBuffer = this.floatTo16BitPCM(combinedBuffer);
    const wavBlob = this.createWavBlob(wavBuffer, this.audioContext.sampleRate);

    return wavBlob;
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private createWavBlob(pcmBuffer: ArrayBuffer, sampleRate: number): Blob {
    const length = pcmBuffer.byteLength;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Copy PCM data
    const pcmView = new Uint8Array(pcmBuffer);
    const wavView = new Uint8Array(buffer, 44);
    wavView.set(pcmView);

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/wav;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // We need session info for the API call, so we'll remove this method
  // and let the hook handle the transcription directly

  stopContinuousListening(): void {
    console.log('🎤 🛑 Stopping continuous listening...');
    
    this.isContinuousMode = false;
    this.isRecording = false;
    this.isCapturingAudio = false;
    this.isAudioPlaybackActive = false;

    if (this.suppressionTimeout) {
      clearTimeout(this.suppressionTimeout);
      this.suppressionTimeout = null;
    }

    if (this.vadCheckInterval) {
      cancelAnimationFrame(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }

    if ((this as any).currentProcessor) {
      (this as any).currentProcessor.disconnect();
      (this as any).currentProcessor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 🔴 Audio track stopped:', track.kind);
      });
      this.stream = null;
    }

    this.onRecordingStateChange?.(false);
    this.onSpeechActivityChange?.(false);

    console.log('🎤 ✅ Continuous listening stopped');
  }

  pauseListening(): void {
    // For compatibility - not needed in simplified version
  }

  resumeListening(): void {
    // For compatibility - not needed in simplified version
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // Legacy methods for backward compatibility
  async startRecording(): Promise<void> {
    return this.startContinuousListening();
  }

  stopRecording(): void {
    this.stopContinuousListening();
  }
}

// Utility function to convert audio blob to base64
export async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}