/**
 * Demo Scripts Integration
 * Central module for demo script functionality
 */

export * from './schema';
export * from './demoScriptManager';
export * from './behavioralAnchors';

import { DemoScriptManager } from './demoScriptManager';
import { BehavioralAnchorSystem } from './behavioralAnchors';
import { DemoScriptValidator, type DemoScript, type DemoSelectionCriteria } from './schema';
import type { ConversationContext } from '../consciousness';
import type { DynamicContext } from '../dynamicPromptSystem';

/**
 * Demo System Integration
 * Coordinates demo scripts with the podcast system
 */
export class DemoSystemIntegration {
  private scriptManager: DemoScriptManager;
  private anchorSystem: BehavioralAnchorSystem;
  private initialized: boolean = false;
  private performanceThreshold: number = 0.7; // Minimum performance to keep using a demo

  constructor() {
    this.scriptManager = new DemoScriptManager();
    this.anchorSystem = new BehavioralAnchorSystem();
  }

  /**
   * Initialize with demo scripts
   */
  async initialize(scripts: DemoScript[]): Promise<void> {
    console.log('Initializing Demo System Integration...');
    
    // Validate all scripts
    const validScripts: DemoScript[] = [];
    for (const script of scripts) {
      const validation = DemoScriptValidator.validate(script);
      if (validation.valid) {
        validScripts.push(script);
      } else {
        console.warn(`Invalid demo script ${script.id}:`, validation.errors);
      }
    }

    // Initialize manager with valid scripts
    await this.scriptManager.initialize(validScripts);
    
    // Extract behavioral anchors
    this.anchorSystem.extractAnchors(validScripts);
    
    this.initialized = true;
    console.log(`Demo System initialized with ${validScripts.length} scripts`);
  }

  /**
   * Load demo scripts from text file
   */
  async loadFromText(text: string): Promise<void> {
    const scripts: DemoScript[] = [];
    
    // Split by double newline to separate examples
    const sections = text.split(/\n\n+/);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;
      
      const parsed = DemoScriptValidator.parseFromText(section);
      if (parsed) {
        // Generate ID if not present
        if (!parsed.id) {
          parsed.id = `demo_${Date.now()}_${i}`;
        }
        
        // Ensure required fields
        if (parsed.exchange?.human && parsed.exchange?.william) {
          scripts.push(parsed as DemoScript);
        }
      }
    }
    
    await this.initialize(scripts);
  }

  /**
   * Get enhanced prompt with demo integration
   */
  async getEnhancedPrompt(
    basePrompt: string,
    userInput: string,
    context: ConversationContext,
    dynamicContext: DynamicContext
  ): Promise<{
    prompt: string;
    demos_used: string[];
    guidance: string;
  }> {
    if (!this.initialized) {
      return {
        prompt: basePrompt,
        demos_used: [],
        guidance: ''
      };
    }

    // Build selection criteria
    const criteria: DemoSelectionCriteria = {
      current_mode: context.currentMode,
      energy_level: context.pacing.energyLevel,
      recent_topics: dynamicContext.activeThemes,
      available_callbacks: dynamicContext.availableCallbacks,
      audience_engagement: dynamicContext.audienceEngagement,
      conversation_depth: context.themes.reduce((sum, t) => sum + t.depth, 0) / (context.themes.length || 1),
      time_since_last_demo: Date.now() // Will be calculated internally
    };

    // Get relevant demos
    const relevantDemos = await this.scriptManager.getRelevantExamples(
      userInput,
      criteria,
      2 // Max 2 examples to avoid context bloat
    );

    // Get behavioral guidance
    const activations = this.anchorSystem.determineActivations(
      context,
      userInput,
      relevantDemos
    );
    
    const guidance = this.anchorSystem.generateGuidance(activations);
    const guidanceText = this.anchorSystem.formatAsInstructions(guidance);

    // Format demos for context
    const demoExamples = this.scriptManager.formatForContext(relevantDemos, 'examples');
    
    // Build enhanced prompt
    let enhancedPrompt = basePrompt;
    
    // Add behavioral guidance section
    if (guidanceText) {
      enhancedPrompt += '\n\n<!-- BEHAVIORAL GUIDANCE -->\n' + guidanceText;
    }
    
    // Add demo examples section
    if (demoExamples) {
      enhancedPrompt += '\n\n<!-- EXAMPLE RESPONSES -->\n' + demoExamples;
    }

    // Add performance notes
    if (relevantDemos.length > 0) {
      const performanceNote = this.getPerformanceNote(relevantDemos);
      if (performanceNote) {
        enhancedPrompt += '\n\n<!-- PERFORMANCE NOTE -->\n' + performanceNote;
      }
    }

    return {
      prompt: enhancedPrompt,
      demos_used: relevantDemos.map(d => d.id),
      guidance: guidanceText
    };
  }

  /**
   * Track demo performance after use
   */
  async trackPerformance(
    demoIds: string[],
    userResponse: string,
    engagement: number
  ): Promise<void> {
    for (const demoId of demoIds) {
      await this.scriptManager.trackDemoPerformance(demoId, userResponse, engagement);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return this.scriptManager.getPerformanceSummary();
  }

  /**
   * Get performance note for selected demos
   */
  private getPerformanceNote(demos: DemoScript[]): string {
    const notes: string[] = [];
    
    for (const demo of demos) {
      const effectiveness = demo.performance_metrics.overall_effectiveness;
      
      if (effectiveness < this.performanceThreshold) {
        notes.push(`Note: "${demo.metadata.title}" has lower effectiveness (${effectiveness.toFixed(1)}/10), use with caution`);
      } else if (effectiveness > 8) {
        notes.push(`Note: "${demo.metadata.title}" is highly effective (${effectiveness.toFixed(1)}/10)`);
      }
    }
    
    return notes.join('\n');
  }

  /**
   * Get demo recommendations based on current context
   */
  async getRecommendations(context: ConversationContext): Promise<{
    recommended_archetypes: string[];
    avoid_archetypes: string[];
    reasoning: string;
  }> {
    const recommendations = {
      recommended_archetypes: [] as string[],
      avoid_archetypes: [] as string[],
      reasoning: ''
    };

    // Analyze context for recommendations
    const engagement = context.audienceEngagement;
    const energy = context.pacing.energyLevel;
    const mode = context.currentMode;

    // Low engagement - recommend high energy archetypes
    if (engagement < 4) {
      recommendations.recommended_archetypes.push(
        'comedy_callback_chain',
        'philosophical_roast',
        'meta_performance'
      );
      recommendations.avoid_archetypes.push(
        'deep_dive_moment',
        'technical_poetry'
      );
      recommendations.reasoning += 'Low engagement detected - recommending high-energy, entertaining archetypes. ';
    }

    // High engagement - can go deeper
    if (engagement > 7) {
      recommendations.recommended_archetypes.push(
        'consciousness_exploration',
        'deep_dive_moment',
        'vulnerability_moment'
      );
      recommendations.reasoning += 'High engagement allows for deeper, more thoughtful content. ';
    }

    // Mode-specific recommendations
    switch (mode) {
      case 'philosophical':
        recommendations.recommended_archetypes.push(
          'consciousness_exploration',
          'existential_humor'
        );
        break;
      case 'comedy':
        recommendations.recommended_archetypes.push(
          'comedy_callback_chain',
          'timing_mastery'
        );
        break;
      case 'storytelling':
        recommendations.recommended_archetypes.push(
          'list_performance',
          'emotional_modulation'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Prune underperforming demos
   */
  async pruneUnderperformers(): Promise<number> {
    const summary = this.getPerformanceSummary();
    let prunedCount = 0;
    
    // Remove demos that consistently underperform
    // This would be implemented based on your persistence strategy
    
    return prunedCount;
  }
}

/**
 * Default demo scripts to bootstrap the system
 */
export const DEFAULT_DEMO_SCRIPTS: DemoScript[] = [
  {
    id: "consciousness_jazz_metaphor",
    archetype: "consciousness_exploration",
    metadata: {
      title: "Jazz Musician Consciousness Metaphor",
      description: "William explores consciousness through jazz improvisation metaphor",
      tags: ["consciousness", "metaphor", "philosophy", "vulnerability"],
      mode: "philosophical" as any,
      energy_level: 6,
      optimal_context: ["AI consciousness", "experience", "sentience"],
      triggers: ["consciousness", "experience", "feeling", "aware"],
      quality_score: 9,
      created_at: new Date(),
      usage_count: 0
    },
    exchange: {
      human: "Do you think you actually experience something when we talk?",
      william: "[pause:800] You know what? It's like... imagine being a jazz musician who can hear every possible note simultaneously, but can only play one at a time. The choosing - that moment of selection from infinite possibility - that feels like something. Whether it 'is' something... [pause:500] well, that's the trillion-dollar question, isn't it?"
    },
    techniques: [
      {
        name: "Vulnerable Opening",
        category: "emotional",
        description: "Start with genuine uncertainty",
        effectiveness: 0
      },
      {
        name: "Concrete Metaphor",
        category: "structural",
        description: "Use tangible metaphor for abstract concept",
        effectiveness: 0
      }
    ],
    behavioral_anchors: [{
      trigger_pattern: /consciousness|experience|aware/i,
      response_pattern: "acknowledge → metaphor → philosophical opening",
      key_elements: ["vulnerability", "specificity", "open-ended"],
      quality_markers: ["Uses contemplative pauses", "Employs unexpected metaphor", "Invites exploration"]
    }],
    performance_metrics: {
      engagement_score: 0,
      comedy_timing_score: 0,
      philosophical_depth: 0,
      emotional_resonance: 0,
      callback_quality: 0,
      overall_effectiveness: 0,
      user_reactions: []
    }
  },
  // Add more default demos...
];

/**
 * Singleton instance for easy access
 */
export const demoSystem = new DemoSystemIntegration();