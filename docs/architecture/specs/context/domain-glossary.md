# Domain Glossary

## Business Terms

### Lead Scoring
**Lead**: A potential customer or business opportunity identified through conversation
**Lead Score**: Numerical value (0-100) indicating the quality/value of a lead
**High-Value Lead**: Lead with score >= 70, triggers Slack notification
**Lead Priority**: Classification as High (>=70), Medium (40-69), or Low (<40)
**Warm Introduction**: Referral or recommendation from existing contact

### Conversation Intelligence
**Intent**: The primary purpose or goal of the visitor's conversation
- `discovery_call`: Exploring potential collaboration
- `support_request`: Seeking help or assistance
- `partnership_inquiry`: Business partnership interest
- `investor_interest`: Investment-related discussion
- `advice_request`: Seeking guidance or consultation
- `supporter_fan`: General interest or admiration

**Entity Extraction**: Process of identifying key information from conversation
**Extract**: Structured data pulled from unstructured conversation
**Utterance**: Single exchange of dialogue (either visitor or agent speaking)

### AI Personalities
**Personality**: Distinct AI behavior mode with unique characteristics
**System Prompt**: Instructions defining AI personality behavior
**Voice ID**: ElevenLabs identifier for specific voice characteristics
**Personality Modes**:
- Entrepreneur: Business-focused, strategic
- Professional: Technical, detailed
- Casual: Friendly, relaxed
- Pirate: Adventurous, story-driven
- Coach: Mentoring, supportive

## Technical Terms

### Audio Processing
**WebRTC**: Web Real-Time Communication for audio capture
**Voice Activity Detection (VAD)**: Detecting when user is speaking
**Barge-in**: User interrupting AI speech with new input
**Audio Blob**: Binary audio data object
**Base64 Encoding**: Text representation of binary audio data
**Sample Rate**: Audio samples per second (typically 16000Hz)
**WebM**: Audio format used for recording

### Speech Processing
**Speech-to-Text (STT)**: Converting spoken audio to written text
**Text-to-Speech (TTS)**: Converting written text to spoken audio
**Whisper**: OpenAI/Groq's speech recognition model
**Transcription**: Written text output from STT
**Voice Synthesis**: Process of generating artificial speech

### Session Management
**Session**: Single conversation instance with unique ID
**Session ID**: UUID identifying a conversation session
**Session Secret**: Authentication token for session access
**Session State**: Current status (active, completed, expired)
**Turn**: Single exchange in conversation (user speaks, AI responds)
**Turn ID**: Identifier to track and cancel stale responses

### AI/ML Terms
**LLM**: Large Language Model (e.g., Llama, GPT)
**RAG**: Retrieval-Augmented Generation
**Embedding**: Vector representation of text for similarity search
**Vector Search**: Finding similar content using embeddings
**Context Window**: Maximum tokens LLM can process
**Token**: Basic unit of text for LLM processing
**Prompt Engineering**: Crafting effective instructions for AI

### Memory System
**Memory**: Stored piece of conversation or knowledge
**Memory Recall**: Retrieving relevant memories for context
**Memory Decay**: Reducing relevance of old memories
**Similarity Threshold**: Minimum score for memory relevance
**Context Injection**: Adding memories to LLM prompt

## Platform Terms

### Supabase
**Edge Function**: Serverless function running on Supabase
**Realtime**: WebSocket-based live data updates
**RLS**: Row Level Security for database access control
**Anon Key**: Public API key for Supabase client
**Service Key**: Private API key for backend operations
**Storage Bucket**: Container for file storage (audio, exports)

### External Services
**Groq**: AI platform providing LLM and Whisper API
**ElevenLabs**: Voice synthesis and cloning service
**OpenAI**: Provider of GPT models and embeddings
**Deepgram**: Alternative speech-to-text service
**Slack Webhook**: URL for sending notifications to Slack

## Application Terms

### User Interface
**Chat Interface**: Main conversation UI component
**Admin Dashboard**: Interface for managing conversations and leads
**Toast**: Temporary notification message
**Modal**: Overlay dialog for focused interaction
**Skeleton**: Loading placeholder UI element

### Data Models
**Utterance**: Single message in conversation
**Extract**: Structured data from conversation
**Summary**: AI-generated conversation overview
**Event**: User interaction or system occurrence
**Visitor**: Person using the chat interface
**Agent**: AI assistant responding to visitor

### State Management
**Hook**: React function for encapsulating logic
**Ref**: Mutable reference that doesn't trigger re-render
**Effect**: Side effect in React component lifecycle
**Query**: Data fetching operation with caching
**Mutation**: Data modification operation

## Metrics & Analytics

### Performance Metrics
**Latency**: Time delay in system response
**p95/p99**: 95th/99th percentile response time
**Time to Interactive (TTI)**: When page becomes usable
**First Contentful Paint (FCP)**: When first content appears
**Bundle Size**: JavaScript code size sent to browser

### Business Metrics
**Conversion Rate**: Percentage of visitors becoming leads
**Engagement Score**: Measure of conversation quality
**Session Duration**: Length of conversation
**Bounce Rate**: Visitors leaving without interaction
**Lead Velocity**: Rate of new lead generation

### Technical Metrics
**Error Rate**: Percentage of failed operations
**API Usage**: Number of API calls made
**Token Consumption**: LLM tokens used
**Cache Hit Rate**: Percentage of cached responses used
**Queue Depth**: Number of pending audio processing tasks

## Development Terms

### Code Organization
**Feature Module**: Self-contained functionality unit
**Utility Function**: Reusable helper function
**Component**: Reusable UI element
**Page**: Top-level route component
**Middleware**: Code executing between request/response

### Testing
**Unit Test**: Test of individual function/component
**Integration Test**: Test of multiple components together
**E2E Test**: End-to-end test of complete user flow
**Mock**: Simulated version of external dependency
**Stub**: Simplified implementation for testing

### Deployment
**CI/CD**: Continuous Integration/Deployment
**Preview Deploy**: Temporary deployment for testing
**Production Deploy**: Live system deployment
**Rollback**: Reverting to previous version
**Feature Flag**: Toggle for enabling/disabling features

## Business Logic Terms

### Lead Qualification
**Budget Range**: Estimated project/engagement value
**Timeline**: Expected timeframe for decision/implementation
**Use Case**: Specific problem or application
**Organization**: Company or entity of visitor
**Role**: Job title or position of visitor

### Scoring Factors
**Senior Title Bonus**: Extra points for executive roles
**Budget Indicator**: Points based on mentioned budget
**Urgency Factor**: Points for immediate needs
**Strategic Alignment**: Match with William's expertise
**Negative Indicators**: Factors reducing lead score

### Conversation Dynamics
**Engagement Level**: Measure of visitor participation
**Topic Depth**: Complexity of discussion topics
**Question Quality**: Sophistication of visitor questions
**Response Length**: Average message size
**Turn Taking**: Pattern of conversation exchanges

## Error States

### System Errors
**Timeout Error**: Operation exceeded time limit
**Rate Limit Error**: Too many requests to API
**Network Error**: Connection failure
**Auth Error**: Authentication/authorization failure
**Validation Error**: Invalid input data

### User Errors
**Microphone Permission Denied**: No audio access granted
**Browser Incompatible**: Browser doesn't support features
**Session Expired**: Conversation timed out
**Input Too Long**: Message exceeds limits
**Invalid Audio Format**: Unsupported audio type

## Abbreviations

- **STT**: Speech-to-Text
- **TTS**: Text-to-Speech
- **VAD**: Voice Activity Detection
- **LLM**: Large Language Model
- **RAG**: Retrieval-Augmented Generation
- **JWT**: JSON Web Token
- **UUID**: Universally Unique Identifier
- **CDN**: Content Delivery Network
- **API**: Application Programming Interface
- **UI/UX**: User Interface/User Experience
- **CRUD**: Create, Read, Update, Delete
- **RLS**: Row Level Security
- **CORS**: Cross-Origin Resource Sharing
- **WebRTC**: Web Real-Time Communication
- **p95/p99**: 95th/99th percentile