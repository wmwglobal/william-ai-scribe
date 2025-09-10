/**
 * Comedy-Enhanced TTS System
 * Handles pause markers and comedic timing for William's responses
 */

export interface PauseInstruction {
  position: number;
  duration: number;
  type: 'beat' | 'effect' | 'dramatic' | 'breath';
}

export interface TTSSegment {
  text: string;
  pauseAfter?: number;
  emphasis?: 'normal' | 'strong' | 'reduced';
  speed?: number; // 0.5 to 2.0
}

export class ComedyTTSProcessor {
  private pausePattern = /\[pause:(\d+(?:\.\d+)?)s\]/g;
  private emphasisPattern = /\[emphasis:(\w+)\]/g;
  private speedPattern = /\[speed:(\d+(?:\.\d+)?)\]/g;

  processTextForTTS(text: string): TTSSegment[] {
    const segments: TTSSegment[] = [];
    let lastIndex = 0;
    
    // Find all pause markers
    const pauseMatches = Array.from(text.matchAll(this.pausePattern));
    
    pauseMatches.forEach((match, index) => {
      // Add text segment before this pause
      const segmentText = text.slice(lastIndex, match.index).trim();
      if (segmentText) {
        segments.push({
          text: segmentText,
          pauseAfter: parseFloat(match[1]),
          emphasis: 'normal',
          speed: 1.0
        });
      }
      
      lastIndex = match.index! + match[0].length;
    });
    
    // Add remaining text
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText) {
      // Clean any remaining markers
      const cleanText = this.cleanMarkers(remainingText);
      segments.push({
        text: cleanText,
        emphasis: 'normal',
        speed: 1.0
      });
    }
    
    return segments;
  }

  private cleanMarkers(text: string): string {
    return text
      .replace(this.pausePattern, '')
      .replace(this.emphasisPattern, '')
      .replace(this.speedPattern, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Convert TTS segments to audio queue for playback
  async generateAudioSegments(
    segments: TTSSegment[], 
    voiceId: string = 'william_natural'
  ): Promise<AudioSegment[]> {
    const audioSegments: AudioSegment[] = [];
    
    for (const segment of segments) {
      // Generate TTS for the text
      const audioBlob = await this.synthesizeText(segment.text, voiceId, {
        speed: segment.speed || 1.0,
        emphasis: segment.emphasis || 'normal'
      });
      
      audioSegments.push({
        audioBlob,
        duration: await this.getAudioDuration(audioBlob),
        pauseAfter: segment.pauseAfter || 0,
        text: segment.text
      });
    }
    
    return audioSegments;
  }

  private async synthesizeText(
    text: string, 
    voiceId: string, 
    options: { speed: number; emphasis: string }
  ): Promise<Blob> {
    // This would integrate with your TTS service (ElevenLabs, etc.)
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        speed: options.speed,
        emphasis: options.emphasis
      })
    });
    
    return await response.blob();
  }

  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
    });
  }
}

export interface AudioSegment {
  audioBlob: Blob;
  duration: number;
  pauseAfter: number;
  text: string;
}

export class ComedyAudioPlayer {
  private audioQueue: AudioSegment[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private onSegmentComplete?: (segment: AudioSegment) => void;
  private onPauseStart?: (duration: number) => void;
  private onPlaybackComplete?: () => void;

  constructor(callbacks?: {
    onSegmentComplete?: (segment: AudioSegment) => void;
    onPauseStart?: (duration: number) => void;
    onPlaybackComplete?: () => void;
  }) {
    this.onSegmentComplete = callbacks?.onSegmentComplete;
    this.onPauseStart = callbacks?.onPauseStart;
    this.onPlaybackComplete = callbacks?.onPlaybackComplete;
  }

  async playAudioSegments(segments: AudioSegment[]): Promise<void> {
    this.audioQueue = [...segments];
    this.isPlaying = true;
    
    await this.playNextSegment();
  }

  private async playNextSegment(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackComplete?.();
      return;
    }

    const segment = this.audioQueue.shift()!;
    
    // Create audio element
    this.currentAudio = new Audio(URL.createObjectURL(segment.audioBlob));
    
    // Set up event listeners
    this.currentAudio.addEventListener('ended', async () => {
      URL.revokeObjectURL(this.currentAudio!.src);
      this.onSegmentComplete?.(segment);
      
      // Handle pause after segment
      if (segment.pauseAfter > 0) {
        this.onPauseStart?.(segment.pauseAfter);
        await this.pause(segment.pauseAfter * 1000); // Convert to milliseconds
      }
      
      // Play next segment
      if (this.isPlaying) {
        await this.playNextSegment();
      }
    });

    this.currentAudio.addEventListener('error', (error) => {
      console.error('Audio playback error:', error);
      // Skip to next segment on error
      if (this.isPlaying) {
        this.playNextSegment();
      }
    });

    // Start playback
    try {
      await this.currentAudio.play();
    } catch (error) {
      console.error('Failed to play audio segment:', error);
      // Skip to next segment
      if (this.isPlaying) {
        await this.playNextSegment();
      }
    }
  }

  private async pause(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  stop(): void {
    this.isPlaying = false;
    this.audioQueue = [];
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Enhanced Audio Utils with Comedy Support
export class ComedyAudioUtils {
  private ttsProcessor = new ComedyTTSProcessor();
  private audioPlayer = new ComedyAudioPlayer();

  async playComedyResponse(
    text: string,
    voiceId: string = 'william_natural',
    callbacks?: {
      onSegmentComplete?: (segment: AudioSegment) => void;
      onPauseStart?: (duration: number) => void;
      onPlaybackComplete?: () => void;
    }
  ): Promise<void> {
    // Process text into TTS segments
    const segments = this.ttsProcessor.processTextForTTS(text);
    
    // Generate audio for each segment
    const audioSegments = await this.ttsProcessor.generateAudioSegments(segments, voiceId);
    
    // Create player with callbacks
    const player = new ComedyAudioPlayer(callbacks);
    
    // Play the segments with proper timing
    await player.playAudioSegments(audioSegments);
  }

  // For debugging - extract timing information
  analyzeComedyTiming(text: string): {
    totalSegments: number;
    totalPauses: number;
    totalPauseDuration: number;
    pauseBreakdown: { [key: string]: number };
    estimatedDuration: number;
  } {
    const segments = this.ttsProcessor.processTextForTTS(text);
    const pauseBreakdown: { [key: string]: number } = {};
    
    let totalPauses = 0;
    let totalPauseDuration = 0;
    
    segments.forEach(segment => {
      if (segment.pauseAfter && segment.pauseAfter > 0) {
        totalPauses++;
        totalPauseDuration += segment.pauseAfter;
        
        // Categorize pause type
        const duration = segment.pauseAfter;
        const category = duration <= 0.3 ? 'beat' : 
                        duration <= 0.6 ? 'effect' : 
                        'dramatic';
        pauseBreakdown[category] = (pauseBreakdown[category] || 0) + 1;
      }
    });
    
    // Estimate speaking duration (rough: 150 words per minute)
    const wordCount = text.split(' ').length;
    const speakingDuration = (wordCount / 150) * 60; // seconds
    const estimatedDuration = speakingDuration + totalPauseDuration;
    
    return {
      totalSegments: segments.length,
      totalPauses,
      totalPauseDuration,
      pauseBreakdown,
      estimatedDuration
    };
  }
}