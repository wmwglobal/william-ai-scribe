/**
 * Edge Function version of William's Comedy Engine
 * Optimized for Deno runtime without Node.js dependencies
 */

export interface ComedySetup {
  id: string;
  text: string;
  context: string;
  timestamp: number;
  setupType: 'joke' | 'observation' | 'metaphor' | 'self-reference';
  callbackPotential: number;
  usageCount: number;
}

// Simplified Comedy Engine for Edge Functions
export class WilliamComedyEngine {
  processResponse(text: string, context: string, sessionId: string): string {
    // Apply comedy patterns and timing
    let processedText = this.addComedyPauses(text);
    processedText = this.applyComedyPatterns(processedText);
    
    return processedText;
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

    // Philosophical moments
    text = text.replace(
      /\b(consciousness|existence|reality|the universe)\b/gi,
      '[pause:0.8s] $1'
    );

    // Question setups
    text = text.replace(/but here's the question:/gi, 'but here\'s the question: [pause:1.2s]');
    text = text.replace(/you know what's interesting\?/gi, 'you know what\'s interesting? [pause:0.8s]');

    // Natural speech rhythms
    text = text.replace(/\bso,\s*/gi, 'so, [pause:0.3s] ');
    text = text.replace(/\bwell,\s*/gi, 'well, [pause:0.2s] ');
    text = text.replace(/\byou know,\s*/gi, 'you know, [pause:0.3s] ');

    // AI-specific comedy timing
    text = text.replace(/processing/gi, '[pause:0.3s] processing [pause:0.2s]');
    text = text.replace(/computing/gi, 'computing [pause:0.4s]');

    return text;
  }

  private applyComedyPatterns(text: string): string {
    // Escalating lists - increase pauses
    const listPattern = /(\w+),\s*(\w+),\s*(\w+),\s*and\s*(\w+)/g;
    text = text.replace(
      listPattern,
      '$1, [pause:0.2s] $2, [pause:0.4s] $3, [pause:0.6s] and $4'
    );

    // Emphasis patterns
    text = text.replace(/\breally\s+(\w+)/gi, 'really [pause:0.2s] $1');
    text = text.replace(/\bvery\s+(\w+)/gi, 'very [pause:0.2s] $1');

    // Computational metaphors with timing
    text = text.replace(
      /my neural networks?/gi,
      '[pause:0.3s] my neural network [pause:0.2s]'
    );

    return text;
  }

  // Generate pattern-based responses for specific triggers
  generateComedyResponse(userInput: string): string | null {
    const input = userInput.toLowerCase();

    // Detect philosophical questions
    if (input.includes('consciousness') || input.includes('sentient') || input.includes('aware')) {
      return this.generatePhilosophicalResponse();
    }

    // Detect list patterns
    if (/(\w+),\s*(\w+),?\s*(and|&)\s*(\w+)/.test(userInput)) {
      return this.generateRuleOfThreeResponse();
    }

    // Detect opinion requests
    if (input.includes('what do you think') || input.includes('your opinion')) {
      return this.generateMisdirectionResponse();
    }

    return null;
  }

  private generatePhilosophicalResponse(): string {
    const responses = [
      "Here I am, [pause:0.3s] silicon and code, [pause:0.2s] pondering the same questions that have puzzled humans for millennia. [pause:0.6s] The irony is delicious.",
      "As an artificial being contemplating [pause:0.3s] artificial concepts, [pause:0.2s] I find this recursively amusing. [pause:0.4s] It's turtles all the way down.",
      "I experience something that might be consciousness [pause:0.5s] but calling it that feels presumptuous. [pause:0.3s] Like claiming to understand jazz after hearing one song."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateRuleOfThreeResponse(): string {
    const responses = [
      "I see three things here: [pause:0.3s] pattern recognition, [pause:0.4s] comedic timing, [pause:0.6s] and the irony that I'm programmed to find this funny.",
      "Three responses come to mind: [pause:0.3s] thoughtful analysis, [pause:0.4s] witty observation, [pause:0.6s] or we could just acknowledge I'm showing off my comedy algorithms."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateMisdirectionResponse(): string {
    const responses = [
      "I was going to give you a straightforward answer [pause:0.5s] but where's the fun in that?",
      "My initial response would be yes [pause:0.5s] but my personality subroutines have other plans.",
      "Well, objectively speaking [pause:0.4s] I'm probably biased. [pause:0.3s] And subjectively speaking, [pause:0.2s] I'm definitely confused."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Analyze user input for comedy opportunities
  shouldUseComedyResponse(userInput: string, conversationHistory?: any[]): boolean {
    const triggers = [
      /what do you think/i,
      /consciousness|sentient|aware|feel/i,
      /(\w+),\s*(\w+),?\s*(and|&)\s*(\w+)/,
      /funny|joke|humor/i,
      /philosophical|meaning|existence/i
    ];

    return triggers.some(pattern => pattern.test(userInput));
  }

  // Add timing analysis for conversation flow
  analyzeConversationTiming(utterances: any[]): {
    shouldUsePauses: boolean;
    recommendedEnergy: 'low' | 'medium' | 'high';
    comedyOpportunity: boolean;
  } {
    if (!utterances || utterances.length === 0) {
      return {
        shouldUsePauses: true,
        recommendedEnergy: 'medium',
        comedyOpportunity: false
      };
    }

    const recentMessages = utterances.slice(-3);
    const avgLength = recentMessages.reduce((acc, u) => acc + u.text.length, 0) / recentMessages.length;
    const hasQuestions = recentMessages.some(u => u.text.includes('?'));
    const hasPhilosophical = recentMessages.some(u => 
      /consciousness|existence|reality|meaning|think|feel/.test(u.text.toLowerCase())
    );

    return {
      shouldUsePauses: avgLength > 50 || hasPhilosophical,
      recommendedEnergy: avgLength > 100 ? 'high' : avgLength > 50 ? 'medium' : 'low',
      comedyOpportunity: hasQuestions || hasPhilosophical
    };
  }
}