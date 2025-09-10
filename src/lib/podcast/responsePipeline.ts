/**
 * Response Pipeline
 * Processes responses through multiple stages for optimal podcast delivery
 */

import { supabase } from '@/integrations/supabase/client';
import type { ConversationContext, ConversationMode } from './consciousness';

export interface PipelineStage {
  name: string;
  process: (input: string, context: PipelineContext) => Promise<string>;
  priority: number;
  enabled: boolean;
}

export interface PipelineContext {
  originalInput: string;
  conversationContext: ConversationContext;
  mode: ConversationMode;
  callbacks?: string[];
  timing?: TimingMarkers;
  comedyScore?: number;
  emotionalTone?: string;
}

export interface TimingMarkers {
  pauses: PauseMarker[];
  emphasis: EmphasisMarker[];
  speed: SpeedMarker[];
  overall: OverallTiming;
}

export interface PauseMarker {
  position: number; // character position
  duration: number; // milliseconds
  type: 'comedic' | 'dramatic' | 'natural' | 'breath';
}

export interface EmphasisMarker {
  start: number;
  end: number;
  level: 'low' | 'medium' | 'high';
}

export interface SpeedMarker {
  start: number;
  end: number;
  rate: number; // 0.5 = half speed, 2.0 = double speed
}

export interface OverallTiming {
  estimatedDuration: number;
  wordsPerMinute: number;
  pauseRatio: number; // percentage of time in pauses
}

export interface ProcessedResponse {
  text: string;
  markedText: string; // with timing markers
  timing: TimingMarkers;
  metadata: {
    comedyScore: number;
    callbacksUsed: string[];
    emotionalTone: string;
    suggestedVoiceParams: VoiceParameters;
  };
}

export interface VoiceParameters {
  pitch: number;      // -1 to 1
  speed: number;      // 0.5 to 2
  emphasis: number;   // 0 to 1
  warmth: number;     // 0 to 1
}

/**
 * Main Response Pipeline
 */
export class ResponsePipeline {
  private stages: Map<string, PipelineStage> = new Map();
  private comedyInjector: ComedyInjector;
  private timingOptimizer: TimingOptimizer;
  private callbackWeaver: CallbackWeaver;

  constructor() {
    this.comedyInjector = new ComedyInjector();
    this.timingOptimizer = new TimingOptimizer();
    this.callbackWeaver = new CallbackWeaver();
    
    this.initializeStages();
  }

  private initializeStages(): void {
    // Stage 1: Base response generation (handled externally)
    
    // Stage 2: Callback integration
    this.addStage({
      name: 'callback-integration',
      priority: 2,
      enabled: true,
      process: async (input, context) => {
        if (context.callbacks && context.callbacks.length > 0) {
          return this.callbackWeaver.weaveCallbacks(input, context.callbacks);
        }
        return input;
      }
    });

    // Stage 3: Comedy injection
    this.addStage({
      name: 'comedy-injection',
      priority: 3,
      enabled: true,
      process: async (input, context) => {
        if (context.mode === 'comedy' || context.mode === 'banter' || context.mode === 'riffing') {
          return this.comedyInjector.inject(input, context);
        }
        return input;
      }
    });

    // Stage 4: Timing optimization
    this.addStage({
      name: 'timing-optimization',
      priority: 4,
      enabled: true,
      process: async (input, context) => {
        const marked = this.timingOptimizer.optimize(input, context);
        context.timing = this.timingOptimizer.extractMarkers(marked);
        return marked;
      }
    });

    // Stage 5: Voice parameter adjustment
    this.addStage({
      name: 'voice-adjustment',
      priority: 5,
      enabled: true,
      process: async (input, context) => {
        return this.adjustVoiceParameters(input, context);
      }
    });
  }

  private addStage(stage: PipelineStage): void {
    this.stages.set(stage.name, stage);
  }

  /**
   * Process response through the pipeline
   */
  async process(
    response: string,
    context: ConversationContext,
    callbacks?: string[]
  ): Promise<ProcessedResponse> {
    const pipelineContext: PipelineContext = {
      originalInput: response,
      conversationContext: context,
      mode: context.currentMode,
      callbacks,
      comedyScore: 0
    };

    // Sort stages by priority
    const sortedStages = Array.from(this.stages.values())
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Process through each stage
    let processedText = response;
    for (const stage of sortedStages) {
      try {
        processedText = await stage.process(processedText, pipelineContext);
      } catch (error) {
        console.error(`Error in pipeline stage ${stage.name}:`, error);
        // Continue with unmodified text if stage fails
      }
    }

    // Extract final timing markers
    const timing = pipelineContext.timing || this.timingOptimizer.extractMarkers(processedText);
    
    // Calculate voice parameters
    const voiceParams = this.calculateVoiceParameters(pipelineContext);

    return {
      text: this.stripMarkers(processedText),
      markedText: processedText,
      timing,
      metadata: {
        comedyScore: pipelineContext.comedyScore || 0,
        callbacksUsed: pipelineContext.callbacks || [],
        emotionalTone: pipelineContext.emotionalTone || 'neutral',
        suggestedVoiceParams: voiceParams
      }
    };
  }

  private adjustVoiceParameters(text: string, context: PipelineContext): string {
    // Add voice control markers based on context
    let adjusted = text;

    // Emotional tone adjustments
    switch (context.conversationContext.emotionalArc.current) {
      case 'excited':
        adjusted = `<voice:speed=1.1,pitch=0.2>${adjusted}</voice>`;
        break;
      case 'contemplative':
        adjusted = `<voice:speed=0.9,emphasis=0.7>${adjusted}</voice>`;
        break;
      case 'playful':
        adjusted = `<voice:speed=1.05,pitch=0.1,warmth=0.8>${adjusted}</voice>`;
        break;
    }

    return adjusted;
  }

  private calculateVoiceParameters(context: PipelineContext): VoiceParameters {
    const params: VoiceParameters = {
      pitch: 0,
      speed: 1,
      emphasis: 0.5,
      warmth: 0.7
    };

    // Adjust based on mode
    switch (context.mode) {
      case 'philosophical':
        params.speed = 0.95;
        params.emphasis = 0.7;
        params.warmth = 0.6;
        break;
      case 'comedy':
        params.speed = 1.05;
        params.pitch = 0.1;
        params.warmth = 0.8;
        break;
      case 'storytelling':
        params.speed = 0.9;
        params.emphasis = 0.8;
        params.warmth = 0.75;
        break;
      case 'debate':
        params.speed = 1.1;
        params.emphasis = 0.9;
        params.warmth = 0.5;
        break;
    }

    // Adjust based on energy level
    const energy = context.conversationContext.pacing.energyLevel;
    params.speed *= (0.9 + energy * 0.02); // 0.9 to 1.1 based on energy

    return params;
  }

  private stripMarkers(text: string): string {
    // Remove all timing and voice markers for clean text
    return text
      .replace(/<pause:\d+>/g, '')
      .replace(/<emphasis[^>]*>/g, '')
      .replace(/<\/emphasis>/g, '')
      .replace(/<speed[^>]*>/g, '')
      .replace(/<\/speed>/g, '')
      .replace(/<voice[^>]*>/g, '')
      .replace(/<\/voice>/g, '');
  }
}

/**
 * Comedy Injection System
 */
class ComedyInjector {
  private comedyPatterns = [
    { pattern: /I mean/g, replacement: "I mean..." },
    { pattern: /basically/g, replacement: "basically..." },
    { pattern: /\. But/g, replacement: "... But" },
    { pattern: /And then/g, replacement: "And then..." }
  ];

  async inject(text: string, context: PipelineContext): Promise<string> {
    let enhanced = text;
    
    // Identify potential punchline locations
    const sentences = text.split(/[.!?]/);
    if (sentences.length > 2) {
      // Add pause before last sentence (potential punchline)
      const lastSentence = sentences[sentences.length - 1];
      const setup = sentences.slice(0, -1).join('. ');
      enhanced = `${setup}.<pause:800>${lastSentence}`;
    }

    // Add comedic timing patterns
    this.comedyPatterns.forEach(({ pattern, replacement }) => {
      enhanced = enhanced.replace(pattern, replacement);
    });

    // Calculate comedy score
    context.comedyScore = this.evaluateComedyScore(enhanced);

    // Add callbacks for extra laughs
    if (context.callbacks && context.callbacks.length > 0 && Math.random() > 0.6) {
      const callback = context.callbacks[0];
      enhanced += `<pause:500> Actually, wait - ${callback}`;
      context.comedyScore += 2;
    }

    return enhanced;
  }

  private evaluateComedyScore(text: string): number {
    let score = 0;
    
    // Check for setup-punchline structure
    if (text.includes('<pause:800>')) score += 3;
    
    // Check for comedic words
    const funnyWords = /ridiculous|absurd|hilarious|weird|crazy|bonkers/gi;
    const matches = text.match(funnyWords);
    if (matches) score += matches.length;
    
    // Check for contrast/irony indicators
    if (/but actually|plot twist|here's the thing/i.test(text)) score += 2;
    
    return Math.min(10, score);
  }
}

/**
 * Timing Optimization System
 */
class TimingOptimizer {
  optimize(text: string, context: PipelineContext): string {
    let optimized = text;
    
    // Add natural pauses at punctuation
    optimized = this.addNaturalPauses(optimized);
    
    // Add mode-specific timing
    optimized = this.addModeSpecificTiming(optimized, context.mode);
    
    // Add emphasis markers
    optimized = this.addEmphasisMarkers(optimized);
    
    // Optimize for voice delivery
    optimized = this.optimizeForVoice(optimized, context);
    
    return optimized;
  }

  private addNaturalPauses(text: string): string {
    let marked = text;
    
    // Standard punctuation pauses
    marked = marked.replace(/\. /g, '.<pause:400> ');
    marked = marked.replace(/\? /g, '?<pause:500> ');
    marked = marked.replace(/! /g, '!<pause:450> ');
    marked = marked.replace(/, /g, ',<pause:200> ');
    marked = marked.replace(/: /g, ':<pause:300> ');
    marked = marked.replace(/; /g, ';<pause:250> ');
    
    // Ellipsis for dramatic effect
    marked = marked.replace(/\.\.\./g, '<pause:1000>');
    
    return marked;
  }

  private addModeSpecificTiming(text: string, mode: ConversationMode): string {
    let marked = text;
    
    switch (mode) {
      case 'philosophical':
        // Longer pauses for contemplation
        marked = marked.replace(/<pause:400>/g, '<pause:600>');
        marked = marked.replace(/what if/gi, '<pause:300>what if');
        break;
        
      case 'comedy':
        // Setup-punchline timing
        const lastPeriod = marked.lastIndexOf('.');
        if (lastPeriod > marked.length * 0.7) {
          marked = marked.substring(0, lastPeriod) + 
                  '<pause:800>' + 
                  marked.substring(lastPeriod);
        }
        break;
        
      case 'storytelling':
        // Building tension
        marked = marked.replace(/suddenly/gi, '<pause:500>suddenly');
        marked = marked.replace(/and then/gi, '<pause:400>and then');
        break;
    }
    
    return marked;
  }

  private addEmphasisMarkers(text: string): string {
    let marked = text;
    
    // Emphasis on key words
    const emphasisWords = [
      'really', 'absolutely', 'definitely', 'incredible', 
      'amazing', 'exactly', 'precisely', 'totally'
    ];
    
    emphasisWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      marked = marked.replace(regex, `<emphasis:high>${word}</emphasis>`);
    });
    
    // Emphasis on ALL CAPS words
    marked = marked.replace(/\b[A-Z]{2,}\b/g, '<emphasis:high>$&</emphasis>');
    
    return marked;
  }

  private optimizeForVoice(text: string, context: PipelineContext): string {
    let optimized = text;
    
    // Add breath pauses for long sentences
    const sentences = optimized.split(/[.!?]/);
    sentences.forEach(sentence => {
      const words = sentence.split(' ').length;
      if (words > 20) {
        // Add breath pause in the middle
        const middle = Math.floor(sentence.length / 2);
        const nearestComma = sentence.indexOf(',', middle);
        if (nearestComma > -1) {
          optimized = optimized.replace(
            sentence,
            sentence.substring(0, nearestComma) + 
            '<pause:300,type:breath>' + 
            sentence.substring(nearestComma)
          );
        }
      }
    });
    
    return optimized;
  }

  extractMarkers(text: string): TimingMarkers {
    const pauses: PauseMarker[] = [];
    const emphasis: EmphasisMarker[] = [];
    const speed: SpeedMarker[] = [];
    
    // Extract pause markers
    const pauseRegex = /<pause:(\d+)(?:,type:(\w+))?>/g;
    let pauseMatch;
    while ((pauseMatch = pauseRegex.exec(text)) !== null) {
      pauses.push({
        position: pauseMatch.index,
        duration: parseInt(pauseMatch[1]),
        type: (pauseMatch[2] as any) || 'natural'
      });
    }
    
    // Extract emphasis markers
    const emphasisRegex = /<emphasis:(\w+)>(.*?)<\/emphasis>/g;
    let emphasisMatch;
    while ((emphasisMatch = emphasisRegex.exec(text)) !== null) {
      emphasis.push({
        start: emphasisMatch.index,
        end: emphasisMatch.index + emphasisMatch[2].length,
        level: emphasisMatch[1] as any
      });
    }
    
    // Calculate overall timing
    const cleanText = text.replace(/<[^>]+>/g, '');
    const words = cleanText.split(/\s+/).length;
    const totalPauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0);
    const speakingTime = (words / 150) * 60 * 1000; // 150 WPM baseline
    
    return {
      pauses,
      emphasis,
      speed,
      overall: {
        estimatedDuration: speakingTime + totalPauseDuration,
        wordsPerMinute: Math.round((words / ((speakingTime + totalPauseDuration) / 60000))),
        pauseRatio: totalPauseDuration / (speakingTime + totalPauseDuration)
      }
    };
  }
}

/**
 * Callback Weaving System
 */
class CallbackWeaver {
  weaveCallbacks(text: string, callbacks: string[]): string {
    if (callbacks.length === 0) return text;
    
    // Identify natural callback insertion points
    const insertionPoints = this.findInsertionPoints(text);
    
    if (insertionPoints.length === 0) {
      // If no natural points, add at the end
      return `${text}<pause:500> You know what? ${callbacks[0]}`;
    }
    
    // Insert callback at best point
    const bestPoint = insertionPoints[0];
    const callback = this.formatCallback(callbacks[0]);
    
    return text.substring(0, bestPoint.position) + 
           callback + 
           text.substring(bestPoint.position);
  }

  private findInsertionPoints(text: string): Array<{position: number; score: number}> {
    const points: Array<{position: number; score: number}> = [];
    
    // Look for callback triggers
    const triggers = [
      { pattern: /speaking of/gi, score: 10 },
      { pattern: /that reminds me/gi, score: 9 },
      { pattern: /actually/gi, score: 7 },
      { pattern: /you know what/gi, score: 8 },
      { pattern: /here's the thing/gi, score: 6 }
    ];
    
    triggers.forEach(({ pattern, score }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ position: match.index, score });
      }
    });
    
    return points.sort((a, b) => b.score - a.score);
  }

  private formatCallback(callback: string): string {
    const formats = [
      `<pause:500> Speaking of which, ${callback}<pause:300>`,
      `<pause:400> - actually, ${callback} -<pause:300>`,
      `<pause:600> (remember ${callback}?)<pause:400>`,
      `... which reminds me: ${callback}...`
    ];
    
    return formats[Math.floor(Math.random() * formats.length)];
  }
}