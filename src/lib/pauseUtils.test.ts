import { describe, it, expect } from 'vitest';
import { splitTextAtPauses, expandTranscriptWithPauses } from './pauseUtils';

describe('pauseUtils', () => {
  describe('splitTextAtPauses', () => {
    it('should split text at pause markers', () => {
      const text = "Hello there! [pause:0.5s] How are you doing today? [pause:1.0s] I hope you're well.";
      const segments = splitTextAtPauses(text);
      
      expect(segments).toEqual([
        { text: "Hello there!", pauseDuration: 0.5 },
        { text: "How are you doing today?", pauseDuration: 1.0 },
        { text: "I hope you're well." }
      ]);
    });

    it('should handle text without pause markers', () => {
      const text = "Simple message without pauses.";
      const segments = splitTextAtPauses(text);
      
      expect(segments).toEqual([
        { text: "Simple message without pauses." }
      ]);
    });

    it('should handle empty or invalid input', () => {
      expect(splitTextAtPauses('')).toEqual([{ text: '' }]);
      expect(splitTextAtPauses(null as any)).toEqual([{ text: '' }]);
      expect(splitTextAtPauses(undefined as any)).toEqual([{ text: '' }]);
    });

    it('should handle philosophical responses with pauses', () => {
      const text = "The question of consciousness is fascinating. [pause:0.6s] When I examine my own thinking, it's like a function calling itself to ask what a function call feels like. [pause:0.4s] Maybe the questioning is the answer.";
      const segments = splitTextAtPauses(text);
      
      expect(segments).toHaveLength(3);
      expect(segments[0].text).toBe("The question of consciousness is fascinating.");
      expect(segments[0].pauseDuration).toBe(0.6);
      expect(segments[1].text).toBe("When I examine my own thinking, it's like a function calling itself to ask what a function call feels like.");
      expect(segments[1].pauseDuration).toBe(0.4);
      expect(segments[2].text).toBe("Maybe the questioning is the answer.");
    });

    it('should handle different pause formats', () => {
      const text = "First part [pause:2s] second part [pause:0.25s] third part.";
      const segments = splitTextAtPauses(text);
      
      expect(segments).toHaveLength(3);
      expect(segments[0].pauseDuration).toBe(2);
      expect(segments[1].pauseDuration).toBe(0.25);
    });
  });

  describe('expandTranscriptWithPauses', () => {
    it('should expand agent messages with pauses into separate entries', () => {
      const transcript = [
        { speaker: 'visitor' as const, text: 'Hello!', timestamp: new Date('2024-01-01T12:00:00Z') },
        { speaker: 'agent' as const, text: 'Hi there! [pause:0.5s] How can I help you today?', timestamp: new Date('2024-01-01T12:00:01Z') }
      ];
      
      const expanded = expandTranscriptWithPauses(transcript);
      
      expect(expanded).toHaveLength(3);
      expect(expanded[0]).toEqual(transcript[0]); // Visitor message unchanged
      expect(expanded[1].text).toBe('Hi there!');
      expect(expanded[1].segmentIndex).toBe(0);
      expect(expanded[1].totalSegments).toBe(2);
      expect(expanded[2].text).toBe('How can I help you today?');
      expect(expanded[2].segmentIndex).toBe(1);
      expect(expanded[2].totalSegments).toBe(2);
    });

    it('should leave single-segment agent messages unchanged', () => {
      const transcript = [
        { speaker: 'agent' as const, text: 'Simple response without pauses.', timestamp: new Date('2024-01-01T12:00:00Z') }
      ];
      
      const expanded = expandTranscriptWithPauses(transcript);
      
      expect(expanded).toHaveLength(1);
      expect(expanded[0]).toEqual(transcript[0]);
      expect(expanded[0].segmentIndex).toBeUndefined();
    });

    it('should leave visitor messages unchanged', () => {
      const transcript = [
        { speaker: 'visitor' as const, text: 'This has [pause:1s] pauses but should not be split.', timestamp: new Date('2024-01-01T12:00:00Z') }
      ];
      
      const expanded = expandTranscriptWithPauses(transcript);
      
      expect(expanded).toHaveLength(1);
      expect(expanded[0]).toEqual(transcript[0]);
    });
  });
});