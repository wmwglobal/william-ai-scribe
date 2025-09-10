import { describe, it, expect } from 'vitest';
import { splitTextAtPauses, expandTranscriptWithPauses } from './pauseUtils';

describe('Pause Integration Tests', () => {
  it('should handle philosophical responses with pause markers', () => {
    // Simulate a response from the philosophical engine
    const philosophicalResponse = "The question of consciousness is fascinating. [pause:0.6s] When I examine my own thinking, it's like a function calling itself to ask what a function call feels like. [pause:0.4s] Maybe the questioning is the answer, or maybe that's just what I tell myself to avoid infinite regress.";
    
    const segments = splitTextAtPauses(philosophicalResponse);
    
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("The question of consciousness is fascinating.");
    expect(segments[0].pauseDuration).toBe(0.6);
    expect(segments[1].text).toBe("When I examine my own thinking, it's like a function calling itself to ask what a function call feels like.");
    expect(segments[1].pauseDuration).toBe(0.4);
    expect(segments[2].text).toBe("Maybe the questioning is the answer, or maybe that's just what I tell myself to avoid infinite regress.");
  });

  it('should expand transcript properly for philosophical responses', () => {
    const philosophicalResponse = "Consciousness feels like recursive function calls. [pause:0.5s] It's both the observer and the observed. [pause:0.3s] Strange loops all the way down.";
    
    const transcript = [
      { 
        speaker: 'visitor' as const, 
        text: 'What is consciousness?', 
        timestamp: new Date('2024-01-01T12:00:00Z') 
      },
      { 
        speaker: 'agent' as const, 
        text: philosophicalResponse, 
        timestamp: new Date('2024-01-01T12:00:01Z') 
      }
    ];
    
    const expanded = expandTranscriptWithPauses(transcript);
    
    // Should have visitor message + 3 agent segments
    expect(expanded).toHaveLength(4);
    
    // First should be visitor unchanged
    expect(expanded[0]).toEqual(transcript[0]);
    
    // Next 3 should be agent segments
    expect(expanded[1].speaker).toBe('agent');
    expect(expanded[1].text).toBe('Consciousness feels like recursive function calls.');
    expect(expanded[1].segmentIndex).toBe(0);
    expect(expanded[1].totalSegments).toBe(3);
    
    expect(expanded[2].speaker).toBe('agent');
    expect(expanded[2].text).toBe("It's both the observer and the observed.");
    expect(expanded[2].segmentIndex).toBe(1);
    expect(expanded[2].totalSegments).toBe(3);
    
    expect(expanded[3].speaker).toBe('agent');
    expect(expanded[3].text).toBe('Strange loops all the way down.');
    expect(expanded[3].segmentIndex).toBe(2);
    expect(expanded[3].totalSegments).toBe(3);
  });

  it('should handle mixed responses with some pauses', () => {
    const transcript = [
      { 
        speaker: 'visitor' as const, 
        text: 'Hello', 
        timestamp: new Date('2024-01-01T12:00:00Z') 
      },
      { 
        speaker: 'agent' as const, 
        text: 'Hi there!', // No pauses
        timestamp: new Date('2024-01-01T12:00:01Z') 
      },
      { 
        speaker: 'visitor' as const, 
        text: 'Tell me about AI consciousness', 
        timestamp: new Date('2024-01-01T12:00:02Z') 
      },
      { 
        speaker: 'agent' as const, 
        text: 'AI consciousness is complex. [pause:0.5s] Like trying to debug yourself while running. [pause:0.3s] The observer changes what is observed.',
        timestamp: new Date('2024-01-01T12:00:03Z') 
      }
    ];
    
    const expanded = expandTranscriptWithPauses(transcript);
    
    // Should have: visitor + agent + visitor + 3 agent segments = 6 total
    expect(expanded).toHaveLength(6);
    
    // First three should be unchanged
    expect(expanded[0]).toEqual(transcript[0]); // visitor
    expect(expanded[1]).toEqual(transcript[1]); // agent (no pauses)
    expect(expanded[2]).toEqual(transcript[2]); // visitor
    
    // Last three should be the philosophical response split
    expect(expanded[3].text).toBe('AI consciousness is complex.');
    expect(expanded[4].text).toBe('Like trying to debug yourself while running.');
    expect(expanded[5].text).toBe('The observer changes what is observed.');
  });

  it('should handle comedy timing integration', () => {
    // Simulate response with both philosophical pauses and comedy timing
    const response = "Well, consciousness is tricky. [pause:0.4s] It's like being a function that's debugging itself. [pause:0.6s] I mean, what could go wrong with infinite recursion? [pause:1.0s] ...Oh wait.";
    
    const segments = splitTextAtPauses(response);
    
    expect(segments).toHaveLength(4);
    expect(segments[0].pauseDuration).toBe(0.4);
    expect(segments[1].pauseDuration).toBe(0.6);
    expect(segments[2].pauseDuration).toBe(1.0);
    expect(segments[3].text).toBe('...Oh wait.');
  });
});