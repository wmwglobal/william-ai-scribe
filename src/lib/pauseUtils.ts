/**
 * Utility functions for handling pause markers in chat responses
 */

export interface ChatSegment {
  text: string;
  pauseDuration?: number;
}

/**
 * Split text at pause markers into separate segments
 * Each segment becomes its own chat bubble
 */
export function splitTextAtPauses(text: string): ChatSegment[] {
  if (!text || typeof text !== 'string') {
    return [{ text: text || '' }];
  }

  // Regex to match pause markers like [pause:0.5s], [pause:2s], etc.
  const pauseRegex = /\s*\[pause:(\d+(?:\.\d+)?)s?\]\s*/gi;
  
  const segments: ChatSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pauseRegex.exec(text)) !== null) {
    const beforePause = text.slice(lastIndex, match.index).trim();
    
    if (beforePause) {
      segments.push({ 
        text: beforePause,
        pauseDuration: parseFloat(match[1])
      });
    }
    
    lastIndex = pauseRegex.lastIndex;
  }
  
  // Add remaining text after last pause
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    segments.push({ text: remainingText });
  }
  
  // If no pauses found, return the entire text as one segment
  if (segments.length === 0 && text.trim()) {
    segments.push({ text: text.trim() });
  }
  
  return segments;
}

/**
 * Create expanded transcript entries with pause-based segments
 */
export function expandTranscriptWithPauses(
  originalTranscript: Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date}>
): Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date, segmentIndex?: number, totalSegments?: number}> {
  const expandedTranscript: Array<{
    speaker: 'visitor' | 'agent', 
    text: string, 
    timestamp: Date, 
    segmentIndex?: number, 
    totalSegments?: number
  }> = [];

  originalTranscript.forEach(entry => {
    if (entry.speaker === 'agent') {
      const segments = splitTextAtPauses(entry.text);
      
      if (segments.length > 1) {
        // Multiple segments - create separate entries for each
        segments.forEach((segment, index) => {
          if (segment.text.trim()) {
            expandedTranscript.push({
              speaker: entry.speaker,
              text: segment.text,
              timestamp: new Date(entry.timestamp.getTime() + (index * 1000)), // Offset by 1s per segment
              segmentIndex: index,
              totalSegments: segments.length
            });
          }
        });
      } else {
        // Single segment or no pauses - keep as original
        expandedTranscript.push(entry);
      }
    } else {
      // Visitor messages - keep as-is
      expandedTranscript.push(entry);
    }
  });

  return expandedTranscript;
}