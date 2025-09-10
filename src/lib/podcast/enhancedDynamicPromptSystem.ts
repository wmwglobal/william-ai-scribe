/**
 * Enhanced Dynamic Prompt System with Demo Integration
 * Extends the base system to incorporate demo scripts
 */

import { DynamicPromptSystem, type DynamicContext } from './dynamicPromptSystem';
import { demoSystem, type DemoScript } from './demos';
import type { ConversationContext, ConversationMode } from './consciousness';

export class EnhancedDynamicPromptSystem extends DynamicPromptSystem {
  private demoIntegrationEnabled: boolean = true;
  private demosUsedInSession: Map<string, number> = new Map();
  private lastDemoTimestamp: number = 0;
  
  constructor() {
    super();
    this.initializeDemoSystem();
  }
  
  /**
   * Initialize the demo system with default scripts
   */
  private async initializeDemoSystem() {
    try {
      // Load demos from file if available
      const response = await fetch('/src/lib/podcast/demos/essential-demos.txt');
      if (response.ok) {
        const text = await response.text();
        await demoSystem.loadFromText(text);
      }
    } catch (error) {
      console.log('Using default demo scripts');
      // Use default demos from the system
      const { DEFAULT_DEMO_SCRIPTS } = await import('./demos');
      await demoSystem.initialize(DEFAULT_DEMO_SCRIPTS);
    }
  }
  
  /**
   * Override base generatePrompt to include demo integration
   */
  async generatePrompt(
    input: string,
    context: ConversationContext,
    dynamicContext: DynamicContext
  ): Promise<{
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    parameters: Record<string, unknown>;
    demosUsed?: string[];
    behavioralGuidance?: string;
  }> {
    // Get base prompt from parent
    const baseResult = super.generatePrompt(input, context, dynamicContext);
    
    if (!this.demoIntegrationEnabled) {
      return baseResult;
    }
    
    // Check if enough time has passed since last demo (avoid overuse)
    const timeSinceLastDemo = Date.now() - this.lastDemoTimestamp;
    const shouldUseDemos = timeSinceLastDemo > 30000; // 30 seconds minimum between demos
    
    if (!shouldUseDemos) {
      return baseResult;
    }
    
    // Get enhanced prompt with demos
    const enhancement = await demoSystem.getEnhancedPrompt(
      baseResult.systemPrompt,
      input,
      context,
      dynamicContext
    );
    
    // Track demo usage
    if (enhancement.demos_used.length > 0) {
      this.lastDemoTimestamp = Date.now();
      enhancement.demos_used.forEach(demoId => {
        const count = this.demosUsedInSession.get(demoId) || 0;
        this.demosUsedInSession.set(demoId, count + 1);
      });
    }
    
    return {
      ...baseResult,
      systemPrompt: enhancement.prompt,
      demosUsed: enhancement.demos_used,
      behavioralGuidance: enhancement.guidance
    };
  }
  
  /**
   * Track demo performance after response
   */
  async trackDemoPerformance(
    demosUsed: string[],
    userResponse: string,
    engagement: number
  ) {
    if (demosUsed && demosUsed.length > 0) {
      await demoSystem.trackPerformance(demosUsed, userResponse, engagement);
    }
  }
  
  /**
   * Get demo recommendations for current context
   */
  async getDemoRecommendations(context: ConversationContext) {
    return demoSystem.getRecommendations(context);
  }
  
  /**
   * Toggle demo integration on/off
   */
  setDemoIntegration(enabled: boolean) {
    this.demoIntegrationEnabled = enabled;
  }
  
  /**
   * Get demo usage statistics
   */
  getDemoStats() {
    return {
      demosUsedInSession: Array.from(this.demosUsedInSession.entries()),
      performanceSummary: demoSystem.getPerformanceSummary(),
      timeSinceLastDemo: Date.now() - this.lastDemoTimestamp
    };
  }
}