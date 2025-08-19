// Curiosity trigger detection functions
export interface CuriosityTrigger {
  type: 'ambiguity' | 'surprising_claim' | 'timeline_gap' | 'missing_metric' | 'contradiction' | 'callback_opportunity';
  confidence: number;
  reason: string;
  followup_suggestion: string;
}

export function detectCuriosityTriggers(userMessage: string, conversationHistory: any[]): CuriosityTrigger[] {
  const triggers: CuriosityTrigger[] = [];
  const text = userMessage.toLowerCase();
  
  // Ambiguity detection
  const ambiguityPatterns = [
    /we're working on (something|things|stuff|it)/i,
    /it's (kind of|sort of|somewhat|pretty|fairly)/i,
    /we have (some|a few|several) (issues|problems|challenges)/i,
    /(maybe|perhaps|probably|might) (work|help|be)/i
  ];
  
  ambiguityPatterns.forEach(pattern => {
    if (pattern.test(userMessage)) {
      triggers.push({
        type: 'ambiguity',
        confidence: 0.7,
        reason: 'Vague language detected',
        followup_suggestion: 'Ask for specific details about what they mentioned'
      });
    }
  });

  // Surprising claims detection
  const surprisingPatterns = [
    /(\d+)% (increase|improvement|growth)/i,
    /(first|only|never) (company|person|team)/i,
    /(billion|million) (users|dollars|customers)/i,
    /(breakthrough|revolutionary|unprecedented)/i
  ];
  
  surprisingPatterns.forEach(pattern => {
    if (pattern.test(userMessage)) {
      triggers.push({
        type: 'surprising_claim',
        confidence: 0.8,
        reason: 'Potentially significant claim made',
        followup_suggestion: 'Ask for more context or validation of the claim'
      });
    }
  });

  // Timeline gap detection
  const timelinePatterns = [
    /(last year|6 months ago|recently) we (started|launched|built)/i,
    /(now|currently) we're (working|building|developing)/i,
    /(next|planning to|will) (launch|release|ship)/i
  ];
  
  if (timelinePatterns.some(p => p.test(userMessage))) {
    const hasTimelineDetails = /(january|february|march|april|may|june|july|august|september|october|november|december|q1|q2|q3|q4|\d{4})/i.test(userMessage);
    if (!hasTimelineDetails) {
      triggers.push({
        type: 'timeline_gap',
        confidence: 0.6,
        reason: 'Timeline mentioned without specific dates',
        followup_suggestion: 'Ask for specific timeline details or milestones'
      });
    }
  }

  // Missing metrics detection
  const metricMentions = [
    /(users|customers|revenue|growth|performance)/i,
    /(fast|slow|good|bad|better|worse)/i,
    /(successful|failed|working|broken)/i
  ];
  
  if (metricMentions.some(p => p.test(userMessage))) {
    const hasNumbers = /\d+(\.\d+)?[%$kmb]?/i.test(userMessage);
    if (!hasNumbers) {
      triggers.push({
        type: 'missing_metric',
        confidence: 0.7,
        reason: 'Qualitative claims without quantitative backing',
        followup_suggestion: 'Ask for specific numbers or metrics'
      });
    }
  }

  // Contradiction detection (with conversation history)
  if (conversationHistory.length > 0) {
    const pastMessages = conversationHistory
      .filter(msg => msg.speaker === 'visitor')
      .map(msg => msg.text.toLowerCase())
      .join(' ');
    
    // Simple contradiction patterns
    const contradictionChecks = [
      { current: /we don't have/, past: /we have/ },
      { current: /we're not/, past: /we are/ },
      { current: /never/, past: /always|usually|often/ },
      { current: /small (team|company)/, past: /(large|big) (team|company)/ }
    ];
    
    contradictionChecks.forEach(check => {
      if (check.current.test(text) && check.past.test(pastMessages)) {
        triggers.push({
          type: 'contradiction',
          confidence: 0.6,
          reason: 'Potential contradiction with earlier statements',
          followup_suggestion: 'Clarify the apparent contradiction diplomatically'
        });
      }
    });
  }

  return triggers;
}

export function detectCallbackOpportunities(userMessage: string, memories: any[]): CuriosityTrigger[] {
  const triggers: CuriosityTrigger[] = [];
  
  if (!memories || memories.length === 0) return triggers;
  
  const text = userMessage.toLowerCase();
  
  // Look for opportunities to reference past conversations
  memories.forEach(memory => {
    const memoryText = (memory.summary || '').toLowerCase();
    const memoryTags = memory.tags || [];
    
    // Topic overlap detection
    const topicOverlap = memoryTags.some(tag => 
      text.includes(tag.toLowerCase()) || 
      tag.toLowerCase().split(' ').some(word => text.includes(word))
    );
    
    if (topicOverlap) {
      triggers.push({
        type: 'callback_opportunity',
        confidence: 0.8,
        reason: `Similar topic discussed: ${memoryTags.join(', ')}`,
        followup_suggestion: `Reference the previous discussion about ${memoryTags[0]} and build on it`
      });
    }
  });
  
  return triggers;
}

export function generateConversationDynamics(
  triggers: CuriosityTrigger[], 
  messageCount: number,
  lastPerspectiveShift: number = 0
): string {
  let dynamics = '';
  
  // Curiosity triggers
  const highConfidenceTriggers = triggers.filter(t => t.confidence >= 0.7);
  if (highConfidenceTriggers.length > 0) {
    const trigger = highConfidenceTriggers[0]; // Use the first high-confidence trigger
    dynamics += `\n\nCURIOSITY TRIGGER DETECTED (${trigger.type}): ${trigger.followup_suggestion}`;
  }
  
  // Callback opportunities
  const callbacks = triggers.filter(t => t.type === 'callback_opportunity');
  if (callbacks.length > 0 && messageCount % 5 === 0) { // Every 5th message
    dynamics += `\n\nCALLBACK OPPORTUNITY: ${callbacks[0].followup_suggestion}`;
  }
  
  // Perspective shifts (every 8-10 messages, with cooldown)
  const shouldPerspectiveShift = messageCount > 6 && 
    (messageCount - lastPerspectiveShift) >= 8 && 
    Math.random() < 0.3; // 30% chance when conditions are met
    
  if (shouldPerspectiveShift) {
    dynamics += `\n\nPERSPECTIVE SHIFT: Consider offering a contrarian view or alternative angle to spark deeper thinking. Be thoughtful and constructive.`;
  }
  
  return dynamics;
}