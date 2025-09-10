# Product Specification: William AI Scribe

## Executive Summary

William AI Scribe is an AI-powered voice agent system that enables natural conversational interactions with multiple AI personalities. The system combines real-time speech processing, intelligent lead scoring, and personalized AI responses to create an engaging conversational experience for business development, consulting, and knowledge sharing.

## Problem Definition

### What problem does this solve?

1. **Scalable Personal Engagement**: Enables William MacDonald White to engage with multiple contacts simultaneously through an AI twin
2. **Lead Qualification**: Automatically scores and qualifies leads based on conversation content
3. **Knowledge Accessibility**: Makes 25 years of ML/media tech expertise available 24/7
4. **Conversation Intelligence**: Captures, analyzes, and extracts actionable insights from voice conversations

### Who are the users?

- **Primary Users**: Business leaders, entrepreneurs, and technical professionals seeking AI/ML consultation
- **Secondary Users**: Investors, partners, and potential clients interested in William's expertise
- **Admin Users**: William and his team managing conversations and lead pipeline

## Functional Requirements

### Feature: Voice Chat System

- **Current Implementation**: Real-time voice conversation with AI agent
- **User Story**: As a visitor, I want to have a natural voice conversation with William's AI, so that I can discuss my business needs conversationally
- **Acceptance Criteria**:
  - [ ] Voice input captured with <500ms latency
  - [ ] Speech-to-text transcription accuracy >95% for clear audio
  - [ ] Text-to-speech response generation within 2 seconds
  - [ ] Support for conversation interruption (barge-in)
  - [ ] Automatic voice activity detection
  - [ ] Queue management for audio processing
- **Dependencies**: Groq Whisper API, ElevenLabs TTS, WebRTC audio

### Feature: AI Personality System

- **Current Implementation**: Multiple personality modes with distinct behaviors
- **User Story**: As a visitor, I want to choose different personality modes, so that I can interact with the most relevant version of William
- **Acceptance Criteria**:
  - [ ] At least 5 distinct personalities available
  - [ ] Each personality has unique system prompt
  - [ ] Voice characteristics match personality
  - [ ] Smooth switching between personalities
  - [ ] Personality context maintained during session
- **Available Personalities**:
  1. Entrepreneur - Strategic business focus
  2. Professional - Technical deep dives
  3. Pirate William - Adventurous, story-driven
  4. Casual William - Relaxed, friendly conversation
  5. Coach William - Mentoring and guidance

### Feature: Lead Scoring Engine

- **Current Implementation**: Rule-based scoring with weighted criteria
- **User Story**: As an admin, I want automatic lead scoring, so that I can prioritize high-value opportunities
- **Acceptance Criteria**:
  - [ ] Score calculation based on 10+ criteria
  - [ ] Real-time score updates during conversation
  - [ ] Score range 0-100 with clear thresholds
  - [ ] Reason tracking for score components
  - [ ] Slack notification for high-value leads (score >= 70)
- **Scoring Criteria**:
  - Senior title (+30 points)
  - Budget >= $50k (+20 points)
  - Urgent timeline (+15 points)
  - Warm introduction (+10 points)
  - Strategic alignment (+10 points)
  - Enterprise client (+10 points)
  - Vendor pitch (-15 points)
  - General interest (-10 points)

### Feature: Memory & Knowledge Management

- **Current Implementation**: RAG system with vector search
- **User Story**: As William's AI, I want to remember past conversations and retrieve relevant knowledge, so that I can provide contextual responses
- **Acceptance Criteria**:
  - [ ] Store conversation memories with embeddings
  - [ ] Retrieve relevant memories based on similarity
  - [ ] Maximum 5 memories per query
  - [ ] Memory decay/relevance scoring
  - [ ] Session summarization for long-term storage
- **Dependencies**: Supabase pgvector, OpenAI embeddings

### Feature: Session Management

- **Current Implementation**: Secure session creation and tracking
- **User Story**: As a system, I want to manage conversation sessions, so that I can track and analyze interactions
- **Acceptance Criteria**:
  - [ ] Unique session ID generation
  - [ ] Session secret for authentication
  - [ ] Session state tracking (active/completed)
  - [ ] Utterance storage per session
  - [ ] Session summary generation
  - [ ] Analytics and reporting

### Feature: Admin Dashboard

- **Current Implementation**: Analytics and conversation management interface
- **User Story**: As an admin, I want to view and manage all conversations, so that I can track engagement and follow up on leads
- **Acceptance Criteria**:
  - [ ] Real-time conversation monitoring
  - [ ] Lead score visualization
  - [ ] Conversation transcript access
  - [ ] Extract and entity viewing
  - [ ] Export functionality
  - [ ] Search and filter capabilities

## User Journeys

### Journey 1: First-Time Visitor Conversation

1. **Landing**: Visitor arrives at chat interface
2. **Personality Selection**: Choose from available AI personalities
3. **Initiation**: Click microphone to start conversation
4. **Introduction**: AI greets and asks how it can help
5. **Conversation**: Natural back-and-forth dialogue
6. **Information Extraction**: System captures key entities
7. **Lead Scoring**: Real-time scoring based on conversation
8. **Follow-up**: Email collection if high-value lead
9. **Summary**: Session summarized and stored

### Journey 2: Admin Lead Review

1. **Access Dashboard**: Admin logs into system
2. **View Sessions**: See list of recent conversations
3. **Filter High-Value**: Focus on leads with score >= 70
4. **Review Transcript**: Read conversation details
5. **Check Extracts**: View captured entities and intent
6. **Export Data**: Download for CRM integration
7. **Take Action**: Follow up based on insights

## Data Models

### Session
```typescript
interface Session {
  id: string;
  created_at: timestamp;
  visitor_id?: string;
  personality_id: string;
  lead_score: number;
  intent?: string;
  status: 'active' | 'completed';
  summary?: string;
}
```

### Utterance
```typescript
interface Utterance {
  id: string;
  session_id: string;
  speaker: 'visitor' | 'agent';
  text: string;
  timestamp: timestamp;
  audio_url?: string;
}
```

### Extract
```typescript
interface Extract {
  session_id: string;
  intent: string;
  entities: {
    visitor_name?: string;
    email?: string;
    org_name?: string;
    role?: string;
    use_case?: string;
    timeline?: string;
    budget_range?: string;
    [key: string]: any;
  };
  lead_score: number;
  score_reasons: string[];
}
```

## API Specification

### Edge Functions

#### `create_session`
- **Method**: POST
- **Input**: `{ personality_id?: string }`
- **Output**: `{ session_id: string, session_secret: string }`
- **Purpose**: Initialize new conversation session

#### `agent_reply`
- **Method**: POST
- **Input**: 
  ```typescript
  {
    session_id: string;
    session_secret: string;
    visitor_text: string;
    personality?: object;
  }
  ```
- **Output**: 
  ```typescript
  {
    agent_text: string;
    intent?: string;
    extract?: Extract;
    lead_score?: number;
  }
  ```
- **Purpose**: Generate AI response with entity extraction

#### `speech_to_text_groq`
- **Method**: POST
- **Input**: `{ audio_data_base64: string, model?: string }`
- **Output**: `{ text: string }`
- **Purpose**: Transcribe audio to text

#### `text_to_speech`
- **Method**: POST
- **Input**: `{ text: string, voice_id?: string }`
- **Output**: `{ audio_base64: string }`
- **Purpose**: Generate speech from text

#### `recall_memories`
- **Method**: POST
- **Input**: `{ query: string, session_id?: string }`
- **Output**: `{ memories: Memory[] }`
- **Purpose**: Retrieve relevant memories

#### `save_memory`
- **Method**: POST
- **Input**: `{ session_id: string, content: string }`
- **Output**: `{ success: boolean }`
- **Purpose**: Store conversation memory

## Business Rules

### Lead Scoring Algorithm
1. Base score starts at 0
2. Add points for positive indicators (title, budget, urgency)
3. Subtract points for negative indicators (vendor, academic)
4. Normalize score to 0-100 range
5. Trigger Slack notification if score >= 70
6. Classify priority: High (>=70), Medium (40-69), Low (<40)

### Conversation Management
1. Sessions expire after 24 hours of inactivity
2. Maximum audio chunk size: 25MB
3. Transcription timeout: 30 seconds
4. TTS generation timeout: 30 seconds
5. Maximum conversation length: 100 exchanges
6. Barge-in interruption allowed during TTS playback

### Memory Retrieval
1. Maximum 5 memories per query
2. Similarity threshold: 0.7
3. Recency boost for memories < 7 days old
4. Session-specific memories prioritized
5. General knowledge fallback if no specific memories

## Performance Requirements

### Latency Targets
- Voice activity detection: < 100ms
- Speech-to-text: < 2 seconds
- LLM response: < 3 seconds
- Text-to-speech: < 2 seconds
- End-to-end response: < 5 seconds

### Scalability
- Support 100 concurrent sessions
- Handle 1000 daily conversations
- Store 1M utterances
- Process 10GB daily audio

### Reliability
- 99.9% uptime for core services
- Graceful degradation if external APIs fail
- Automatic session recovery
- Queue overflow protection

## Security Requirements

1. **Authentication**: Session secrets for API access
2. **Data Protection**: Audio data encrypted in transit
3. **Privacy**: PII handling compliance
4. **Rate Limiting**: Prevent API abuse
5. **Input Validation**: Sanitize all user inputs
6. **CORS Policy**: Restrict to authorized domains

## UI/UX Requirements

### Chat Interface
- Mobile-responsive design
- Clear visual feedback for recording state
- Real-time transcription display
- Smooth animations for state transitions
- Accessibility: WCAG 2.1 AA compliance

### Admin Dashboard
- Data table with sorting/filtering
- Visual lead score indicators
- Export to CSV functionality
- Real-time updates via WebSocket
- Responsive charts and graphs

## Integration Points

### External Services
1. **Groq API**: LLM and Whisper transcription
2. **ElevenLabs**: Voice synthesis
3. **OpenAI**: Embeddings and GPT-4
4. **Deepgram**: Alternative STT
5. **Slack**: Lead notifications
6. **Supabase**: Database, auth, storage, edge functions

### Frontend Integration
- React Query for data fetching
- Supabase Realtime for live updates
- WebRTC for audio capture
- Base64 encoding for audio transport

## Testing Requirements

### Unit Tests
- Lead scoring algorithm
- Audio utility functions
- Data transformations
- Business logic validation

### Integration Tests
- End-to-end conversation flow
- API endpoint responses
- Database operations
- External service mocking

### Performance Tests
- Audio processing latency
- Concurrent session handling
- Memory retrieval speed
- Database query optimization

### User Acceptance Tests
- Natural conversation flow
- Lead qualification accuracy
- Admin dashboard functionality
- Mobile responsiveness

## Deployment Requirements

1. **Environment Variables**:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - GROQ_API_KEY
   - ELEVENLABS_API_KEY
   - OPENAI_API_KEY
   - DEEPGRAM_API_KEY
   - SLACK_WEBHOOK_URL

2. **Build Process**:
   - npm run build (production)
   - npm run build:dev (development)

3. **Hosting**:
   - Static frontend on CDN
   - Edge functions on Supabase
   - PostgreSQL on Supabase

4. **Monitoring**:
   - Error tracking
   - Performance monitoring
   - Usage analytics
   - API rate limit tracking

## Success Metrics

1. **Engagement**:
   - Average session duration > 3 minutes
   - Conversation completion rate > 60%
   - Return visitor rate > 20%

2. **Lead Generation**:
   - High-value lead conversion > 5%
   - Email capture rate > 30%
   - Slack notification accuracy > 90%

3. **Technical**:
   - System uptime > 99.9%
   - Response latency < 5 seconds
   - Transcription accuracy > 95%

4. **Business**:
   - Cost per conversation < $0.50
   - ROI on qualified leads > 10x
   - Customer satisfaction > 4.5/5

## Future Enhancements

1. **Multi-language support**
2. **Video chat capabilities**
3. **Calendar integration for scheduling**
4. **CRM integration (Salesforce, HubSpot)**
5. **Advanced analytics dashboard**
6. **Custom personality creation**
7. **Conversation templates**
8. **Automated follow-up sequences**
9. **Voice cloning for other experts**
10. **Mobile native applications**