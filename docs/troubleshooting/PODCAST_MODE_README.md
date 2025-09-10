# Podcast Mode Integration Guide

## Overview
This system transforms your William AI voice chat into a sophisticated podcast co-host with philosophical depth, comedy timing, and genuine personality through a tri-layered consciousness model.

## Architecture

### 🧠 Tri-Layered Consciousness Model

1. **Conversational Layer** - Direct response handling
2. **Meta-Cognitive Layer** - Tracks themes, callbacks, and conversation arcs  
3. **Performance Layer** - Manages entertainment, timing, and audience awareness

### Key Components

```typescript
// Core Systems
- ConsciousnessController: Orchestrates all three layers
- ConversationStateManager: Tracks state, threads, and show memory
- DynamicPromptSystem: Mode-aware prompt generation
- ResponsePipeline: Multi-stage response processing
```

## Quick Start

### 1. Database Setup

Run the migrations to create required tables:

```sql
-- Apply both migrations in order:
1. apply_action_items_migration.sql
2. 20250105000001_add_podcast_tables.sql
```

### 2. Basic Integration

```typescript
import { usePodcastMode } from '@/hooks/usePodcastMode';

function PodcastChat() {
  const podcast = usePodcastMode(sessionId);
  
  // Start podcast mode
  podcast.startPodcast();
  
  // Process input with full pipeline
  const handleUserInput = async (text: string) => {
    const response = await podcast.processInput(text);
    
    if (response) {
      // response.text - Clean text
      // response.markedText - With timing markers
      // response.timing - Pause/emphasis markers
      // response.metadata - Comedy score, callbacks, etc.
    }
  };
  
  // Switch conversation modes
  podcast.switchMode('philosophical'); // or 'comedy', 'banter', etc.
  
  // Adjust energy level
  podcast.adjustEnergy(2); // Increase energy by 2
}
```

## Conversation Modes

### Available Modes
- **philosophical** - Deep exploration with wonder
- **comedy** - Timed punchlines and callbacks
- **banter** - Quick wit and playful energy
- **storytelling** - Narrative building with tension
- **debate** - Respectful challenging of ideas
- **riffing** - Yes-and improvisational flow
- **segment-transition** - Smooth topic bridges
- **audience-interaction** - Direct inclusive engagement

### Mode-Specific Features

Each mode has:
- Custom temperature settings
- Unique timing patterns
- Specific encouraged/forbidden phrases
- Tailored voice parameters

## Timing Markers

The system injects timing markers for optimal delivery:

```typescript
// Example marked text:
"So here's the thing<pause:400> - and I mean this sincerely<pause:600>... 
<emphasis:high>BOOM</emphasis>! That's when it hit me.<pause:800>"

// Timing types:
<pause:ms> - Pause duration in milliseconds
<emphasis:level> - Emphasis level (low/medium/high)
<speed:rate> - Speech rate adjustment
<voice:params> - Voice parameter overrides
```

## Callback System

The system automatically:
1. Detects callback opportunities in conversation
2. Stores them with quality scores
3. Weaves them naturally into responses
4. Tracks which callbacks have been used

```typescript
// Manual callback registration
podcast.systems.stateManager.registerCallback(
  "that hilarious thing about dolphins",
  "When discussing ocean life",
  9 // quality score
);
```

## Show Memory

Episodes are automatically saved with:
- Best moments and timestamps
- Audience engagement metrics
- Used callbacks and themes
- Overall rating and statistics

```typescript
// Access show history
const memories = podcast.systems.stateManager.getShowMemory();

// Register a memorable moment
podcast.registerMoment(
  'comedy', // type
  'The dolphin callback that killed',
  'During ocean discussion'
);
```

## WebSocket Events

Real-time state synchronization:

```typescript
// Broadcasted events:
- mode-change: Mode switches
- context-update: Context changes
- moment-registered: New memorable moments
- callback-available: New callback opportunities
- segment-change: Conversation segment transitions
- engagement-update: Audience engagement changes

// Remote commands supported:
- Mode switching
- Energy adjustments  
- Moment registration
- Callback usage
```

## Performance Optimization

### Pacing Control
```typescript
podcast.systems.stateManager.updatePacing({
  wordsPerMinute: 160,
  pauseFrequency: 0.3,
  energyLevel: 7,
  varietyScore: 8
});
```

### Audience Engagement
The system tracks and responds to engagement:
- Low (<4): Injects energy, switches topics
- Medium (4-7): Maintains current approach
- High (>7): Sustains momentum

## Advanced Usage

### Custom Personality Evolution

```typescript
// The personality evolves based on conversation
const profile = podcast.systems.promptSystem.getPersonalityProfile();
// Map<trait, strength> showing emerged personality traits
```

### Thread Management

```typescript
// Start new conversation thread
podcast.systems.stateManager.startNewThread("AI Ethics");

// Threads automatically branch on topic changes
// Access thread history
const threads = podcast.systems.stateManager.getThreads();
```

### Custom Pipeline Stages

```typescript
// Add custom processing stage
podcast.systems.pipeline.addStage({
  name: 'custom-filter',
  priority: 6,
  enabled: true,
  process: async (text, context) => {
    // Custom processing
    return modifiedText;
  }
});
```

## Testing

Test different scenarios:

```typescript
// Philosophy mode test
podcast.switchMode('philosophical');
await podcast.processInput("What if consciousness is just emergent complexity?");

// Comedy callback test  
podcast.systems.stateManager.registerCallback("earlier joke about AI", "context", 10);
await podcast.processInput("Speaking of weird AI behavior...");

// Energy adjustment test
podcast.adjustEnergy(-3); // Lower energy
await podcast.processInput("Let's slow down and think about this...");
```

## Performance Metrics

Track podcast performance:

```typescript
const arc = podcast.getConversationArc();
// Returns: themes explored, segment history, conversation depth

const stats = podcast.podcastState;
// Returns: current mode, engagement, best moments, duration
```

## Troubleshooting

### Low Engagement
- Check variety score
- Increase callback usage
- Switch modes more frequently
- Adjust pacing

### Timing Issues
- Verify TTS system supports pause markers
- Adjust pause durations for your voice model
- Check overall timing in response metadata

### Memory Issues
- Ensure show_memories table exists
- Check Supabase connection
- Verify session ID is valid

## Integration with Existing Voice Chat

The system seamlessly integrates with your existing setup:

1. Uses your current STT/TTS providers
2. Extends rather than replaces voice chat
3. WebSocket layer is optional
4. Can be toggled on/off per session

## Next Steps

1. **Customize William's personality** in `dynamicPromptSystem.ts`
2. **Adjust timing patterns** for your specific voice clone
3. **Add domain-specific callbacks** and themes
4. **Configure WebSocket server** for real-time features
5. **Train audience model** with actual engagement data

The system is designed to evolve with use - William's personality becomes more refined through conversations, creating a unique co-host that grows more engaging over time.