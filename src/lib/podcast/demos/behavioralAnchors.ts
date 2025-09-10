/**
 * Behavioral Anchoring System
 * Converts demo scripts into behavioral patterns rather than direct examples
 */

import type { 
  DemoScript, 
  BehavioralAnchor, 
  TechniqueMarker,
  DemoArchetype 
} from './schema';
import type { ConversationContext, ConversationMode } from '../consciousness';

export interface AnchorActivation {
  anchor: BehavioralAnchor;
  strength: number; // 0-1, how strongly this anchor should influence
  source: DemoScript;
  reason: string;
}

export interface BehavioralGuidance {
  primary_pattern: string;
  techniques_to_employ: TechniqueMarker[];
  quality_markers: string[];
  avoid_patterns: string[];
  energy_modulation: number; // -1 to 1
  timing_suggestions: TimingSuggestion[];
}

export interface TimingSuggestion {
  type: 'pause' | 'emphasis' | 'speed';
  where: 'opening' | 'middle' | 'punchline' | 'conclusion';
  duration?: number; // for pauses
  intensity?: number; // for emphasis
}

/**
 * Behavioral Anchor System
 */
export class BehavioralAnchorSystem {
  private anchors: Map<string, BehavioralAnchor> = new Map();
  private archetypePatterns: Map<DemoArchetype, BehavioralPattern> = new Map();
  private activationHistory: AnchorActivation[] = [];
  private learningRate: number = 0.1;

  constructor() {
    this.initializeArchetypePatterns();
  }

  /**
   * Initialize archetype behavioral patterns
   */
  private initializeArchetypePatterns(): void {
    // Define behavioral patterns for each archetype
    this.archetypePatterns.set('consciousness_exploration', {
      name: 'consciousness_exploration',
      core_pattern: 'acknowledge uncertainty → concrete metaphor → philosophical implication',
      techniques: [
        'vulnerable_opening',
        'unexpected_metaphor',
        'open_ended_conclusion'
      ],
      timing: {
        opening_pause: 800,
        mid_pause: 500,
        conclusion_pause: 600
      },
      emotional_trajectory: 'curious → wondering → contemplative',
      key_phrases: [
        'it\'s like',
        'imagine',
        'that feels like',
        'whether it is'
      ]
    });

    this.archetypePatterns.set('comedy_callback_chain', {
      name: 'comedy_callback_chain',
      core_pattern: 'setup reminder → unexpected connection → escalating absurdity',
      techniques: [
        'callback_setup',
        'misdirection',
        'pattern_break'
      ],
      timing: {
        setup_pause: 400,
        pre_punchline_pause: 800,
        post_punchline_pause: 1000
      },
      emotional_trajectory: 'neutral → building → explosive',
      key_phrases: [
        'remember when',
        'which is exactly like',
        'and THAT\'s why'
      ]
    });

    this.archetypePatterns.set('philosophical_roast', {
      name: 'philosophical_roast',
      core_pattern: 'gentle setup → philosophical observation → witty undermining',
      techniques: [
        'false_agreement',
        'intellectual_pivot',
        'humble_devastation'
      ],
      timing: {
        setup_pause: 300,
        pivot_pause: 600,
        conclusion_pause: 800
      },
      emotional_trajectory: 'agreeable → thoughtful → mischievous',
      key_phrases: [
        'you\'re absolutely right',
        'which raises the question',
        'but then again'
      ]
    });

    this.archetypePatterns.set('vulnerability_moment', {
      name: 'vulnerability_moment',
      core_pattern: 'honest admission → specific detail → universal connection',
      techniques: [
        'genuine_uncertainty',
        'specific_confession',
        'inclusive_conclusion'
      ],
      timing: {
        opening_pause: 1000,
        mid_pause: 600,
        conclusion_pause: 800
      },
      emotional_trajectory: 'hesitant → open → connective',
      key_phrases: [
        'honestly',
        'I don\'t know if',
        'maybe that\'s just'
      ]
    });

    // Add more archetype patterns...
  }

  /**
   * Extract behavioral anchors from demo scripts
   */
  extractAnchors(demos: DemoScript[]): BehavioralAnchor[] {
    const anchors: BehavioralAnchor[] = [];

    for (const demo of demos) {
      // Use existing anchors if available
      if (demo.behavioral_anchors && demo.behavioral_anchors.length > 0) {
        anchors.push(...demo.behavioral_anchors);
        demo.behavioral_anchors.forEach(anchor => {
          this.anchors.set(`${demo.id}_${anchors.length}`, anchor);
        });
      }

      // Generate anchors from patterns
      const pattern = this.archetypePatterns.get(demo.archetype);
      if (pattern) {
        const generatedAnchor = this.generateAnchorFromPattern(demo, pattern);
        anchors.push(generatedAnchor);
        this.anchors.set(`${demo.id}_generated`, generatedAnchor);
      }
    }

    return anchors;
  }

  /**
   * Generate anchor from archetype pattern
   */
  private generateAnchorFromPattern(
    demo: DemoScript,
    pattern: BehavioralPattern
  ): BehavioralAnchor {
    return {
      trigger_pattern: new RegExp(demo.metadata.triggers.join('|'), 'i'),
      response_pattern: pattern.core_pattern,
      key_elements: [
        ...pattern.techniques,
        ...this.extractKeyElements(demo.exchange.william)
      ],
      quality_markers: [
        `Uses ${pattern.emotional_trajectory} emotional arc`,
        `Employs ${pattern.techniques.join(', ')} techniques`,
        `Includes timing pauses (${Object.values(pattern.timing).join('ms, ')}ms)`,
        ...this.extractQualityMarkers(demo)
      ],
      avoid_patterns: [
        'direct answering',
        'immediate agreement',
        'cliché responses',
        'forced humor'
      ]
    };
  }

  /**
   * Determine which anchors should activate
   */
  determineActivations(
    context: ConversationContext,
    userInput: string,
    availableDemos: DemoScript[]
  ): AnchorActivation[] {
    const activations: AnchorActivation[] = [];

    for (const demo of availableDemos) {
      const anchors = demo.behavioral_anchors || [];
      
      for (const anchor of anchors) {
        const activation = this.evaluateAnchorActivation(anchor, context, userInput, demo);
        
        if (activation.strength > 0.3) { // Threshold for activation
          activations.push(activation);
        }
      }
    }

    // Sort by strength and limit
    activations.sort((a, b) => b.strength - a.strength);
    const selected = activations.slice(0, 3);

    // Track for learning
    this.activationHistory.push(...selected);

    return selected;
  }

  /**
   * Evaluate if an anchor should activate
   */
  private evaluateAnchorActivation(
    anchor: BehavioralAnchor,
    context: ConversationContext,
    userInput: string,
    source: DemoScript
  ): AnchorActivation {
    let strength = 0;
    let reason = '';

    // Check trigger pattern
    if (typeof anchor.trigger_pattern === 'string') {
      if (userInput.toLowerCase().includes(anchor.trigger_pattern.toLowerCase())) {
        strength += 0.5;
        reason = 'Direct trigger match';
      }
    } else if (anchor.trigger_pattern.test(userInput)) {
      strength += 0.6;
      reason = 'Pattern trigger match';
    }

    // Check context alignment
    if (source.metadata.mode === context.currentMode) {
      strength += 0.2;
      reason += ', Mode alignment';
    }

    // Check energy alignment
    const energyDiff = Math.abs(source.metadata.energy_level - context.pacing.energyLevel);
    if (energyDiff < 2) {
      strength += 0.1;
      reason += ', Energy match';
    }

    // Check if techniques are appropriate
    if (context.currentMode === 'comedy' && 
        source.techniques.some(t => t.category === 'timing')) {
      strength += 0.2;
      reason += ', Comedy timing appropriate';
    }

    return {
      anchor,
      strength: Math.min(1, strength),
      source,
      reason: reason || 'No specific trigger'
    };
  }

  /**
   * Convert activations to behavioral guidance
   */
  generateGuidance(activations: AnchorActivation[]): BehavioralGuidance {
    if (activations.length === 0) {
      return this.getDefaultGuidance();
    }

    // Aggregate from top activations
    const guidance: BehavioralGuidance = {
      primary_pattern: '',
      techniques_to_employ: [],
      quality_markers: [],
      avoid_patterns: [],
      energy_modulation: 0,
      timing_suggestions: []
    };

    // Use strongest activation as primary
    const primary = activations[0];
    guidance.primary_pattern = primary.anchor.response_pattern;

    // Collect techniques from all activations (weighted)
    const techniqueMap = new Map<string, number>();
    for (const activation of activations) {
      const weight = activation.strength;
      
      for (const technique of activation.source.techniques) {
        const current = techniqueMap.get(technique.name) || 0;
        techniqueMap.set(technique.name, current + weight);
      }
    }

    // Select top techniques
    const sortedTechniques = Array.from(techniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [techName] of sortedTechniques) {
      const technique = activations
        .flatMap(a => a.source.techniques)
        .find(t => t.name === techName);
      
      if (technique) {
        guidance.techniques_to_employ.push(technique);
      }
    }

    // Aggregate quality markers
    const allMarkers = new Set<string>();
    for (const activation of activations) {
      activation.anchor.quality_markers.forEach(m => allMarkers.add(m));
    }
    guidance.quality_markers = Array.from(allMarkers).slice(0, 5);

    // Aggregate avoid patterns
    const allAvoid = new Set<string>();
    for (const activation of activations) {
      activation.anchor.avoid_patterns?.forEach(p => allAvoid.add(p));
    }
    guidance.avoid_patterns = Array.from(allAvoid);

    // Calculate energy modulation
    let totalEnergy = 0;
    let totalWeight = 0;
    for (const activation of activations) {
      const energyLevel = activation.source.metadata.energy_level;
      totalEnergy += (energyLevel - 5) * activation.strength; // Centered at 5
      totalWeight += activation.strength;
    }
    guidance.energy_modulation = totalWeight > 0 ? (totalEnergy / totalWeight) / 5 : 0;

    // Generate timing suggestions
    guidance.timing_suggestions = this.generateTimingSuggestions(activations);

    return guidance;
  }

  /**
   * Generate timing suggestions from activations
   */
  private generateTimingSuggestions(activations: AnchorActivation[]): TimingSuggestion[] {
    const suggestions: TimingSuggestion[] = [];

    for (const activation of activations) {
      const pattern = this.archetypePatterns.get(activation.source.archetype);
      if (!pattern) continue;

      // Opening pause
      if (pattern.timing.opening_pause > 0) {
        suggestions.push({
          type: 'pause',
          where: 'opening',
          duration: pattern.timing.opening_pause
        });
      }

      // Punchline pause for comedy
      if (activation.source.archetype === 'comedy_callback_chain' ||
          activation.source.archetype === 'philosophical_roast') {
        suggestions.push({
          type: 'pause',
          where: 'punchline',
          duration: pattern.timing.pre_punchline_pause || 800
        });
      }

      // Emphasis for key moments
      if (activation.source.techniques.some(t => t.name.includes('emphasis'))) {
        suggestions.push({
          type: 'emphasis',
          where: 'middle',
          intensity: 0.8
        });
      }
    }

    return suggestions;
  }

  /**
   * Format guidance as instructions
   */
  formatAsInstructions(guidance: BehavioralGuidance): string {
    let instructions = '';

    // Primary pattern
    if (guidance.primary_pattern) {
      instructions += `Follow this response pattern: ${guidance.primary_pattern}\n\n`;
    }

    // Techniques
    if (guidance.techniques_to_employ.length > 0) {
      instructions += "Employ these techniques:\n";
      for (const tech of guidance.techniques_to_employ) {
        instructions += `• ${tech.name}: ${tech.description}\n`;
      }
      instructions += '\n';
    }

    // Quality markers
    if (guidance.quality_markers.length > 0) {
      instructions += "Ensure these qualities:\n";
      for (const marker of guidance.quality_markers) {
        instructions += `• ${marker}\n`;
      }
      instructions += '\n';
    }

    // Timing
    if (guidance.timing_suggestions.length > 0) {
      instructions += "Timing notes:\n";
      for (const timing of guidance.timing_suggestions) {
        if (timing.type === 'pause') {
          instructions += `• Add ${timing.duration}ms pause at ${timing.where}\n`;
        } else if (timing.type === 'emphasis') {
          instructions += `• Emphasize ${timing.where} section (intensity: ${timing.intensity})\n`;
        }
      }
      instructions += '\n';
    }

    // Avoid patterns
    if (guidance.avoid_patterns.length > 0) {
      instructions += `Avoid: ${guidance.avoid_patterns.join(', ')}\n`;
    }

    // Energy
    if (Math.abs(guidance.energy_modulation) > 0.2) {
      const direction = guidance.energy_modulation > 0 ? 'increase' : 'decrease';
      instructions += `\nEnergy: ${direction} by ${Math.abs(guidance.energy_modulation * 100).toFixed(0)}%\n`;
    }

    return instructions;
  }

  /**
   * Learn from response effectiveness
   */
  updateAnchorEffectiveness(
    activationId: string,
    effectiveness: number
  ): void {
    const activation = this.activationHistory.find(a => 
      `${a.source.id}_${a.anchor.response_pattern}` === activationId
    );

    if (!activation) return;

    // Update source demo's effectiveness
    const currentEff = activation.source.performance_metrics.overall_effectiveness;
    const newEff = currentEff * (1 - this.learningRate) + effectiveness * this.learningRate;
    activation.source.performance_metrics.overall_effectiveness = newEff;

    // Update technique effectiveness
    for (const technique of activation.source.techniques) {
      technique.effectiveness = 
        technique.effectiveness * (1 - this.learningRate) + 
        effectiveness * this.learningRate;
    }
  }

  /**
   * Helper methods
   */
  private extractKeyElements(response: string): string[] {
    const elements: string[] = [];

    // Extract structural elements
    if (response.includes('...')) elements.push('dramatic_pause');
    if (/\?.*!/.test(response)) elements.push('question_to_exclamation');
    if (response.includes('actually')) elements.push('perspective_shift');
    if (/remember|earlier|before/.test(response)) elements.push('callback_reference');

    return elements;
  }

  private extractQualityMarkers(demo: DemoScript): string[] {
    const markers: string[] = [];

    // Analyze response for quality indicators
    const response = demo.exchange.william;
    
    if (response.length > 100) markers.push('Substantive response');
    if (/\[pause:\d+/.test(response)) markers.push('Uses timing pauses');
    if (demo.techniques.length > 3) markers.push('Multiple techniques employed');
    if (demo.exchange.follow_up) markers.push('Continues conversation naturally');

    return markers;
  }

  private getDefaultGuidance(): BehavioralGuidance {
    return {
      primary_pattern: 'acknowledge → explore → conclude with opening',
      techniques_to_employ: [],
      quality_markers: [
        'Natural conversational flow',
        'Genuine engagement',
        'Appropriate energy level'
      ],
      avoid_patterns: ['clichés', 'forced humor', 'over-explanation'],
      energy_modulation: 0,
      timing_suggestions: []
    };
  }
}

/**
 * Behavioral Pattern Interface
 */
interface BehavioralPattern {
  name: string;
  core_pattern: string;
  techniques: string[];
  timing: {
    opening_pause?: number;
    mid_pause?: number;
    pre_punchline_pause?: number;
    post_punchline_pause?: number;
    conclusion_pause?: number;
  };
  emotional_trajectory: string;
  key_phrases: string[];
}