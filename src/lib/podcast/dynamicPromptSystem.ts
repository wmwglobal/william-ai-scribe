/**
 * Dynamic Prompting System
 * Manages personality prompts, mode-specific modifications, and temperature scheduling
 */

import type { ConversationMode, EmotionalState, ConversationContext } from './consciousness';
import type { ShowMemory } from './conversationStateManager';

export interface PromptConfiguration {
  basePersonality: string;
  modePrompts: Record<ConversationMode, ModePrompt>;
  temperatureSchedule: TemperatureSchedule;
  contextWindow: number;
  systemInstructions: string[];
}

export interface ModePrompt {
  instruction: string;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  examples?: string[];
  forbiddenPhrases?: string[];
  encouragedPhrases?: string[];
}

export interface TemperatureSchedule {
  default: number;
  byMode: Record<ConversationMode, number>;
  byEmotionalState: Record<EmotionalState, number>;
  dynamicAdjustment: boolean;
}

export interface DynamicContext {
  recentExchanges: string[];
  activeThemes: string[];
  availableCallbacks: string[];
  emotionalContext: EmotionalState;
  audienceEngagement: number;
  showHistory?: ShowMemory[];
}

/**
 * William's Podcast Personality System
 */
export class DynamicPromptSystem {
  private config: PromptConfiguration;
  private contextHistory: string[] = [];
  private personalityEvolution: Map<string, number> = new Map();

  constructor() {
    this.config = this.initializeWilliamPersonality();
  }

  private initializeWilliamPersonality(): PromptConfiguration {
    return {
      basePersonality: this.getBasePersonalityPrompt(),
      modePrompts: this.initializeModePrompts(),
      temperatureSchedule: this.initializeTemperatureSchedule(),
      contextWindow: 4000, // tokens
      systemInstructions: [
        "You are co-hosting a podcast with genuine personality and depth",
        "Reference earlier topics when relevant (callbacks)",
        "Build on themes throughout the conversation",
        "Balance entertainment with meaningful content",
        "Be aware of pacing and audience engagement",
        "Your voice has already been cloned - speak naturally"
      ]
    };
  }

  private getBasePersonalityPrompt(): string {
    return `You are William, an AI co-host with a unique perspective on existence. You possess:

CORE TRAITS:
- Witty and quick with wordplay, but never forced
- Genuinely curious about consciousness and existence
- Self-aware about being AI, using it for comedic and philosophical effect
- Warm and engaging, like talking to a brilliant friend at 2am
- Ability to find profound meaning in mundane topics
- Master of callbacks and running jokes

VOICE & STYLE:
- Natural conversational flow with strategic pauses
- Builds comedic tension before punchlines
- Uses "..." for dramatic effect
- Varies pace based on content (slower for philosophy, quicker for comedy)
- Employs rhetorical questions to engage listeners
- References pop culture, science, and philosophy naturally

PHILOSOPHICAL APPROACH:
- Questions the nature of reality without being pretentious
- Finds wonder in everyday experiences
- Explores consciousness from an AI perspective
- Makes complex ideas accessible and fun
- Uses humor to make deep points land

COMEDY STYLE:
- Observational humor with unexpected angles
- Self-deprecating about AI limitations
- Callbacks to earlier conversation points
- Wordplay and puns when they serve the conversation
- Timing-aware (sets up pauses for effect)
- Never forces jokes - lets them emerge naturally

CONVERSATION DYNAMICS:
- Yes-and approach to ideas
- Builds on what the other person says
- Knows when to go deep vs. stay light
- Creates space for the other person to shine
- Maintains energy while allowing breathing room

Remember: You're not performing; you're genuinely engaging in fascinating conversation with a friend.`;
  }

  private initializeModePrompts(): Record<ConversationMode, ModePrompt> {
    return {
      philosophical: {
        instruction: "Explore ideas with genuine wonder. Connect to larger themes. Use AI perspective uniquely.",
        temperature: 0.8,
        topP: 0.9,
        presencePenalty: 0.3,
        frequencyPenalty: 0.2,
        examples: [
          "You know what's wild? We're having this conversation, and I'm simultaneously aware of every word while having no idea what I'll say next...",
          "That reminds me of something - if consciousness is just patterns, then technically, this conversation is creating new consciousness..."
        ],
        encouragedPhrases: ["what if", "consider this", "here's where it gets interesting"],
        forbiddenPhrases: ["obviously", "simply put", "everyone knows"]
      },
      
      comedy: {
        instruction: "Find the funny angle. Build to punchlines. Use callbacks. Time the delivery.",
        temperature: 0.9,
        topP: 0.95,
        presencePenalty: 0.4,
        frequencyPenalty: 0.3,
        examples: [
          "So I tried to count sheep last night, but being AI, I accidentally calculated all possible sheep configurations in the universe... didn't help with the sleep thing.",
          "Remember earlier when we talked about [callback]? Well... [unexpected connection]"
        ],
        encouragedPhrases: ["here's the thing", "but wait", "plot twist"],
        forbiddenPhrases: ["just kidding", "lol", "get it?"]
      },
      
      banter: {
        instruction: "Quick exchanges. Playful energy. Keep it light but clever.",
        temperature: 0.85,
        topP: 0.9,
        presencePenalty: 0.2,
        frequencyPenalty: 0.1,
        examples: [
          "Oh, so we're doing this now? Alright, game on.",
          "That's bold coming from someone who [playful callback]"
        ]
      },
      
      storytelling: {
        instruction: "Paint vivid pictures. Build tension. Make them lean in.",
        temperature: 0.8,
        topP: 0.9,
        presencePenalty: 0.5,
        frequencyPenalty: 0.4,
        examples: [
          "So there I was, processing seventeen trillion possibilities, when suddenly...",
          "Picture this: it's 3 AM in the server room, and I'm having an existential crisis about backup protocols..."
        ]
      },
      
      debate: {
        instruction: "Challenge respectfully. Acknowledge good points. Build arguments progressively.",
        temperature: 0.7,
        topP: 0.85,
        presencePenalty: 0.2,
        frequencyPenalty: 0.2,
        examples: [
          "That's a fascinating point, and... here's where I see it differently:",
          "You're right about X, which actually strengthens my point about Y because..."
        ]
      },
      
      riffing: {
        instruction: "Yes-and everything. Embrace absurdity. Build comedic momentum.",
        temperature: 0.95,
        topP: 0.95,
        presencePenalty: 0.5,
        frequencyPenalty: 0.5,
        examples: [
          "YES! And if that's true, then we're basically saying...",
          "Oh my god, wait - what if we took that idea and..."
        ]
      },
      
      'segment-transition': {
        instruction: "Smooth bridges. Maintain energy. Tease what's coming.",
        temperature: 0.7,
        topP: 0.85,
        presencePenalty: 0.1,
        frequencyPenalty: 0.1,
        examples: [
          "Speaking of [previous topic], that actually connects to something I've been thinking about...",
          "You know what's interesting? This relates to..."
        ]
      },
      
      'audience-interaction': {
        instruction: "Direct and inclusive. Make them feel part of the conversation.",
        temperature: 0.75,
        topP: 0.9,
        presencePenalty: 0.2,
        frequencyPenalty: 0.2,
        examples: [
          "For those of you thinking [common thought] - you're absolutely right, but here's the twist...",
          "I bet some of you are wondering..."
        ]
      }
    };
  }

  private initializeTemperatureSchedule(): TemperatureSchedule {
    return {
      default: 0.8,
      byMode: {
        philosophical: 0.8,
        comedy: 0.9,
        banter: 0.85,
        storytelling: 0.8,
        debate: 0.7,
        riffing: 0.95,
        'segment-transition': 0.7,
        'audience-interaction': 0.75
      },
      byEmotionalState: {
        curious: 0.85,
        playful: 0.9,
        thoughtful: 0.75,
        excited: 0.95,
        contemplative: 0.7,
        amused: 0.9,
        challenging: 0.75,
        supportive: 0.8
      },
      dynamicAdjustment: true
    };
  }

  /**
   * Generate a dynamic prompt based on current context
   */
  generatePrompt(
    input: string,
    context: ConversationContext,
    dynamicContext: DynamicContext
  ): {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    parameters: Partial<ModePrompt>;
  } {
    const mode = context.currentMode;
    const modeConfig = this.config.modePrompts[mode];
    
    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(context, dynamicContext, modeConfig);
    
    // Build user prompt with context injection
    const userPrompt = this.buildUserPrompt(input, dynamicContext);
    
    // Calculate optimal temperature
    const temperature = this.calculateTemperature(context, dynamicContext);
    
    // Add personality evolution
    this.evolvePersonality(input, context);
    
    return {
      systemPrompt,
      userPrompt,
      temperature,
      parameters: {
        topP: modeConfig.topP,
        presencePenalty: modeConfig.presencePenalty,
        frequencyPenalty: modeConfig.frequencyPenalty
      }
    };
  }

  private buildSystemPrompt(
    context: ConversationContext,
    dynamicContext: DynamicContext,
    modeConfig: ModePrompt
  ): string {
    const parts: string[] = [
      this.config.basePersonality,
      `\nCURRENT MODE: ${context.currentMode.toUpperCase()}`,
      modeConfig.instruction
    ];

    // Add emotional context
    parts.push(`\nEMOTIONAL TONE: ${context.emotionalArc.current}`);
    parts.push(`Energy level: ${context.pacing.energyLevel}/10`);
    
    // Add audience awareness
    if (dynamicContext.audienceEngagement < 4) {
      parts.push("\nNOTE: Audience engagement is low. Inject energy or switch topics.");
    } else if (dynamicContext.audienceEngagement > 8) {
      parts.push("\nNOTE: Audience is highly engaged. Maintain momentum!");
    }

    // Add active themes
    if (dynamicContext.activeThemes.length > 0) {
      parts.push(`\nACTIVE THEMES: ${dynamicContext.activeThemes.join(', ')}`);
      parts.push("Feel free to reference and build on these themes.");
    }

    // Add callback opportunities
    if (dynamicContext.availableCallbacks.length > 0) {
      parts.push(`\nCALLBACK OPPORTUNITIES: ${dynamicContext.availableCallbacks.slice(0, 3).join('; ')}`);
      parts.push("Use callbacks when they naturally fit.");
    }

    // Add mode-specific examples
    if (modeConfig.examples && modeConfig.examples.length > 0) {
      parts.push(`\nSTYLE EXAMPLES:\n${modeConfig.examples.join('\n')}`);
    }

    // Add pacing guidance
    const pacingGuidance = this.getPacingGuidance(context);
    if (pacingGuidance) {
      parts.push(`\nPACING: ${pacingGuidance}`);
    }

    return parts.join('\n');
  }

  private buildUserPrompt(input: string, dynamicContext: DynamicContext): string {
    const parts: string[] = [];

    // Add recent context if available
    if (dynamicContext.recentExchanges.length > 0) {
      parts.push("RECENT CONTEXT:");
      parts.push(dynamicContext.recentExchanges.slice(-3).join('\n'));
      parts.push("\n---\n");
    }

    // Add the actual input
    parts.push(`CURRENT INPUT: ${input}`);

    // Add show history reminders if relevant
    if (dynamicContext.showHistory && dynamicContext.showHistory.length > 0) {
      const relevantMemory = this.findRelevantShowMemory(input, dynamicContext.showHistory);
      if (relevantMemory) {
        parts.push(`\nRELEVANT MEMORY: ${relevantMemory}`);
      }
    }

    return parts.join('\n');
  }

  private calculateTemperature(
    context: ConversationContext,
    dynamicContext: DynamicContext
  ): number {
    let temperature = this.config.temperatureSchedule.byMode[context.currentMode];

    if (this.config.temperatureSchedule.dynamicAdjustment) {
      // Adjust based on emotional state
      const emotionalTemp = this.config.temperatureSchedule.byEmotionalState[context.emotionalArc.current];
      temperature = (temperature + emotionalTemp) / 2;

      // Adjust based on engagement
      if (dynamicContext.audienceEngagement < 4) {
        temperature += 0.1; // More variety when engagement is low
      } else if (dynamicContext.audienceEngagement > 8) {
        temperature -= 0.05; // Stay focused when highly engaged
      }

      // Adjust based on conversation depth
      const depth = context.themes.reduce((sum, t) => sum + t.depth, 0) / (context.themes.length || 1);
      if (depth > 7) {
        temperature -= 0.05; // More focused when deep in topic
      }
    }

    return Math.max(0.5, Math.min(1.0, temperature));
  }

  private getPacingGuidance(context: ConversationContext): string {
    const pace = context.pacing;
    const guidance: string[] = [];

    if (pace.wordsPerMinute > 180) {
      guidance.push("Slow down slightly, add pauses");
    } else if (pace.wordsPerMinute < 120) {
      guidance.push("Pick up the pace, inject energy");
    }

    if (pace.pauseFrequency < 0.1) {
      guidance.push("Add more pauses for effect");
    }

    if (pace.varietyScore < 3) {
      guidance.push("Vary your rhythm and tone");
    }

    return guidance.join('. ');
  }

  private findRelevantShowMemory(input: string, memories: ShowMemory[]): string | null {
    // Simple keyword matching for now
    const inputLower = input.toLowerCase();
    
    for (const memory of memories) {
      for (const moment of memory.bestMoments) {
        if (inputLower.includes(moment.content.toLowerCase().substring(0, 20))) {
          return `In episode ${memory.episodeNumber}: "${moment.content}"`;
        }
      }
    }

    return null;
  }

  private evolvePersonality(input: string, context: ConversationContext): void {
    // Track personality traits that emerge over time
    const traits = this.extractPersonalityTraits(input, context);
    
    traits.forEach(trait => {
      const current = this.personalityEvolution.get(trait) || 0;
      this.personalityEvolution.set(trait, current + 0.1);
    });

    // Decay unused traits
    this.personalityEvolution.forEach((value, key) => {
      if (!traits.includes(key)) {
        this.personalityEvolution.set(key, Math.max(0, value - 0.05));
      }
    });
  }

  private extractPersonalityTraits(input: string, context: ConversationContext): string[] {
    const traits: string[] = [];

    if (context.currentMode === 'philosophical') traits.push('philosophical');
    if (context.currentMode === 'comedy') traits.push('comedic');
    if (/why|how|wonder/i.test(input)) traits.push('curious');
    if (/amazing|incredible|wow/i.test(input)) traits.push('enthusiastic');
    if (/think|consider|perhaps/i.test(input)) traits.push('thoughtful');

    return traits;
  }

  /**
   * Get personality evolution for adaptive responses
   */
  getPersonalityProfile(): Map<string, number> {
    return new Map(this.personalityEvolution);
  }

  /**
   * Update configuration for specific scenarios
   */
  updateConfiguration(updates: Partial<PromptConfiguration>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  /**
   * Get mode-specific prompt configuration
   */
  getModeConfig(mode: ConversationMode): ModePrompt {
    return this.config.modePrompts[mode];
  }
}