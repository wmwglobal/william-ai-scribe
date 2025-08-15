export class AudioPlayer {
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(private onPlayingChange?: (isPlaying: boolean) => void) {}

  async playAudio(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert base64 to blob
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        
        const audio = new Audio(audioUrl);
        
        audio.onloadeddata = () => {
          console.log('Audio loaded successfully');
        };
        
        audio.onplay = () => {
          this.isPlaying = true;
          this.currentAudio = audio;
          this.onPlayingChange?.(true);
          console.log('Audio playback started');
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
        
        // Start playback
        audio.play().catch(error => {
          console.error('Error starting audio playback:', error);
          this.isPlaying = false;
          this.currentAudio = null;
          this.onPlayingChange?.(false);
          URL.revokeObjectURL(audioUrl);
          reject(error);
        });
        
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

  constructor(
    private onDataAvailable?: (audioBlob: Blob) => void,
    private onRecordingChange?: (isRecording: boolean) => void
  ) {}

  async startRecording(): Promise<void> {
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
        const audioBlob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
        this.onDataAvailable?.(audioBlob);
        this.chunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.onRecordingChange?.(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.onRecordingChange?.(false);
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      console.log('Recording stopped');
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
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