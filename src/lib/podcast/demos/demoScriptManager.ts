/**
 * Demo Script Manager
 * Handles semantic retrieval, performance tracking, and intelligent selection of demo scripts
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  DemoScript, 
  DemoArchetype, 
  DemoSelectionCriteria,
  PerformanceMetrics,
  UserReaction,
  DemoCollection
} from './schema';
import type { ConversationContext, ConversationMode } from '../consciousness';

interface ScoredDemo {
  demo: DemoScript;
  score: number;
  relevance_breakdown: {
    semantic: number;
    contextual: number;
    performance: number;
    freshness: number;
    mode_match: number;
  };
}

/**
 * Main Demo Script Manager
 */
export class DemoScriptManager {
  private demos: Map<string, DemoScript> = new Map();
  private demosByArchetype: Map<DemoArchetype, DemoScript[]> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();
  private lastUsedTimestamps: Map<string, number> = new Map();
  private contextWindow: number = 8000; // Max tokens for context
  private initialized: boolean = false;

  constructor(private collection?: DemoCollection) {
    if (collection) {
      this.loadCollection(collection);
    }
  }

  /**
   * Initialize with demo scripts
   */
  async initialize(demoScripts: DemoScript[]): Promise<void> {
    console.log(`Initializing DemoScriptManager with ${demoScripts.length} scripts`);
    
    for (const script of demoScripts) {
      this.demos.set(script.id, script);
      
      // Organize by archetype
      if (!this.demosByArchetype.has(script.archetype)) {
        this.demosByArchetype.set(script.archetype, []);
      }
      this.demosByArchetype.get(script.archetype)!.push(script);
      
      // Generate embeddings if not present
      if (!script.embeddings) {
        await this.generateEmbeddings(script);
      } else {
        this.embeddings.set(script.id, script.embeddings.context);
      }
    }
    
    this.initialized = true;
    console.log('DemoScriptManager initialized');
  }

  /**
   * Load a demo collection
   */
  private loadCollection(collection: DemoCollection): void {
    this.collection = collection;
    for (const demo of collection.demos) {
      this.demos.set(demo.id, demo);
      
      if (!this.demosByArchetype.has(demo.archetype)) {
        this.demosByArchetype.set(demo.archetype, []);
      }
      this.demosByArchetype.get(demo.archetype)!.push(demo);
    }
  }

  /**
   * Generate embeddings for a demo script
   */
  private async generateEmbeddings(script: DemoScript): Promise<void> {
    try {
      // Skip API call for now since generate_embeddings function doesn't exist
      // Use fallback embedding generation instead
      console.log('Using fallback embedding for', script.metadata.title);
      const contextEmbedding = this.generateFallbackEmbedding(script);
      script.embeddings = {
        context: contextEmbedding,
        response: contextEmbedding // Use same embedding for now
      };
      this.embeddings.set(script.id, contextEmbedding);
      return;
      
      // Generate embeddings using Edge Function
      const { data, error } = await supabase.functions.invoke('generate_embeddings', {
        body: {
          texts: [
            script.exchange.human,
            script.exchange.william,
            (script.metadata.tags || []).join(' ')
          ]
        }
      });
      */

      if (!error && data?.embeddings) {
        // Average the embeddings for a single context vector
        const contextEmbedding = this.averageEmbeddings(data.embeddings);
        script.embeddings = {
          context: contextEmbedding,
          response: data.embeddings[1]
        };
        this.embeddings.set(script.id, contextEmbedding);
      }
    } catch (err) {
      console.error('Failed to generate embeddings for demo:', script.id, err);
      // Fallback to simple vector based on keywords
      const fallbackEmbedding = this.generateFallbackEmbedding(script);
      script.embeddings = {
        context: fallbackEmbedding,
        response: fallbackEmbedding
      };
      this.embeddings.set(script.id, fallbackEmbedding);
    }
  }

  /**
   * Get relevant demo examples based on current context
   */
  async getRelevantExamples(
    currentContext: string,
    criteria: DemoSelectionCriteria,
    maxExamples: number = 3
  ): Promise<DemoScript[]> {
    if (!this.initialized || this.demos.size === 0) {
      console.warn('DemoScriptManager not initialized or no demos available');
      return [];
    }

    // Generate embedding for current context
    const contextEmbedding = await this.getContextEmbedding(currentContext);
    
    // Score all demos
    const scoredDemos: ScoredDemo[] = [];
    
    for (const [id, demo] of this.demos) {
      const score = await this.scoreDemo(demo, contextEmbedding, criteria);
      scoredDemos.push(score);
    }
    
    // Sort by score and filter
    scoredDemos.sort((a, b) => b.score - a.score);
    
    // Apply diversity - don't return multiple of same archetype
    const selected: DemoScript[] = [];
    const usedArchetypes = new Set<DemoArchetype>();
    
    for (const scored of scoredDemos) {
      if (selected.length >= maxExamples) break;
      
      // Skip if we already have this archetype (unless it's significantly better)
      if (usedArchetypes.has(scored.demo.archetype) && scored.score < 0.9) {
        continue;
      }
      
      // Skip if recently used (within last 5 minutes)
      const lastUsed = this.lastUsedTimestamps.get(scored.demo.id) || 0;
      if (Date.now() - lastUsed < 5 * 60 * 1000 && scored.score < 0.8) {
        continue;
      }
      
      selected.push(scored.demo);
      usedArchetypes.add(scored.demo.archetype);
      
      // Mark as used
      this.lastUsedTimestamps.set(scored.demo.id, Date.now());
      scored.demo.metadata.last_used = new Date();
      scored.demo.metadata.usage_count++;
    }
    
    return selected;
  }

  /**
   * Score a demo based on multiple factors
   */
  private async scoreDemo(
    demo: DemoScript,
    contextEmbedding: number[],
    criteria: DemoSelectionCriteria
  ): Promise<ScoredDemo> {
    const breakdown = {
      semantic: 0,
      contextual: 0,
      performance: 0,
      freshness: 0,
      mode_match: 0
    };
    
    // 1. Semantic similarity (40% weight)
    const demoEmbedding = this.embeddings.get(demo.id);
    if (demoEmbedding && contextEmbedding) {
      breakdown.semantic = this.cosineSimilarity(contextEmbedding, demoEmbedding);
    }
    
    // 2. Contextual relevance (25% weight)
    breakdown.contextual = this.calculateContextualRelevance(demo, criteria);
    
    // 3. Historical performance (20% weight)
    breakdown.performance = this.getHistoricalPerformance(demo.id);
    
    // 4. Freshness factor (10% weight)
    breakdown.freshness = this.calculateFreshness(demo.id);
    
    // 5. Mode matching (5% weight)
    breakdown.mode_match = demo.metadata.mode === criteria.current_mode ? 1.0 : 0.5;
    
    // Calculate weighted score
    const score = 
      breakdown.semantic * 0.4 +
      breakdown.contextual * 0.25 +
      breakdown.performance * 0.2 +
      breakdown.freshness * 0.1 +
      breakdown.mode_match * 0.05;
    
    return {
      demo,
      score,
      relevance_breakdown: breakdown
    };
  }

  /**
   * Calculate contextual relevance based on triggers and optimal context
   */
  private calculateContextualRelevance(
    demo: DemoScript,
    criteria: DemoSelectionCriteria
  ): number {
    let relevance = 0;
    let factors = 0;
    
    // Check trigger words
    const recentTopicsLower = criteria.recent_topics.map(t => t.toLowerCase());
    const triggerMatches = demo.metadata.triggers.filter(trigger => 
      recentTopicsLower.some(topic => topic.includes(trigger.toLowerCase()))
    ).length;
    relevance += Math.min(1, triggerMatches / demo.metadata.triggers.length);
    factors++;
    
    // Check energy level match
    const energyDiff = Math.abs(demo.metadata.energy_level - criteria.energy_level);
    relevance += 1 - (energyDiff / 10);
    factors++;
    
    // Check if callbacks are available and demo uses them
    if (criteria.available_callbacks.length > 0 && 
        demo.techniques.some(t => t.category === 'callback')) {
      relevance += 0.5;
    }
    factors++;
    
    // Check audience engagement alignment
    if (criteria.audience_engagement < 4 && demo.metadata.energy_level > 7) {
      relevance += 0.8; // High energy demo for low engagement
    } else if (criteria.audience_engagement > 7 && demo.metadata.energy_level >= 5) {
      relevance += 0.8; // Maintain energy when engagement is high
    }
    factors++;
    
    return relevance / factors;
  }

  /**
   * Get historical performance score for a demo
   */
  private getHistoricalPerformance(demoId: string): number {
    const history = this.performanceHistory.get(demoId);
    if (!history || history.length === 0) {
      return 0.5; // Neutral score for untested demos
    }
    
    // Weight recent performances more heavily
    let weightedSum = 0;
    let totalWeight = 0;
    
    const recent = history.slice(-10); // Last 10 uses
    recent.forEach((perf, index) => {
      const weight = (index + 1) / recent.length; // More recent = higher weight
      weightedSum += perf.overall_effectiveness * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Calculate freshness factor (avoid overuse)
   */
  private calculateFreshness(demoId: string): number {
    const lastUsed = this.lastUsedTimestamps.get(demoId);
    if (!lastUsed) return 1.0; // Never used = fully fresh
    
    const hoursSinceUse = (Date.now() - lastUsed) / (1000 * 60 * 60);
    
    // Freshness curve: 0 at just used, 1.0 at 24+ hours
    return Math.min(1, hoursSinceUse / 24);
  }

  /**
   * Format selected demos for context injection
   */
  formatForContext(demos: DemoScript[], style: 'examples' | 'instructions' = 'examples'): string {
    if (demos.length === 0) return '';
    
    if (style === 'examples') {
      return this.formatAsExamples(demos);
    } else {
      return this.formatAsInstructions(demos);
    }
  }

  private formatAsExamples(demos: DemoScript[]): string {
    let formatted = "Here are examples of excellent responses in similar situations:\n\n";
    
    for (const demo of demos) {
      formatted += "---\n";
      if (demo.exchange.setup) {
        formatted += `Context: ${demo.exchange.setup}\n`;
      }
      formatted += `Human: ${demo.exchange.human}\n`;
      formatted += `William: ${demo.exchange.william}\n`;
      
      // Add technique annotations
      if (demo.techniques.length > 0) {
        const techniqueNames = demo.techniques.map(t => t.name).join(', ');
        formatted += `[Techniques demonstrated: ${techniqueNames}]\n`;
      }
      
      // Add quality markers
      if (demo.behavioral_anchors.length > 0) {
        const markers = demo.behavioral_anchors[0].quality_markers.slice(0, 3).join(', ');
        formatted += `[Quality markers: ${markers}]\n`;
      }
      
      formatted += "\n";
    }
    
    return formatted;
  }

  private formatAsInstructions(demos: DemoScript[]): string {
    let formatted = "For this response, employ these proven techniques:\n\n";
    
    // Aggregate techniques across demos
    const allTechniques = new Map<string, string>();
    const allQualityMarkers = new Set<string>();
    
    for (const demo of demos) {
      for (const tech of demo.techniques) {
        if (!allTechniques.has(tech.name)) {
          allTechniques.set(tech.name, tech.description);
        }
      }
      
      for (const anchor of demo.behavioral_anchors) {
        anchor.quality_markers.forEach(marker => allQualityMarkers.add(marker));
      }
    }
    
    // Format techniques
    formatted += "Techniques to use:\n";
    for (const [name, desc] of allTechniques) {
      formatted += `• ${name}: ${desc}\n`;
    }
    
    // Format quality markers
    formatted += "\nQuality markers to hit:\n";
    for (const marker of allQualityMarkers) {
      formatted += `• ${marker}\n`;
    }
    
    // Add specific examples if space allows
    if (demos.length === 1) {
      formatted += `\nExample phrasing: "${demos[0].exchange.william.substring(0, 100)}..."\n`;
    }
    
    return formatted;
  }

  /**
   * Track performance of used demos
   */
  async trackDemoPerformance(
    demoId: string,
    userResponse: string,
    engagement: number
  ): Promise<void> {
    const demo = this.demos.get(demoId);
    if (!demo) return;
    
    // Analyze user response for reaction type
    const reaction = this.analyzeUserReaction(userResponse);
    
    // Update performance metrics
    const currentMetrics = demo.performance_metrics;
    
    // Add user reaction
    currentMetrics.user_reactions.push({
      timestamp: new Date(),
      reaction_type: reaction.type,
      strength: reaction.strength,
      context_similarity: 0.7 // Would calculate based on actual similarity
    });
    
    // Update scores (rolling average)
    const updateFactor = 0.1; // How much new data affects the score
    currentMetrics.engagement_score = 
      currentMetrics.engagement_score * (1 - updateFactor) + engagement * updateFactor;
    
    if (reaction.type === 'laugh') {
      currentMetrics.comedy_timing_score = 
        Math.min(10, currentMetrics.comedy_timing_score + 0.5);
    }
    
    if (reaction.type === 'thoughtful') {
      currentMetrics.philosophical_depth = 
        Math.min(10, currentMetrics.philosophical_depth + 0.3);
    }
    
    // Calculate overall effectiveness
    currentMetrics.overall_effectiveness = this.calculateOverallEffectiveness(currentMetrics);
    
    // Store in history
    if (!this.performanceHistory.has(demoId)) {
      this.performanceHistory.set(demoId, []);
    }
    this.performanceHistory.get(demoId)!.push({ ...currentMetrics });
    
    // Persist to database
    await this.persistPerformanceData(demoId, currentMetrics);
  }

  private analyzeUserReaction(response: string): { type: UserReaction['reaction_type']; strength: number } {
    const lower = response.toLowerCase();
    
    if (/haha|lol|funny|hilarious|😂|🤣/.test(lower)) {
      return { type: 'laugh', strength: 0.8 };
    }
    if (/interesting|fascinating|hmm|think|wonder/.test(lower)) {
      return { type: 'thoughtful', strength: 0.7 };
    }
    if (/love|amazing|brilliant|yes|exactly/.test(lower)) {
      return { type: 'delighted', strength: 0.9 };
    }
    if (/what|huh|confused|don't understand/.test(lower)) {
      return { type: 'confused', strength: 0.5 };
    }
    
    return { type: 'engaged', strength: 0.6 };
  }

  private calculateOverallEffectiveness(metrics: PerformanceMetrics): number {
    const weights = {
      engagement: 0.3,
      comedy: 0.2,
      philosophy: 0.2,
      emotional: 0.2,
      callback: 0.1
    };
    
    return Math.min(10,
      metrics.engagement_score * weights.engagement +
      metrics.comedy_timing_score * weights.comedy +
      metrics.philosophical_depth * weights.philosophy +
      metrics.emotional_resonance * weights.emotional +
      metrics.callback_quality * weights.callback
    );
  }

  /**
   * Persist performance data to database
   */
  private async persistPerformanceData(
    demoId: string,
    metrics: PerformanceMetrics
  ): Promise<void> {
    try {
      await supabase
        .from('demo_performance')
        .upsert({
          demo_id: demoId,
          metrics: metrics,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to persist demo performance:', error);
    }
  }

  /**
   * Utility functions
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const avgEmbedding = new Array(embeddings[0].length).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        avgEmbedding[i] += embedding[i] / embeddings.length;
      }
    }
    
    return avgEmbedding;
  }

  private async getContextEmbedding(context: string): Promise<number[]> {
    try {
      // Use fallback embedding generation for now
      return this.generateFallbackEmbedding({ 
        exchange: { human: context, william: '' },
        metadata: { tags: [], triggers: [] }
      } as DemoScript);
      
      // Generate embeddings using Edge Function
      const { data } = await supabase.functions.invoke('generate_embeddings', {
        body: { texts: [context] }
      });
      
      return data?.embeddings?.[0] || this.generateFallbackEmbedding({ metadata: { tags: context.split(' ') } } as any);
      */
    } catch {
      return this.generateFallbackEmbedding({ 
        exchange: { human: context, william: '' },
        metadata: { tags: context.split(' '), triggers: [] }
      } as DemoScript);
    }
  }

  private generateFallbackEmbedding(script: DemoScript): number[] {
    // Simple keyword-based embedding fallback
    const vector = new Array(384).fill(0);
    const tags = script.metadata.tags || [];
    const triggers = script.metadata.triggers || [];
    const text = (tags.join(' ') + ' ' + triggers.join(' ')).toLowerCase();
    
    // Hash words into vector positions
    const words = text.split(/\s+/);
    words.forEach((word, i) => {
      const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const position = hash % vector.length;
      vector[position] = 1;
    });
    
    return vector;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalUses: number;
    averageEffectiveness: number;
    topPerformers: string[];
    improvementRate: number;
  } {
    let totalUses = 0;
    let totalEffectiveness = 0;
    const demoScores: { id: string; score: number }[] = [];
    
    for (const [id, demo] of this.demos) {
      totalUses += demo.metadata.usage_count;
      const effectiveness = demo.performance_metrics.overall_effectiveness;
      totalEffectiveness += effectiveness * demo.metadata.usage_count;
      demoScores.push({ id, score: effectiveness });
    }
    
    demoScores.sort((a, b) => b.score - a.score);
    
    return {
      totalUses,
      averageEffectiveness: totalUses > 0 ? totalEffectiveness / totalUses : 0,
      topPerformers: demoScores.slice(0, 5).map(d => d.id),
      improvementRate: this.calculateImprovementRate()
    };
  }

  private calculateImprovementRate(): number {
    // Calculate how much effectiveness improves over time
    let totalImprovement = 0;
    let count = 0;
    
    for (const [id, history] of this.performanceHistory) {
      if (history.length > 1) {
        const early = history.slice(0, 3).reduce((sum, h) => sum + h.overall_effectiveness, 0) / 3;
        const recent = history.slice(-3).reduce((sum, h) => sum + h.overall_effectiveness, 0) / 3;
        totalImprovement += (recent - early) / early;
        count++;
      }
    }
    
    return count > 0 ? totalImprovement / count : 0;
  }
}