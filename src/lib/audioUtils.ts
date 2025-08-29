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

  async playAudio(base64Audio: string): Promise<void> {
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
      
      await this.audioElement.play();

      // Clean up blob URL when audio ends
      this.audioElement.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      }, { once: true });

    } catch (error) {
      console.error('🔊 Error playing audio:', error);
      this.isPlaying = false;
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

  // Callbacks
  private onRecordingStateChange?: (isRecording: boolean) => void;
  private onSpeechActivityChange?: (isSpeaking: boolean) => void;
  private onTranscriptReady?: (transcript: string) => void;

  constructor(
    onRecordingStateChange?: (isRecording: boolean) => void,
    onSpeechActivityChange?: (isSpeaking: boolean) => void,
    onTranscriptReady?: (transcript: string) => void
  ) {
    this.onRecordingStateChange = onRecordingStateChange;
    this.onSpeechActivityChange = onSpeechActivityChange;
    this.onTranscriptReady = onTranscriptReady;
  }

  async startContinuousListening(): Promise<void> {
    try {
      // Clean up any existing resources first
      if (this.stream) {
        console.log('🎤 Cleaning up existing stream before starting new one');
        this.stopContinuousListening();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Log detailed track info for debugging
      const audioTrack = this.stream.getAudioTracks()[0];
      console.log('🎤 Audio track state:', {
        enabled: audioTrack.enabled,
        readyState: audioTrack.readyState,
        muted: audioTrack.muted,
        constraints: audioTrack.getConstraints()
      });

      // Set up audio context for VAD
      this.audioContext = new AudioContext({ sampleRate: 44100 });
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

    // VAD thresholds
    const START_THRESH = Math.max(0.15, this.volumeThreshold * 15);
    const STOP_THRESH = Math.max(0.08, this.volumeThreshold * 8);
    const MIN_SPEECH_MS = 1500; // Minimum speech duration
    let speaking = false;
    let speechStartAt = 0;
    let lastAboveStopAt = 0;
    let lastLogTime = 0;

    console.log('🎤 VAD Started with thresholds:', { START_THRESH, STOP_THRESH, MIN_SPEECH_MS });

    const checkVoiceActivity = () => {
      if (!this.analyser || !this.isContinuousMode) {
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
        const transcript = await this.processAudioBuffer();
        if (transcript && transcript.trim()) {
          console.log('🎤 📝 Transcript ready:', transcript);
          this.onTranscriptReady?.(transcript);
        }
      } catch (error) {
        console.error('🎤 ❌ Error processing audio:', error);
      }
    }

    this.speechBuffer = [];
  }

  private async processAudioBuffer(): Promise<string> {
    if (!this.speechBuffer.length || !this.audioContext) return '';

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

    // Convert to base64 for API call
    const base64Audio = await this.blobToBase64(wavBlob);

    // Here you would call your transcription API
    // For now, return a placeholder
    return await this.callTranscriptionAPI(base64Audio);
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

  private async callTranscriptionAPI(base64Audio: string): Promise<string> {
    // Call the existing speech_to_text_groq function
    console.log('🎤 📡 Calling transcription API with audio length:', base64Audio.length);
    
    try {
      // You'll need to pass session info - for now return placeholder
      // This will be updated when we integrate with the session system
      console.log('🎤 ⚠️ Transcription API not yet integrated with session system');
      return "Transcript placeholder - session integration needed";
    } catch (error) {
      console.error('🎤 ❌ Transcription API error:', error);
      return '';
    }
  }

  stopContinuousListening(): void {
    console.log('🎤 🛑 Stopping continuous listening...');
    
    this.isContinuousMode = false;
    this.isRecording = false;
    this.isCapturingAudio = false;

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