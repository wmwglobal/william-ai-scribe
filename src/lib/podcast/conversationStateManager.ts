/**
 * Conversation State Manager
 * Manages the full conversation state, persistence, and show memory
 */

import { supabase } from '@/integrations/supabase/client';
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
import type { 
  ConversationContext, 
  Theme, 
  CallbackOpportunity, 
  ConversationSegment,
  ConversationMode,
  EmotionalState 
} from './consciousness';

export interface ShowMemory {
  id: string;
  sessionId: string;
  episodeNumber: number;
  date: Date;
  themes: Theme[];
  bestMoments: Moment[];
  callbacks: CallbackOpportunity[];
  audienceStats: AudienceStats;
  duration: number;
  overallRating: number;
}

export interface Moment {
  id: string;
  timestamp: Date;
  type: 'comedy' | 'philosophical' | 'callback' | 'breakthrough';
  content: string;
  context: string;
  audienceReaction: number;
  tags: string[];
}

export interface AudienceStats {
  averageEngagement: number;
  peakEngagement: number;
  laughCount: number;
  thoughtfulPauses: number;
  topicInterest: Record<string, number>;
}

export interface ConversationThread {
  id: string;
  topic: string;
  startedAt: Date;
  messages: ThreadMessage[];
  status: 'active' | 'paused' | 'completed';
  depth: number;
  branches: ConversationThread[];
}

export interface ThreadMessage {
  speaker: 'user' | 'william';
  content: string;
  timestamp: Date;
  mode: ConversationMode;
  emotionalTone: EmotionalState;
  callbacks?: string[];
}

/**
 * Main Conversation State Manager
 */
export class ConversationStateManager extends EventEmitter {
  private currentContext: ConversationContext;
  private threads: Map<string, ConversationThread> = new Map();
  private activeThread?: ConversationThread;
  private showMemory: ShowMemory[] = [];
  private sessionId: string;
  private episodeNumber: number = 1;
  private moments: Moment[] = [];
  private modeHistory: Array<{ mode: ConversationMode; timestamp: Date }> = [];
  private autoSaveInterval?: NodeJS.Timer;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.initializeContext();
    this.loadShowMemory();
    this.startAutoSave();
  }

  private initializeContext(): void {
    this.currentContext = {
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
  }

  /**
   * Thread Management
   */
  startNewThread(topic: string): ConversationThread {
    const thread: ConversationThread = {
      id: `thread_${Date.now()}`,
      topic,
      startedAt: new Date(),
      messages: [],
      status: 'active',
      depth: 0,
      branches: []
    };

    this.threads.set(thread.id, thread);
    this.activeThread = thread;
    
    this.emit('thread-started', thread);
    return thread;
  }

  addToThread(
    speaker: 'user' | 'william',
    content: string,
    metadata?: {
      mode?: ConversationMode;
      emotionalTone?: EmotionalState;
      callbacks?: string[];
    }
  ): void {
    if (!this.activeThread) {
      this.startNewThread('General Conversation');
    }

    const message: ThreadMessage = {
      speaker,
      content,
      timestamp: new Date(),
      mode: metadata?.mode || this.currentContext.currentMode,
      emotionalTone: metadata?.emotionalTone || this.currentContext.emotionalArc.current,
      callbacks: metadata?.callbacks
    };

    this.activeThread!.messages.push(message);
    this.activeThread!.depth = this.calculateThreadDepth(this.activeThread!);

    // Check if we should branch or pause
    if (this.shouldBranchThread(content)) {
      this.branchThread(content);
    }

    this.emit('thread-updated', this.activeThread);
  }

  private calculateThreadDepth(thread: ConversationThread): number {
    const messages = thread.messages;
    if (messages.length < 2) return 0;

    let depth = 0;
    
    // Check for philosophical depth
    const philosophicalCount = messages.filter(m => 
      m.mode === 'philosophical' || 
      /why|how|meaning|purpose|consciousness/i.test(m.content)
    ).length;
    depth += Math.min(5, philosophicalCount);

    // Check for comedy callbacks
    const callbackCount = messages.filter(m => m.callbacks && m.callbacks.length > 0).length;
    depth += Math.min(3, callbackCount);

    // Check for sustained engagement
    if (messages.length > 10) depth += 2;

    return Math.min(10, depth);
  }

  private shouldBranchThread(content: string): boolean {
    if (!this.activeThread) return false;
    
    // Check for topic change indicators
    const topicChangeIndicators = [
      /but what about/i,
      /speaking of/i,
      /that reminds me/i,
      /on a different note/i,
      /changing topics/i
    ];

    return topicChangeIndicators.some(pattern => pattern.test(content));
  }

  private branchThread(newTopic: string): void {
    if (!this.activeThread) return;

    // Pause current thread
    this.activeThread.status = 'paused';
    
    // Create new branch
    const branch = this.startNewThread(newTopic);
    this.activeThread.branches.push(branch);
    
    this.emit('thread-branched', { from: this.activeThread, to: branch });
  }

  /**
   * Callback Management
   */
  registerCallback(setup: string, context: string, quality?: number): CallbackOpportunity {
    const callback: CallbackOpportunity = {
      id: `cb_${Date.now()}`,
      setup,
      context,
      timestamp: new Date(),
      used: false,
      quality: quality || this.evaluateCallbackQuality(setup, context),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };

    this.currentContext.callbacks.push(callback);
    this.emit('callback-registered', callback);
    
    return callback;
  }

  private evaluateCallbackQuality(setup: string, context: string): number {
    let quality = 5;

    // Specificity bonus
    if (setup.length > 30) quality += 2;
    
    // Uniqueness bonus
    const isUnique = !this.currentContext.callbacks.some(c => 
      c.setup.toLowerCase().includes(setup.toLowerCase())
    );
    if (isUnique) quality += 2;

    // Humor potential
    if (/funny|weird|crazy|ridiculous/i.test(setup)) quality += 1;

    return Math.min(10, quality);
  }

  useCallback(callbackId: string): CallbackOpportunity | null {
    const callback = this.currentContext.callbacks.find(c => c.id === callbackId);
    if (callback && !callback.used) {
      callback.used = true;
      this.emit('callback-used', callback);
      
      // Track as a moment
      this.registerMoment('callback', `Callback: ${callback.setup}`, callback.context);
      
      return callback;
    }
    return null;
  }

  getAvailableCallbacks(minQuality: number = 5): CallbackOpportunity[] {
    const now = new Date();
    return this.currentContext.callbacks
      .filter(c => 
        !c.used && 
        c.quality >= minQuality &&
        (!c.expiresAt || c.expiresAt > now)
      )
      .sort((a, b) => b.quality - a.quality);
  }

  /**
   * Mode and Pacing Management
   */
  switchMode(newMode: ConversationMode): void {
    const oldMode = this.currentContext.currentMode;
    this.currentContext.currentMode = newMode;
    
    this.modeHistory.push({
      mode: newMode,
      timestamp: new Date()
    });

    // Keep only last 100 mode changes
    if (this.modeHistory.length > 100) {
      this.modeHistory = this.modeHistory.slice(-100);
    }

    this.emit('mode-changed', { from: oldMode, to: newMode });
  }

  getModeDistribution(windowMinutes: number = 10): Record<ConversationMode, number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentModes = this.modeHistory.filter(m => m.timestamp > windowStart);
    
    const distribution: Record<ConversationMode, number> = {} as any;
    const modes: ConversationMode[] = [
      'philosophical', 'comedy', 'banter', 'storytelling', 
      'debate', 'riffing', 'segment-transition', 'audience-interaction'
    ];
    
    modes.forEach(mode => {
      distribution[mode] = 0;
    });

    recentModes.forEach(m => {
      distribution[m.mode]++;
    });

    // Convert to percentages
    const total = recentModes.length || 1;
    modes.forEach(mode => {
      distribution[mode] = (distribution[mode] / total) * 100;
    });

    return distribution;
  }

  updatePacing(metrics: Partial<typeof this.currentContext.pacing>): void {
    this.currentContext.pacing = {
      ...this.currentContext.pacing,
      ...metrics
    };
    
    this.emit('pacing-updated', this.currentContext.pacing);
  }

  /**
   * Moment Tracking
   */
  registerMoment(
    type: Moment['type'],
    content: string,
    context: string,
    audienceReaction?: number
  ): Moment {
    const moment: Moment = {
      id: `moment_${Date.now()}`,
      timestamp: new Date(),
      type,
      content,
      context,
      audienceReaction: audienceReaction || this.currentContext.audienceEngagement,
      tags: this.extractTags(content)
    };

    this.moments.push(moment);
    this.emit('moment-registered', moment);

    // Keep only best moments (top 100)
    if (this.moments.length > 100) {
      this.moments.sort((a, b) => b.audienceReaction - a.audienceReaction);
      this.moments = this.moments.slice(0, 100);
    }

    return moment;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];
    
    // Extract hashtag-like tags
    const hashtagMatches = content.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(t => t.substring(1)));
    }

    // Auto-tag based on content
    if (/laugh|funny|hilarious/i.test(content)) tags.push('comedy');
    if (/think|wonder|meaning/i.test(content)) tags.push('philosophical');
    if (/callback|earlier|remember/i.test(content)) tags.push('callback');

    return [...new Set(tags)]; // Remove duplicates
  }

  getBestMoments(count: number = 10): Moment[] {
    return [...this.moments]
      .sort((a, b) => b.audienceReaction - a.audienceReaction)
      .slice(0, count);
  }

  /**
   * Show Memory Persistence
   */
  async saveShowMemory(): Promise<void> {
    const memory: ShowMemory = {
      id: `show_${Date.now()}`,
      sessionId: this.sessionId,
      episodeNumber: this.episodeNumber,
      date: new Date(),
      themes: this.currentContext.themes,
      bestMoments: this.getBestMoments(),
      callbacks: this.currentContext.callbacks.filter(c => c.used),
      audienceStats: this.calculateAudienceStats(),
      duration: this.calculateSessionDuration(),
      overallRating: this.calculateOverallRating()
    };

    try {
      // Skip database save until show_memories table is created
      console.log('Show memory saved locally:', memory);
      return memory;
      
      // Save to database
      const { error } = await supabase
        .from('show_memories')
        .insert({
          session_id: this.sessionId,
          episode_number: this.episodeNumber,
          memory_data: memory,
          created_at: new Date().toISOString()
        });
      */

      if (!error) {
        this.showMemory.push(memory);
        this.emit('show-memory-saved', memory);
      } else {
        console.error('Failed to save show memory:', error);
      }
    } catch (err) {
      console.error('Error saving show memory:', err);
    }
  }

  async loadShowMemory(): Promise<void> {
    try {
      // Skip database load until show_memories table is created
      console.log('Loading show memories from memory (no database)');
      this.showMemory = [];
      this.episodeNumber = 1;
      this.emit('show-memory-loaded', this.showMemory);
      return;
      
      // Load from database  
      const { data, error } = await supabase
        .from('show_memories')
        .select('*')
        .order('episode_number', { ascending: false })
        .limit(10);

      if (!error && data) {
        this.showMemory = data.map(d => d.memory_data);
        this.episodeNumber = (data[0]?.episode_number || 0) + 1;
        this.emit('show-memory-loaded', this.showMemory);
      }
      */
    } catch (err) {
      console.error('Error loading show memory:', err);
    }
  }

  private calculateAudienceStats(): AudienceStats {
    const engagementValues = this.moments.map(m => m.audienceReaction);
    const average = engagementValues.reduce((a, b) => a + b, 0) / (engagementValues.length || 1);
    const peak = Math.max(...engagementValues, 0);

    const topicInterest: Record<string, number> = {};
    this.currentContext.themes.forEach(theme => {
      topicInterest[theme.topic] = theme.depth;
    });

    return {
      averageEngagement: average,
      peakEngagement: peak,
      laughCount: this.moments.filter(m => m.type === 'comedy').length,
      thoughtfulPauses: this.moments.filter(m => m.type === 'philosophical').length,
      topicInterest
    };
  }

  private calculateSessionDuration(): number {
    if (this.threads.size === 0) return 0;
    
    const firstThread = Array.from(this.threads.values())[0];
    const startTime = firstThread.startedAt.getTime();
    return Date.now() - startTime;
  }

  private calculateOverallRating(): number {
    const stats = this.calculateAudienceStats();
    let rating = 5;

    // Engagement bonus
    rating += (stats.averageEngagement - 5) * 0.5;
    
    // Variety bonus
    const modeDistribution = this.getModeDistribution();
    const modeVariety = Object.values(modeDistribution).filter(v => v > 10).length;
    rating += modeVariety * 0.3;

    // Callback bonus
    const callbacksUsed = this.currentContext.callbacks.filter(c => c.used).length;
    rating += Math.min(2, callbacksUsed * 0.5);

    return Math.max(0, Math.min(10, rating));
  }

  private startAutoSave(): void {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      this.saveShowMemory();
    }, 5 * 60 * 1000);
  }

  /**
   * Context Getters
   */
  getContext(): ConversationContext {
    return { ...this.currentContext };
  }

  getThreads(): ConversationThread[] {
    return Array.from(this.threads.values());
  }

  getActiveThread(): ConversationThread | undefined {
    return this.activeThread;
  }

  getMoments(): Moment[] {
    return [...this.moments];
  }

  getShowMemory(): ShowMemory[] {
    return [...this.showMemory];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.saveShowMemory();
    this.removeAllListeners();
  }
}