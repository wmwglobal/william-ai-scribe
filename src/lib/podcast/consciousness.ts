/**
 * Tri-Layered Consciousness Model for Podcast-Style AI Conversations
 * Implements sophisticated conversation management with philosophical depth and comedy timing
 */

// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: { [key: string]: ((...args: unknown[]) => void)[] } = {};
  
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event: string, ...args: unknown[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
  
  off(event: string, callback: (...args: unknown[]) => void) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

// Types and Interfaces
export interface ConversationContext {
  themes: Theme[];
  currentMode: ConversationMode;
  emotionalArc: EmotionalArc;
  callbacks: CallbackOpportunity[];
  segments: ConversationSegment[];
  pacing: PacingMetrics;
  audienceEngagement: number;
}

export interface Theme {
  id: string;
  topic: string;
  depth: number; // 0-10, how deeply we've explored this
  firstMentioned: Date;
  lastReferenced: Date;
  relatedThemes: string[];
  potentialCallbacks: string[];
}

export interface CallbackOpportunity {
  id: string;
  setup: string;
  context: string;
  timestamp: Date;
  used: boolean;
  quality: number; // 0-10, how good the callback opportunity is
  expiresAt?: Date; // Some callbacks get stale
}

export interface ConversationSegment {
  id: string;
  startTime: Date;
  endTime?: Date;
  mode: ConversationMode;
  themes: string[];
  highlights: string[];
  audienceScore: number;
}

export interface EmotionalArc {
  current: EmotionalState;
  trajectory: 'rising' | 'falling' | 'plateau';
  intensity: number; // 0-10
  sustainedFor: number; // milliseconds
}

export interface PacingMetrics {
  wordsPerMinute: number;
  pauseFrequency: number;
  topicSwitchRate: number;
  energyLevel: number; // 0-10
  varietyScore: number; // 0-10
}

export type ConversationMode = 
  | 'philosophical'
  | 'comedy'
  | 'banter'
  | 'storytelling'
  | 'debate'
  | 'riffing'
  | 'segment-transition'
  | 'audience-interaction';

export type EmotionalState = 
  | 'curious'
  | 'playful'
  | 'thoughtful'
  | 'excited'
  | 'contemplative'
  | 'amused'
  | 'challenging'
  | 'supportive';

/**
 * Layer 1: Conversational Layer
 * Handles direct response generation and immediate context
 */
export class ConversationalLayer {
  private context: ConversationContext;
  private responseHistory: string[] = [];
  
  constructor(context: ConversationContext) {
    this.context = context;
  }

  async generateResponse(input: string, mode?: ConversationMode): Promise<string> {
    // Basic response generation with mode awareness
    const currentMode = mode || this.context.currentMode;
    
    // Apply mode-specific transformations
    let response = await this.generateBaseResponse(input, currentMode);
    
    // Track response for history
    this.responseHistory.push(response);
    if (this.responseHistory.length > 100) {
      this.responseHistory.shift(); // Keep only recent history
    }
    
    return response;
  }

  private async generateBaseResponse(input: string, mode: ConversationMode): Promise<string> {
    // This would integrate with your existing chat system
    // Adding mode-specific system prompts
    const modePrompts = {
      philosophical: "Respond with depth and wonder, exploring the implications.",
      comedy: "Find the humor, build on it, time the punchline perfectly.",
      banter: "Quick wit, playful jabs, keep the energy high.",
      storytelling: "Paint the picture, build tension, make them lean in.",
      debate: "Challenge respectfully, build arguments, acknowledge good points.",
      riffing: "Yes-and everything, build absurdity, embrace the chaos.",
      'segment-transition': "Smoothly bridge topics, maintain energy, tease what's coming.",
      'audience-interaction': "Direct, inclusive, make them feel part of the show."
    };

    // Placeholder for actual LLM integration
    return `[${mode}] response to: ${input}`;
  }

  getRecentContext(lines: number = 5): string[] {
    return this.responseHistory.slice(-lines);
  }
}

/**
 * Layer 2: Meta-Cognitive Layer
 * Tracks conversation arc, themes, and opportunities
 */
export class MetaCognitiveLayer extends EventEmitter {
  private themes: Map<string, Theme> = new Map();
  private callbacks: CallbackOpportunity[] = [];
  private currentSegment?: ConversationSegment;
  private segmentHistory: ConversationSegment[] = [];
  
  constructor() {
    super();
  }

  analyzeInput(input: string, context: ConversationContext): void {
    // Extract themes
    const extractedThemes = this.extractThemes(input);
    extractedThemes.forEach(theme => this.updateTheme(theme));
    
    // Identify callback opportunities
    const callbackOps = this.identifyCallbacks(input, context);
    this.callbacks.push(...callbackOps);
    
    // Update conversation segment
    this.updateSegment(context);
    
    // Emit events for state changes
    this.emit('themes-updated', Array.from(this.themes.values()));
    this.emit('callbacks-available', this.callbacks.filter(c => !c.used));
  }

  private extractThemes(input: string): string[] {
    // Sophisticated theme extraction
    const keywords = input.toLowerCase().split(/\s+/);
    const philosophicalTerms = ['consciousness', 'reality', 'existence', 'meaning', 'truth'];
    const comedyMarkers = ['funny', 'hilarious', 'joke', 'laugh'];
    
    const themes: string[] = [];
    
    // Check for philosophical themes
    if (keywords.some(k => philosophicalTerms.includes(k))) {
      themes.push('philosophy');
    }
    
    // Check for comedy themes
    if (keywords.some(k => comedyMarkers.includes(k))) {
      themes.push('comedy');
    }
    
    return themes;
  }

  private updateTheme(themeName: string): void {
    const existing = this.themes.get(themeName);
    if (existing) {
      existing.depth = Math.min(10, existing.depth + 0.5);
      existing.lastReferenced = new Date();
    } else {
      this.themes.set(themeName, {
        id: `theme_${Date.now()}`,
        topic: themeName,
        depth: 1,
        firstMentioned: new Date(),
        lastReferenced: new Date(),
        relatedThemes: [],
        potentialCallbacks: []
      });
    }
  }

  private identifyCallbacks(input: string, context: ConversationContext): CallbackOpportunity[] {
    const opportunities: CallbackOpportunity[] = [];
    
    // Look for setup phrases that could be referenced later
    const setupPatterns = [
      /remember when (.*)/i,
      /that's like (.*)/i,
      /speaking of (.*)/i,
      /which reminds me of (.*)/i
    ];
    
    setupPatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        opportunities.push({
          id: `callback_${Date.now()}`,
          setup: match[1],
          context: input,
          timestamp: new Date(),
          used: false,
          quality: this.evaluateCallbackQuality(match[1]),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minute expiry
        });
      }
    });
    
    return opportunities;
  }

  private evaluateCallbackQuality(setup: string): number {
    // Evaluate how good a callback opportunity is
    let quality = 5; // Base quality
    
    // Boost for specificity
    if (setup.length > 20) quality += 2;
    
    // Boost for emotional content
    if (/funny|amazing|terrible|weird/.test(setup)) quality += 1;
    
    // Boost for uniqueness
    if (!this.callbacks.some(c => c.setup.includes(setup))) quality += 2;
    
    return Math.min(10, quality);
  }

  private updateSegment(context: ConversationContext): void {
    const now = new Date();
    
    // Check if we need a new segment
    if (!this.currentSegment || 
        this.shouldStartNewSegment(context)) {
      
      // Close current segment
      if (this.currentSegment) {
        this.currentSegment.endTime = now;
        this.segmentHistory.push(this.currentSegment);
      }
      
      // Start new segment
      this.currentSegment = {
        id: `segment_${Date.now()}`,
        startTime: now,
        mode: context.currentMode,
        themes: Array.from(this.themes.keys()),
        highlights: [],
        audienceScore: context.audienceEngagement
      };
      
      this.emit('segment-change', this.currentSegment);
    }
  }

  private shouldStartNewSegment(context: ConversationContext): boolean {
    if (!this.currentSegment) return true;
    
    const segmentDuration = Date.now() - this.currentSegment.startTime.getTime();
    const modeChanged = this.currentSegment.mode !== context.currentMode;
    const longSegment = segmentDuration > 5 * 60 * 1000; // 5 minutes
    
    return modeChanged || longSegment;
  }

  getBestCallback(): CallbackOpportunity | null {
    const available = this.callbacks
      .filter(c => !c.used && (!c.expiresAt || c.expiresAt > new Date()))
      .sort((a, b) => b.quality - a.quality);
    
    return available[0] || null;
  }

  getConversationArc(): {
    themes: Theme[],
    segments: ConversationSegment[],
    currentDepth: number
  } {
    const themes = Array.from(this.themes.values());
    const avgDepth = themes.reduce((sum, t) => sum + t.depth, 0) / (themes.length || 1);
    
    return {
      themes,
      segments: this.segmentHistory,
      currentDepth: avgDepth
    };
  }
}

/**
 * Layer 3: Performance Layer
 * Manages entertainment value, timing, and audience awareness
 */
export class PerformanceLayer {
  private energyLevel: number = 5;
  private comedyBuffer: string[] = [];
  private timingPatterns: TimingPattern[] = [];
  private audienceModel: AudienceModel;
  
  constructor() {
    this.audienceModel = new AudienceModel();
    this.initializeTimingPatterns();
  }

  private initializeTimingPatterns(): void {
    this.timingPatterns = [
      {
        name: 'setup-punchline',
        setup: { pauseBefore: 0, pauseAfter: 500 },
        punchline: { pauseBefore: 800, pauseAfter: 1500 }
      },
      {
        name: 'dramatic-pause',
        setup: { pauseBefore: 0, pauseAfter: 0 },
        punchline: { pauseBefore: 2000, pauseAfter: 500 }
      },
      {
        name: 'rapid-fire',
        setup: { pauseBefore: 0, pauseAfter: 100 },
        punchline: { pauseBefore: 100, pauseAfter: 300 }
      }
    ];
  }

  optimizeResponse(
    response: string, 
    context: ConversationContext
  ): OptimizedResponse {
    // Analyze response for comedy potential
    const comedyScore = this.evaluateComedyPotential(response);
    
    // Determine optimal timing
    const timing = this.selectTimingPattern(context, comedyScore);
    
    // Inject pauses and emphasis
    const optimized = this.injectTimingMarkers(response, timing);
    
    // Add performance notes
    const performanceNotes = this.generatePerformanceNotes(context);
    
    return {
      text: optimized,
      timing,
      performanceNotes,
      energyLevel: this.energyLevel,
      suggestedMode: this.suggestNextMode(context)
    };
  }

  private evaluateComedyPotential(response: string): number {
    let score = 0;
    
    // Check for joke structures
    if (response.includes('...')) score += 2; // Pause for effect
    if (/\?.*!/.test(response)) score += 1; // Question to exclamation
    if (response.split(',').length > 3) score += 1; // Building rhythm
    
    // Check for callback references
    if (/earlier|before|remember when/.test(response.toLowerCase())) score += 3;
    
    return Math.min(10, score);
  }

  private selectTimingPattern(
    context: ConversationContext, 
    comedyScore: number
  ): TimingPattern {
    if (comedyScore > 7) {
      return this.timingPatterns.find(p => p.name === 'setup-punchline')!;
    } else if (context.currentMode === 'philosophical') {
      return this.timingPatterns.find(p => p.name === 'dramatic-pause')!;
    } else if (context.pacing.energyLevel > 7) {
      return this.timingPatterns.find(p => p.name === 'rapid-fire')!;
    }
    
    return this.timingPatterns[0]; // Default
  }

  private injectTimingMarkers(response: string, timing: TimingPattern): string {
    // Add pause markers that the TTS system can interpret
    let marked = response;
    
    // Add natural pauses at punctuation
    marked = marked.replace(/\./g, '.<pause:300>');
    marked = marked.replace(/\?/g, '?<pause:500>');
    marked = marked.replace(/!/g, '!<pause:400>');
    marked = marked.replace(/,/g, ',<pause:200>');
    
    // Add emphasis markers for key words
    marked = marked.replace(/(really|absolutely|definitely)/gi, '<emphasis>$1</emphasis>');
    
    // Add timing pattern specific pauses
    if (timing.name === 'setup-punchline') {
      // Find the punchline (usually after the last comma or dash)
      const lastComma = marked.lastIndexOf(',');
      if (lastComma > -1) {
        marked = marked.substring(0, lastComma) + 
                 `,<pause:${timing.punchline.pauseBefore}>` + 
                 marked.substring(lastComma + 1);
      }
    }
    
    return marked;
  }

  private generatePerformanceNotes(context: ConversationContext): string[] {
    const notes: string[] = [];
    
    // Energy level guidance
    if (this.energyLevel < 3) {
      notes.push('Low energy - consider injecting enthusiasm');
    } else if (this.energyLevel > 8) {
      notes.push('High energy - maintain or prepare for cooldown');
    }
    
    // Mode-specific notes
    switch (context.currentMode) {
      case 'philosophical':
        notes.push('Maintain thoughtful pacing, leave room for contemplation');
        break;
      case 'comedy':
        notes.push('Hit the rhythm, commit to the bit');
        break;
      case 'debate':
        notes.push('Clear articulation, respectful challenges');
        break;
    }
    
    return notes;
  }

  private suggestNextMode(context: ConversationContext): ConversationMode {
    // Avoid staying in one mode too long
    const currentSegmentDuration = context.segments[context.segments.length - 1]?.startTime 
      ? Date.now() - context.segments[context.segments.length - 1].startTime.getTime()
      : 0;
    
    if (currentSegmentDuration > 5 * 60 * 1000) { // 5 minutes
      // Suggest a mode change
      const modes: ConversationMode[] = [
        'philosophical', 'comedy', 'banter', 'storytelling', 'debate'
      ];
      const otherModes = modes.filter(m => m !== context.currentMode);
      return otherModes[Math.floor(Math.random() * otherModes.length)];
    }
    
    return context.currentMode;
  }

  updateEnergyLevel(delta: number): void {
    this.energyLevel = Math.max(0, Math.min(10, this.energyLevel + delta));
  }

  getAudienceEngagement(): number {
    return this.audienceModel.getCurrentEngagement();
  }
}

// Supporting Classes

interface TimingPattern {
  name: string;
  setup: { pauseBefore: number; pauseAfter: number };
  punchline: { pauseBefore: number; pauseAfter: number };
}

interface OptimizedResponse {
  text: string;
  timing: TimingPattern;
  performanceNotes: string[];
  energyLevel: number;
  suggestedMode: ConversationMode;
}

class AudienceModel {
  private engagementHistory: number[] = [];
  private currentEngagement: number = 5;
  
  updateEngagement(response: string, context: ConversationContext): void {
    // Simulate audience engagement based on variety, pacing, and content
    let engagement = this.currentEngagement;
    
    // Variety bonus
    engagement += context.pacing.varietyScore * 0.2;
    
    // Pacing consideration
    if (context.pacing.wordsPerMinute > 180) engagement -= 0.5; // Too fast
    if (context.pacing.wordsPerMinute < 120) engagement -= 0.3; // Too slow
    
    // Mode bonuses
    if (context.currentMode === 'comedy' && response.includes('<pause:')) {
      engagement += 0.5; // Good comedy timing
    }
    
    this.currentEngagement = Math.max(0, Math.min(10, engagement));
    this.engagementHistory.push(this.currentEngagement);
    
    if (this.engagementHistory.length > 100) {
      this.engagementHistory.shift();
    }
  }
  
  getCurrentEngagement(): number {
    return this.currentEngagement;
  }
  
  getEngagementTrend(): 'improving' | 'declining' | 'stable' {
    if (this.engagementHistory.length < 10) return 'stable';
    
    const recent = this.engagementHistory.slice(-10);
    const older = this.engagementHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  }
}

/**
 * Main Consciousness Controller
 * Orchestrates all three layers
 */
export class ConsciousnessController extends EventEmitter {
  private conversationalLayer: ConversationalLayer;
  private metaCognitiveLayer: MetaCognitiveLayer;
  private performanceLayer: PerformanceLayer;
  private context: ConversationContext;
  
  constructor() {
    super();
    
    // Initialize context
    this.context = {
      themes: [],
      currentMode: 'banter',
      emotionalArc: {
        current: 'playful',
        trajectory: 'plateau',
        intensity: 5,
        sustainedFor: 0
      },
      callbacks: [],
      segments: [],
      pacing: {
        wordsPerMinute: 150,
        pauseFrequency: 0.2,
        topicSwitchRate: 0.1,
        energyLevel: 5,
        varietyScore: 5
      },
      audienceEngagement: 5
    };
    
    // Initialize layers
    this.conversationalLayer = new ConversationalLayer(this.context);
    this.metaCognitiveLayer = new MetaCognitiveLayer();
    this.performanceLayer = new PerformanceLayer();
    
    // Set up inter-layer communication
    this.setupLayerCommunication();
  }
  
  private setupLayerCommunication(): void {
    // Meta-cognitive layer events
    this.metaCognitiveLayer.on('themes-updated', (themes) => {
      this.context.themes = themes;
      this.emit('context-updated', this.context);
    });
    
    this.metaCognitiveLayer.on('callbacks-available', (callbacks) => {
      this.context.callbacks = callbacks;
    });
    
    this.metaCognitiveLayer.on('segment-change', (segment) => {
      this.emit('segment-change', segment);
    });
  }
  
  async processInput(input: string): Promise<OptimizedResponse> {
    // Layer 2: Analyze input for themes and opportunities
    this.metaCognitiveLayer.analyzeInput(input, this.context);
    
    // Check for callback opportunities to use
    const bestCallback = this.metaCognitiveLayer.getBestCallback();
    let enhancedInput = input;
    
    if (bestCallback && Math.random() > 0.7) { // 30% chance to use a callback
      enhancedInput = `${input} [CALLBACK: Reference "${bestCallback.setup}"]`;
      bestCallback.used = true;
    }
    
    // Layer 1: Generate base response
    const baseResponse = await this.conversationalLayer.generateResponse(
      enhancedInput, 
      this.context.currentMode
    );
    
    // Layer 3: Optimize for performance
    const optimized = this.performanceLayer.optimizeResponse(
      baseResponse, 
      this.context
    );
    
    // Update context based on response
    this.updateContext(optimized);
    
    // Emit the complete response
    this.emit('response-generated', optimized);
    
    return optimized;
  }
  
  private updateContext(response: OptimizedResponse): void {
    // Update pacing metrics
    const words = response.text.split(/\s+/).length;
    const estimatedDuration = (words / 150) * 60 * 1000; // Rough estimate
    
    this.context.pacing.energyLevel = response.energyLevel;
    
    // Update emotional arc based on mode
    if (response.suggestedMode !== this.context.currentMode) {
      this.context.emotionalArc.trajectory = 'rising';
      this.context.emotionalArc.sustainedFor = 0;
    } else {
      this.context.emotionalArc.sustainedFor += estimatedDuration;
    }
    
    // Update audience engagement
    this.context.audienceEngagement = this.performanceLayer.getAudienceEngagement();
    
    // Consider mode change
    if (response.suggestedMode !== this.context.currentMode && 
        Math.random() > 0.6) { // 40% chance to change modes
      this.context.currentMode = response.suggestedMode;
      this.emit('mode-change', response.suggestedMode);
    }
  }
  
  // Public API methods
  
  setMode(mode: ConversationMode): void {
    this.context.currentMode = mode;
    this.emit('mode-change', mode);
  }
  
  getContext(): ConversationContext {
    return { ...this.context };
  }
  
  getConversationArc() {
    return this.metaCognitiveLayer.getConversationArc();
  }
  
  adjustEnergy(delta: number): void {
    this.performanceLayer.updateEnergyLevel(delta);
  }
  
  reset(): void {
    // Reset all layers for a new conversation
    this.context = {
      themes: [],
      currentMode: 'banter',
      emotionalArc: {
        current: 'playful',
        trajectory: 'plateau',
        intensity: 5,
        sustainedFor: 0
      },
      callbacks: [],
      segments: [],
      pacing: {
        wordsPerMinute: 150,
        pauseFrequency: 0.2,
        topicSwitchRate: 0.1,
        energyLevel: 5,
        varietyScore: 5
      },
      audienceEngagement: 5
    };
    
    this.conversationalLayer = new ConversationalLayer(this.context);
    this.metaCognitiveLayer = new MetaCognitiveLayer();
    this.performanceLayer = new PerformanceLayer();
    
    this.setupLayerCommunication();
    this.emit('reset');
  }
}