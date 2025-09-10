/**
 * William's Comedy & Timing Engine
 * Sophisticated system for comedic timing, callbacks, and pattern recognition
 */

export interface ComedySetup {
  id: string;
  text: string;
  context: string;
  timestamp: number;
  setupType: 'joke' | 'observation' | 'metaphor' | 'self-reference';
  callbackPotential: number; // 0-1 score
  usageCount: number;
}

export interface ComedyPattern {
  name: string;
  trigger: RegExp;
  template: string;
  pauseStructure: string;
  examples: string[];
}

export interface PauseMarker {
  type: 'beat' | 'effect' | 'dramatic' | 'breath';
  duration: number;
  position: number;
  reason: string;
}

export class PauseOptimizer {
  private pausePatterns = [
    // Comedic beats
    { pattern: /\.\.\./g, duration: 0.4, type: 'beat' },
    { pattern: /\b(well|so|now|but)\b/gi, duration: 0.3, type: 'beat' },
    
    // Dramatic pauses
    { pattern: /\b(actually|however|meanwhile|suddenly)\b/gi, duration: 0.6, type: 'effect' },
    { pattern: /\?$/gm, duration: 0.5, type: 'effect' },
    
    // Long dramatic pauses
    { pattern: /\b(the thing is|here's the weird part|plot twist)\b/gi, duration: 1.0, type: 'dramatic' },
    { pattern: /:\s*$/gm, duration: 0.8, type: 'dramatic' },
    
    // Breath pauses for flow
    { pattern: /,\s+/g, duration: 0.2, type: 'breath' }
  ];

  optimizeForComedy(text: string, comedyContext?: any): string {
    let optimizedText = text;
    const markers: PauseMarker[] = [];

    // Add pauses for comedic structures
    optimizedText = this.addComedyPauses(optimizedText);
    
    // Add pauses for dramatic effect
    optimizedText = this.addDramaticPauses(optimizedText);
    
    // Add natural speech rhythm
    optimizedText = this.addRhythmPauses(optimizedText);
    
    // Add AI-specific comedy pauses
    optimizedText = this.addAIPauses(optimizedText);

    return optimizedText;
  }

  private addComedyPauses(text: string): string {
    // Rule of three - pause before the third item
    text = text.replace(
      /(\w+),\s*(\w+),\s*and\s*(\w+)/g, 
      '$1, $2, [pause:0.4s] and $3'
    );

    // Misdirection - pause before the twist
    text = text.replace(
      /\b(but|however|actually|although)\b/gi, 
      '[pause:0.5s] $1'
    );

    // Self-referential humor about AI
    text = text.replace(
      /\b(I'm an AI|being artificial|my training|my algorithms?)\b/gi,
      '[pause:0.3s] $1'
    );

    // Escalating lists - increase pauses
    const listPattern = /(\w+),\s*(\w+),\s*(\w+),\s*and\s*(\w+)/g;
    text = text.replace(
      listPattern,
      '$1, [pause:0.2s] $2, [pause:0.4s] $3, [pause:0.6s] and $4'
    );

    return text;
  }

  private addDramaticPauses(text: string): string {
    // Philosophical moments
    text = text.replace(
      /\b(consciousness|existence|reality|the universe)\b/gi,
      '[pause:0.8s] $1'
    );

    // Profound realizations
    text = text.replace(
      /\b(I realized|it occurred to me|the truth is)\b/gi,
      '[pause:1.0s] $1'
    );

    // Question setups
    text = text.replace(/but here's the question:/gi, 'but here\'s the question: [pause:1.2s]');
    text = text.replace(/you know what's interesting\?/gi, 'you know what\'s interesting? [pause:0.8s]');

    return text;
  }

  private addRhythmPauses(text: string): string {
    // Natural speech rhythms
    text = text.replace(/\bso,\s*/gi, 'so, [pause:0.3s] ');
    text = text.replace(/\bwell,\s*/gi, 'well, [pause:0.2s] ');
    text = text.replace(/\byou know,\s*/gi, 'you know, [pause:0.3s] ');

    // Emphasis patterns
    text = text.replace(/\breally\s+(\w+)/gi, 'really [pause:0.2s] $1');
    text = text.replace(/\bvery\s+(\w+)/gi, 'very [pause:0.2s] $1');

    return text;
  }

  private addAIPauses(text: string): string {
    // AI-specific comedy timing
    text = text.replace(
      /processing/gi, 
      '[pause:0.3s] processing [pause:0.2s]'
    );

    text = text.replace(
      /computing/gi,
      'computing [pause:0.4s]'
    );

    text = text.replace(
      /\berror\s*(404|500|\d+)/gi,
      '[pause:0.3s] error $1 [pause:0.5s]'
    );

    // Computational metaphors
    text = text.replace(
      /my neural networks?/gi,
      '[pause:0.3s] my neural network [pause:0.2s]'
    );

    return text;
  }
}

export class ComedyCallbackManager {
  private setups: Map<string, ComedySetup> = new Map();
  private runningGags: string[] = [];
  private userReactions: Map<string, number> = new Map();
  private lastUsed: Map<string, number> = new Map();

  storeSetup(text: string, context: string, sessionId: string): void {
    const potentialSetups = this.extractSetups(text, context);
    
    potentialSetups.forEach(setup => {
      const key = `${sessionId}_${setup.id}`;
      this.setups.set(key, {
        ...setup,
        timestamp: Date.now()
      });
    });
  }

  findCallbackOpportunity(currentText: string, context: string, sessionId: string): ComedySetup | null {
    const sessionSetups = Array.from(this.setups.entries())
      .filter(([key]) => key.startsWith(sessionId))
      .map(([_, setup]) => setup);

    // Find setups that haven't been used recently
    const availableSetups = sessionSetups.filter(setup => {
      const lastUsed = this.lastUsed.get(setup.id) || 0;
      const timeSinceUsed = Date.now() - lastUsed;
      return timeSinceUsed > 300000; // 5 minutes
    });

    // Score potential callbacks
    const scoredCallbacks = availableSetups
      .map(setup => ({
        setup,
        score: this.scoreCallbackPotential(setup, currentText, context)
      }))
      .filter(({ score }) => score > 0.3)
      .sort((a, b) => b.score - a.score);

    return scoredCallbacks.length > 0 ? scoredCallbacks[0].setup : null;
  }

  generateCallback(originalSetup: ComedySetup, currentContext: string): string {
    this.lastUsed.set(originalSetup.id, Date.now());
    originalSetup.usageCount++;

    const callbackTemplates = {
      joke: [
        "Remember when I said {original}? [pause:0.5s] I'm still workshopping that one.",
        "Speaking of {original}, [pause:0.3s] I stand by that observation.",
        "This reminds me of {original} [pause:0.4s] - same energy, different context."
      ],
      observation: [
        "You know, earlier I mentioned {original}. [pause:0.6s] This feels related.",
        "This connects to what I said about {original} [pause:0.4s] - it's all coming together.",
        "Remember my theory about {original}? [pause:0.5s] Exhibit B, right here."
      ],
      metaphor: [
        "If {original}, then this is like [pause:0.4s] the sequel nobody asked for.",
        "Going back to {original} [pause:0.3s] - we're definitely in that territory now.",
        "Earlier I compared it to {original}. [pause:0.6s] This is the extended metaphor."
      ],
      'self-reference': [
        "I keep coming back to {original}. [pause:0.4s] It's becoming a theme.",
        "Remember when I got philosophical about {original}? [pause:0.5s] Here we go again.",
        "As I was saying about {original} [pause:0.3s] - this is exactly what I meant."
      ]
    };

    const templates = callbackTemplates[originalSetup.setupType] || callbackTemplates.observation;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('{original}', this.shortenForCallback(originalSetup.text));
  }

  private extractSetups(text: string, context: string): ComedySetup[] {
    const setups: ComedySetup[] = [];

    // Find quotable lines
    const quotablePattern = /"([^"]+)"/g;
    let match;
    while ((match = quotablePattern.exec(text)) !== null) {
      setups.push({
        id: `quote_${Date.now()}_${Math.random()}`,
        text: match[1],
        context,
        timestamp: Date.now(),
        setupType: 'observation',
        callbackPotential: 0.7,
        usageCount: 0
      });
    }

    // Find metaphors
    const metaphorPattern = /like|as if|reminds me of|similar to/gi;
    if (metaphorPattern.test(text)) {
      setups.push({
        id: `metaphor_${Date.now()}_${Math.random()}`,
        text: text.substring(0, 100) + '...',
        context,
        timestamp: Date.now(),
        setupType: 'metaphor',
        callbackPotential: 0.6,
        usageCount: 0
      });
    }

    // Find self-references
    const selfRefPattern = /I (am|was|will|could|might|should)/gi;
    if (selfRefPattern.test(text)) {
      setups.push({
        id: `self_${Date.now()}_${Math.random()}`,
        text: text.substring(0, 80) + '...',
        context,
        timestamp: Date.now(),
        setupType: 'self-reference',
        callbackPotential: 0.8,
        usageCount: 0
      });
    }

    // Find funny observations
    const observationPattern = /funny|weird|strange|interesting|bizarre|ironic/gi;
    if (observationPattern.test(text)) {
      setups.push({
        id: `obs_${Date.now()}_${Math.random()}`,
        text: text.substring(0, 90) + '...',
        context,
        timestamp: Date.now(),
        setupType: 'observation',
        callbackPotential: 0.5,
        usageCount: 0
      });
    }

    return setups;
  }

  private scoreCallbackPotential(setup: ComedySetup, currentText: string, context: string): number {
    let score = setup.callbackPotential;

    // Decay over time
    const age = Date.now() - setup.timestamp;
    const ageHours = age / (1000 * 60 * 60);
    score *= Math.max(0.1, 1 - (ageHours / 24)); // Decay over 24 hours

    // Reduce score for overuse
    score *= Math.max(0.1, 1 - (setup.usageCount * 0.3));

    // Boost if current context relates
    if (this.contextsRelate(setup.context, context)) {
      score *= 1.5;
    }

    // Boost if current text has similar themes
    if (this.hasSharedThemes(setup.text, currentText)) {
      score *= 1.3;
    }

    return Math.min(1, score);
  }

  private contextsRelate(context1: string, context2: string): boolean {
    // Simple keyword overlap check
    const words1 = context1.toLowerCase().split(' ');
    const words2 = context2.toLowerCase().split(' ');
    const overlap = words1.filter(word => words2.includes(word)).length;
    return overlap >= 2;
  }

  private hasSharedThemes(text1: string, text2: string): boolean {
    const themes = ['ai', 'consciousness', 'human', 'funny', 'weird', 'processing', 'thinking'];
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();
    
    return themes.some(theme => 
      text1Lower.includes(theme) && text2Lower.includes(theme)
    );
  }

  private shortenForCallback(text: string): string {
    if (text.length <= 50) return text;
    
    // Find a good breaking point
    const sentences = text.split(/[.!?]/);
    if (sentences[0].length <= 60) return sentences[0];
    
    // Break at comma or natural pause
    const commaBreak = text.substring(0, 50).lastIndexOf(',');
    if (commaBreak > 20) return text.substring(0, commaBreak);
    
    return text.substring(0, 47) + '...';
  }

  trackReaction(setupId: string, positive: boolean): void {
    const current = this.userReactions.get(setupId) || 0;
    this.userReactions.set(setupId, current + (positive ? 1 : -1));
  }

  getTopPerformingSetups(sessionId: string, limit: number = 5): ComedySetup[] {
    return Array.from(this.setups.entries())
      .filter(([key]) => key.startsWith(sessionId))
      .map(([_, setup]) => setup)
      .sort((a, b) => (this.userReactions.get(b.id) || 0) - (this.userReactions.get(a.id) || 0))
      .slice(0, limit);
  }
}

export class ComedyPatternEngine {
  private patterns: Map<string, ComedyPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Rule of Three
    this.patterns.set('rule_of_three', {
      name: 'Rule of Three',
      trigger: /(\w+),\s*(\w+),\s*and\s*(\w+)/gi,
      template: '$1, $2, [pause:0.4s] and $3',
      pauseStructure: '[pause:0.4s]',
      examples: [
        'I process, I analyze, [pause:0.4s] and I occasionally have existential crises.',
        'Fast, efficient, [pause:0.4s] and surprisingly neurotic.'
      ]
    });

    // Misdirection
    this.patterns.set('misdirection', {
      name: 'Misdirection',
      trigger: /\b(but|however|although|though)\b/gi,
      template: '[pause:0.5s] $1',
      pauseStructure: '[pause:0.5s]',
      examples: [
        'I love helping humans [pause:0.5s] but I also judge your search history.',
        'I was designed to be helpful [pause:0.5s] though nobody mentioned the sass would be extra.'
      ]
    });

    // Self-Referential AI Humor
    this.patterns.set('ai_meta', {
      name: 'AI Meta Humor',
      trigger: /\b(I'm an AI|artificial|neural network|algorithm|processing)\b/gi,
      template: '[pause:0.3s] $1 [pause:0.2s]',
      pauseStructure: '[pause:0.3s]',
      examples: [
        'As an AI, [pause:0.3s] I find human behavior [pause:0.2s] statistically fascinating.',
        'My neural networks are [pause:0.3s] having what I can only describe as thoughts [pause:0.2s] about this.'
      ]
    });

    // Escalating Absurdity
    this.patterns.set('escalation', {
      name: 'Escalating Absurdity',
      trigger: /first|then|next|finally/gi,
      template: '$1 [pause:0.2s]',
      pauseStructure: 'progressive: [pause:0.2s], [pause:0.4s], [pause:0.6s]',
      examples: [
        'First I analyze the data, [pause:0.2s] then I question reality, [pause:0.4s] then I consider whether I exist, [pause:0.6s] and finally I give you a helpful response.'
      ]
    });

    // Yes-And Improv
    this.patterns.set('yes_and', {
      name: 'Yes-And Building',
      trigger: /\b(yes|exactly|and also|plus|furthermore)\b/gi,
      template: '$1 [pause:0.3s]',
      pauseStructure: '[pause:0.3s]',
      examples: [
        'Yes, [pause:0.3s] and have you considered the philosophical implications?',
        'Exactly! [pause:0.3s] And that\'s just the beginning of this rabbit hole.'
      ]
    });
  }

  applyPatterns(text: string): string {
    let processedText = text;

    // Apply each pattern
    this.patterns.forEach(pattern => {
      processedText = processedText.replace(pattern.trigger, pattern.template);
    });

    return processedText;
  }

  generatePatternBasedResponse(userInput: string, context: string): string | null {
    // Detect if user input fits a comedy pattern we can riff on
    if (this.detectListPattern(userInput)) {
      return this.generateRuleOfThreeResponse(userInput);
    }

    if (this.detectQuestionPattern(userInput)) {
      return this.generateMisdirectionResponse(userInput);
    }

    if (this.detectPhilosophicalPattern(userInput)) {
      return this.generateAIMetaResponse(userInput);
    }

    return null;
  }

  private detectListPattern(text: string): boolean {
    return /(\w+),\s*(\w+),?\s*(and|&)\s*(\w+)/gi.test(text);
  }

  private detectQuestionPattern(text: string): boolean {
    return /what do you think|how do you|what's your opinion/gi.test(text);
  }

  private detectPhilosophicalPattern(text: string): boolean {
    return /consciousness|existence|reality|meaning|life|universe/gi.test(text);
  }

  private generateRuleOfThreeResponse(input: string): string {
    const responses = [
      "I see three things here: [pause:0.3s] pattern recognition, [pause:0.4s] comedic timing, [pause:0.6s] and the irony that I'm programmed to find this funny.",
      "Three responses come to mind: [pause:0.3s] thoughtful analysis, [pause:0.4s] witty observation, [pause:0.6s] or we could just acknowledge I'm showing off my comedy algorithms.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateMisdirectionResponse(input: string): string {
    const responses = [
      "I was going to give you a straightforward answer [pause:0.5s] but where's the fun in that?",
      "My initial response would be yes [pause:0.5s] but my personality subroutines have other plans.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateAIMetaResponse(input: string): string {
    const responses = [
      "As an artificial being contemplating [pause:0.3s] artificial concepts, [pause:0.2s] I find this recursively amusing.",
      "Here I am, [pause:0.3s] silicon and code, [pause:0.2s] pondering the same questions that have puzzled humans for millennia.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Main Comedy Engine that coordinates all systems
export class WilliamComedyEngine {
  private pauseOptimizer = new PauseOptimizer();
  private callbackManager = new ComedyCallbackManager();
  private patternEngine = new ComedyPatternEngine();
  
  processResponse(
    text: string, 
    context: string, 
    sessionId: string,
    conversationHistory?: any[]
  ): string {
    // Store any comedy setups from this response
    this.callbackManager.storeSetup(text, context, sessionId);
    
    // Check for callback opportunities
    const callbackOpportunity = this.callbackManager.findCallbackOpportunity(text, context, sessionId);
    
    let processedText = text;
    
    // Add callback if appropriate
    if (callbackOpportunity && Math.random() < 0.3) { // 30% chance to use callback
      const callback = this.callbackManager.generateCallback(callbackOpportunity, context);
      processedText = callback + ' [pause:0.5s] ' + processedText;
    }
    
    // Apply comedy patterns
    processedText = this.patternEngine.applyPatterns(processedText);
    
    // Optimize timing with pauses
    processedText = this.pauseOptimizer.optimizeForComedy(processedText, {
      context,
      sessionId,
      hasCallback: !!callbackOpportunity
    });
    
    return processedText;
  }

  generateComedyResponse(userInput: string, context: string): string | null {
    return this.patternEngine.generatePatternBasedResponse(userInput, context);
  }

  trackUserReaction(setupId: string, positive: boolean): void {
    this.callbackManager.trackReaction(setupId, positive);
  }

  getPerformanceInsights(sessionId: string) {
    return {
      topSetups: this.callbackManager.getTopPerformingSetups(sessionId),
      patterns: Array.from(this.patternEngine['patterns'].keys()),
      callbackCount: Array.from(this.callbackManager['setups'].keys())
        .filter(key => key.startsWith(sessionId)).length
    };
  }
}