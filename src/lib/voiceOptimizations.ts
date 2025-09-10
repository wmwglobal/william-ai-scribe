/**
 * Voice Chat Optimizations
 * Improvements for faster response and better interrupt handling
 */

// Fast response configuration
export const FAST_RESPONSE_CONFIG = {
  // Skip memory recall for short utterances
  minLengthForMemory: 15,
  
  // Reduced memory limits for speed
  memoryLimit: 2,
  memoryMinImportance: 0.5,
  
  // Queue management
  maxQueueSize: 2,
  processingDelayMs: 50,
  
  // VAD improvements
  improvedVAD: {
    volumeThreshold: 0.015, // Slightly higher to avoid picking up TTS
    speechMinDuration: 800, // Minimum speech duration before processing
    speechMaxGap: 1200, // Maximum gap before ending speech detection
    ttsSuppressionMs: 3000, // Suppress VAD during TTS + buffer
  },
  
  // Response optimization
  response: {
    streamingEnabled: false, // Could be enabled for even faster responses
    parallelTTS: true, // Generate TTS for segments in parallel
    preloadNextSegment: true, // Start next segment while current is playing
    maxSegmentLength: 100, // Split long responses for faster start
  }
};

/**
 * Enhanced Voice Activity Detection to prevent TTS feedback
 */
export class EnhancedVAD {
  private volumeHistory: number[] = [];
  private isUserSpeaking = false;
  private isTTSSuppressed = false;
  private suppressionTimeout: NodeJS.Timeout | null = null;
  private speechStartTime = 0;
  private speechEndTime = 0;
  
  constructor(
    private config = FAST_RESPONSE_CONFIG.improvedVAD,
    private onSpeechChange?: (isSpeaking: boolean) => void
  ) {}

  /**
   * Suppress VAD during TTS playback to prevent feedback
   */
  suppressDuringTTS(durationMs: number = this.config.ttsSuppressionMs) {
    this.isTTSSuppressed = true;
    this.isUserSpeaking = false;
    
    if (this.suppressionTimeout) {
      clearTimeout(this.suppressionTimeout);
    }
    
    this.suppressionTimeout = setTimeout(() => {
      this.isTTSSuppressed = false;
      console.log('🎙️ VAD suppression ended, ready for user speech');
    }, durationMs);
    
    console.log(`🎙️ VAD suppressed for ${durationMs}ms during TTS`);
  }

  /**
   * Process audio volume and detect user speech
   */
  processVolume(volume: number): boolean {
    if (this.isTTSSuppressed) {
      return false; // Don't detect speech during TTS suppression
    }

    // Add to history
    this.volumeHistory.push(volume);
    if (this.volumeHistory.length > 10) {
      this.volumeHistory.shift();
    }

    // Calculate average volume to smooth out spikes
    const avgVolume = this.volumeHistory.reduce((sum, vol) => sum + vol, 0) / this.volumeHistory.length;
    const isSpeechDetected = avgVolume > this.config.volumeThreshold;
    
    const now = Date.now();
    
    if (isSpeechDetected && !this.isUserSpeaking) {
      // Speech started
      this.speechStartTime = now;
      this.isUserSpeaking = true;
      console.log('🎙️ User speech started');
      this.onSpeechChange?.(true);
    } else if (!isSpeechDetected && this.isUserSpeaking) {
      // Check if speech has been silent long enough
      const silenceDuration = now - this.speechEndTime;
      if (silenceDuration > this.config.speechMaxGap) {
        this.isUserSpeaking = false;
        console.log('🎙️ User speech ended');
        this.onSpeechChange?.(false);
      }
    }
    
    if (!isSpeechDetected) {
      this.speechEndTime = now;
    }
    
    return this.isUserSpeaking;
  }

  /**
   * Check if current speech duration is sufficient for processing
   */
  isSpeechReadyForProcessing(): boolean {
    if (!this.isUserSpeaking) return false;
    
    const speechDuration = Date.now() - this.speechStartTime;
    return speechDuration >= this.config.speechMinDuration;
  }

  /**
   * Reset VAD state (call when turn changes)
   */
  reset() {
    this.isUserSpeaking = false;
    this.volumeHistory = [];
    this.speechStartTime = 0;
    this.speechEndTime = 0;
  }

  /**
   * Clean up timers
   */
  destroy() {
    if (this.suppressionTimeout) {
      clearTimeout(this.suppressionTimeout);
    }
  }
}

/**
 * Optimized audio queue manager
 */
export class OptimizedAudioQueue {
  private queue: Blob[] = [];
  private isProcessing = false;
  private currentTurn = 0;
  
  constructor(
    private maxSize = FAST_RESPONSE_CONFIG.maxQueueSize,
    private processDelay = FAST_RESPONSE_CONFIG.processingDelayMs,
    private onProcess?: (blob: Blob, turn: number) => Promise<void>
  ) {}

  /**
   * Add audio to queue with backlog prevention
   */
  addAudio(audioBlob: Blob): void {
    // Prevent feedback loops by limiting queue size
    if (this.queue.length >= this.maxSize) {
      console.log('🚨 Clearing audio backlog to prevent feedback loop:', this.queue.length, 'items');
      this.queue.splice(0, this.queue.length - 1); // Keep only the latest
    }
    
    this.queue.push(audioBlob);
    console.log('🎙️ Added to queue, length:', this.queue.length);
    
    this.processQueue();
  }

  /**
   * Process audio queue with interrupt handling
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const myTurn = ++this.currentTurn;
    
    try {
      while (this.queue.length > 0) {
        const audioBlob = this.queue.shift()!;
        
        // Check if this turn is still valid
        if (myTurn !== this.currentTurn) {
          console.log('⏩ Skipping queued audio due to interrupt');
          break;
        }
        
        await this.onProcess?.(audioBlob, myTurn);
        
        // Small delay between processing items
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.processDelay));
        }
      }
    } catch (error) {
      console.error('❌ Audio queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Interrupt current processing (call when user interrupts)
   */
  interrupt(): void {
    this.currentTurn++;
    console.log('🛑 Audio queue interrupted, new turn:', this.currentTurn);
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    this.queue.length = 0;
    this.interrupt();
  }

  /**
   * Get current turn number
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }
}

/**
 * Response time optimizer
 */
export class ResponseOptimizer {
  /**
   * Determine if memory recall should be skipped for speed
   */
  static shouldSkipMemory(userMessage: string): boolean {
    return userMessage.length <= FAST_RESPONSE_CONFIG.minLengthForMemory;
  }

  /**
   * Get optimized memory recall parameters
   */
  static getMemoryParams() {
    return {
      limit: FAST_RESPONSE_CONFIG.memoryLimit,
      minImportance: FAST_RESPONSE_CONFIG.memoryMinImportance
    };
  }

  /**
   * Detect if user message is likely a short acknowledgment that doesn't need full processing
   */
  static isShortAcknowledgment(userMessage: string): boolean {
    const acknowledgments = [
      'yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank you',
      'yeah', 'yep', 'nope', 'right', 'exactly', 'got it', 
      'understood', 'mm-hmm', 'uh-huh', 'alright', 'cool'
    ];
    
    const cleanMessage = userMessage.toLowerCase().trim().replace(/[.,!?]/g, '');
    return acknowledgments.includes(cleanMessage) || cleanMessage.length <= 3;
  }

  /**
   * Get fast response mode configuration based on user input
   */
  static getFastModeConfig(userMessage: string) {
    const isShort = this.isShortAcknowledgment(userMessage);
    const skipMemory = this.shouldSkipMemory(userMessage);
    
    return {
      isShortAcknowledgment: isShort,
      skipMemory,
      useSimpleResponse: isShort,
      prioritizeSpeed: isShort || userMessage.length < 20
    };
  }
}