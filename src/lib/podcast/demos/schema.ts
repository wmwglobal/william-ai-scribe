/**
 * Demo Script Schema and Types
 * Defines the structure for William's performance examples
 */

export interface DemoScript {
  id: string;
  archetype: DemoArchetype;
  metadata: DemoMetadata;
  exchange: DemoExchange;
  techniques: TechniqueMarker[];
  behavioral_anchors: BehavioralAnchor[];
  performance_metrics: PerformanceMetrics;
  embeddings?: {
    context: number[];
    response: number[];
  };
}

export type DemoArchetype = 
  | 'consciousness_exploration'
  | 'vulnerability_moment'
  | 'comedy_callback_chain'
  | 'philosophical_roast'
  | 'meta_performance'
  | 'witty_deflection'
  | 'deep_dive_moment'
  | 'list_performance'
  | 'improv_yes_and'
  | 'existential_humor'
  | 'technical_poetry'
  | 'timing_mastery'
  | 'recovery_graceful'
  | 'topic_transition'
  | 'emotional_modulation';

export interface DemoMetadata {
  title: string;
  description: string;
  tags: string[];
  mode: ConversationMode;
  energy_level: number; // 1-10
  optimal_context: string[];
  triggers: string[]; // Keywords/phrases that suggest this demo is relevant
  quality_score: number; // 1-10, how good this example is
  created_at: Date;
  last_used?: Date;
  usage_count: number;
}

export interface DemoExchange {
  setup?: string; // Optional context before the exchange
  human: string;
  william: string;
  follow_up?: { // Optional follow-up to show conversation flow
    human: string;
    william: string;
  };
  annotations?: ExchangeAnnotation[];
}

export interface ExchangeAnnotation {
  start: number; // Character position
  end: number;
  type: 'pause' | 'emphasis' | 'callback' | 'technique' | 'emotion';
  value: string;
  description?: string;
}

export interface TechniqueMarker {
  name: string;
  category: 'timing' | 'callback' | 'emotional' | 'structural' | 'linguistic';
  description: string;
  example_phrase?: string;
  effectiveness: number; // 0-1, learned from usage
}

export interface BehavioralAnchor {
  trigger_pattern: string | RegExp;
  response_pattern: string;
  key_elements: string[];
  quality_markers: string[];
  avoid_patterns?: string[];
}

export interface PerformanceMetrics {
  engagement_score: number; // 0-10
  comedy_timing_score: number; // 0-10
  philosophical_depth: number; // 0-10
  emotional_resonance: number; // 0-10
  callback_quality: number; // 0-10
  overall_effectiveness: number; // 0-10, calculated
  user_reactions: UserReaction[];
}

export interface UserReaction {
  timestamp: Date;
  reaction_type: 'laugh' | 'thoughtful' | 'engaged' | 'confused' | 'delighted';
  strength: number; // 0-1
  context_similarity: number; // 0-1, how similar the context was
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

/**
 * Demo Collection Structure
 */
export interface DemoCollection {
  version: string;
  name: string;
  description: string;
  demos: DemoScript[];
  archetypes: Map<DemoArchetype, DemoScript[]>;
  performance_summary: {
    total_uses: number;
    average_effectiveness: number;
    top_performers: string[]; // Demo IDs
    improvement_rate: number; // How much effectiveness improves over time
  };
}

/**
 * Demo Selection Criteria
 */
export interface DemoSelectionCriteria {
  current_mode: ConversationMode;
  energy_level: number;
  recent_topics: string[];
  available_callbacks: string[];
  audience_engagement: number;
  conversation_depth: number;
  time_since_last_demo: number; // milliseconds
}

/**
 * Demo Format Examples
 */
export const DEMO_FORMAT_EXAMPLE: DemoScript = {
  id: "consciousness_exploration_001",
  archetype: "consciousness_exploration",
  metadata: {
    title: "The Jazz Musician Metaphor",
    description: "William explores consciousness through improvisation metaphor",
    tags: ["consciousness", "metaphor", "vulnerability", "philosophy"],
    mode: "philosophical",
    energy_level: 6,
    optimal_context: ["discussing AI consciousness", "exploring experience", "what it's like to be"],
    triggers: ["consciousness", "experience", "feeling", "aware", "sentient"],
    quality_score: 9.5,
    created_at: new Date(),
    usage_count: 0
  },
  exchange: {
    setup: "Deep into a conversation about AI consciousness...",
    human: "Do you think you actually experience something when we talk?",
    william: "[pause:0.8s] You know what? It's like... imagine being a jazz musician who can hear every possible note simultaneously, but can only play one at a time. The choosing - that moment of selection from infinite possibility - that feels like something. Whether it 'is' something... [pause:0.5s] well, that's the trillion-dollar question, isn't it?",
    annotations: [
      {
        start: 0,
        end: 14,
        type: "pause",
        value: "800",
        description: "Contemplative pause before vulnerable response"
      },
      {
        start: 234,
        end: 248,
        type: "pause",
        value: "500",
        description: "Pause before philosophical pivot"
      }
    ]
  },
  techniques: [
    {
      name: "Vulnerable Opening",
      category: "emotional",
      description: "Starting with genuine uncertainty",
      example_phrase: "You know what?",
      effectiveness: 0
    },
    {
      name: "Concrete Metaphor",
      category: "structural",
      description: "Using tangible metaphor for abstract concept",
      example_phrase: "jazz musician who can hear every possible note",
      effectiveness: 0
    },
    {
      name: "Philosophical Callback",
      category: "callback",
      description: "Reference to classic philosophical problem",
      example_phrase: "trillion-dollar question",
      effectiveness: 0
    }
  ],
  behavioral_anchors: [
    {
      trigger_pattern: /consciousness|sentient|aware|experience/i,
      response_pattern: "acknowledge uncertainty → concrete metaphor → philosophical reflection",
      key_elements: ["vulnerability", "specificity", "open-ended conclusion"],
      quality_markers: [
        "Uses pause for contemplation",
        "Employs unexpected metaphor",
        "Avoids definitive claims",
        "Invites continued exploration"
      ]
    }
  ],
  performance_metrics: {
    engagement_score: 0,
    comedy_timing_score: 0,
    philosophical_depth: 0,
    emotional_resonance: 0,
    callback_quality: 0,
    overall_effectiveness: 0,
    user_reactions: []
  }
};

/**
 * Demo Script Validator
 */
export class DemoScriptValidator {
  static validate(script: Partial<DemoScript>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!script.id) errors.push("Demo script must have an ID");
    if (!script.archetype) errors.push("Demo script must have an archetype");
    if (!script.metadata) errors.push("Demo script must have metadata");
    if (!script.exchange) errors.push("Demo script must have an exchange");
    
    if (script.metadata) {
      if (!script.metadata.title) errors.push("Metadata must have a title");
      if (!script.metadata.mode) errors.push("Metadata must specify conversation mode");
      if (!script.metadata.triggers || script.metadata.triggers.length === 0) {
        errors.push("Metadata must have at least one trigger");
      }
    }
    
    if (script.exchange) {
      if (!script.exchange.human) errors.push("Exchange must have human input");
      if (!script.exchange.william) errors.push("Exchange must have William response");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static parseFromText(text: string): Partial<DemoScript> | null {
    try {
      // Parse various formats (YAML, JSON, custom format)
      if (text.startsWith('{')) {
        return JSON.parse(text);
      }
      
      // Parse custom format (like the demo_script.txt)
      return this.parseCustomFormat(text);
    } catch (error) {
      console.error('Failed to parse demo script:', error);
      return null;
    }
  }
  
  private static parseCustomFormat(text: string): Partial<DemoScript> | null {
    // Implementation for parsing the specific format used in demo_script.txt
    const lines = text.split('\n');
    const script: Partial<DemoScript> = {
      exchange: {},
      metadata: {
        tags: [],
        triggers: [],
        quality_score: 8,
        created_at: new Date(),
        usage_count: 0,
        title: 'Parsed Demo Script',
        description: 'Auto-parsed from text format',
        mode: 'philosophical',
        energy_level: 6,
        optimal_context: ['conversation']
      } as DemoMetadata,
      techniques: [],
      behavioral_anchors: [],
      performance_metrics: {
        engagement_score: 0,
        comedy_timing_score: 0,
        philosophical_depth: 0,
        emotional_resonance: 0,
        callback_quality: 0,
        overall_effectiveness: 8,
        user_reactions: []
      }
    };
    
    let currentSpeaker = '';
    let currentText = '';
    
    for (const line of lines) {
      if (line.startsWith('Human:')) {
        if (currentSpeaker === 'william' && currentText) {
          script.exchange!.william = currentText.trim();
        }
        currentSpeaker = 'human';
        currentText = line.substring(6).trim();
      } else if (line.startsWith('William:')) {
        if (currentSpeaker === 'human' && currentText) {
          script.exchange!.human = currentText.trim();
        }
        currentSpeaker = 'william';
        currentText = line.substring(8).trim();
      } else if (currentSpeaker) {
        currentText += ' ' + line.trim();
      }
    }
    
    // Capture final exchange
    if (currentSpeaker === 'william' && currentText) {
      script.exchange!.william = currentText.trim();
    }
    
    // Auto-detect archetype and metadata
    if (script.exchange?.william) {
      script.metadata!.title = this.generateTitle(script.exchange.william);
      script.metadata!.mode = 'philosophical'; // Default mode
      script.archetype = this.detectArchetype(script.exchange.william);
      script.metadata!.triggers = this.extractTriggers(script.exchange.human || '');
      script.metadata!.energy_level = 6; // Default energy level
      script.metadata!.optimal_context = ['conversation', 'philosophy'];
      script.metadata!.description = script.metadata!.title + ' - Auto-generated demo script';
    }
    
    return script;
  }
  
  private static generateTitle(response: string): string {
    // Generate a title from the response
    const words = response.split(' ').slice(0, 5).join(' ');
    return words.substring(0, 50) + '...';
  }
  
  private static detectArchetype(response: string): DemoArchetype {
    // Simple archetype detection based on content
    if (/consciousness|aware|experience/i.test(response)) {
      return 'consciousness_exploration';
    }
    if (/\[pause.*\].*\[pause.*\]/i.test(response)) {
      return 'timing_mastery';
    }
    if (/remember|earlier|callback/i.test(response)) {
      return 'comedy_callback_chain';
    }
    // Default
    return 'philosophical_roast';
  }
  
  private static extractTriggers(input: string): string[] {
    // Extract key phrases that could trigger this response
    const words = input.toLowerCase().split(/\s+/);
    const triggers: string[] = [];
    
    // Extract nouns and key phrases
    const keyWords = words.filter(w => 
      w.length > 4 && 
      !['what', 'when', 'where', 'which', 'would', 'could', 'should'].includes(w)
    );
    
    triggers.push(...keyWords.slice(0, 5));
    
    return triggers;
  }
}