# System Architecture

## High-Level Architecture

### System Overview
William AI Scribe is a real-time conversational AI system built on a modern serverless architecture. The system prioritizes low latency, high reliability, and seamless user experience for voice-based interactions.

### Architectural Principles
1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data
2. **Serverless First**: Leverage managed services to reduce operational overhead
3. **Event-Driven**: React to user actions and system events asynchronously
4. **Security by Design**: API keys and sensitive operations on backend only
5. **Progressive Enhancement**: Core functionality works, enhanced features layer on top

## Component Architecture

### Frontend Architecture
```
┌──────────────────────────────────────────────────────────┐
│                    React Application                       │
├──────────────────────────────────────────────────────────┤
│                         Pages                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  Index   │  │  Admin   │  │   Auth    │  │Personality││
│  │ (Chat)   │  │Dashboard │  │  Login    │  │ Selector  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
├──────────────────────────────────────────────────────────┤
│                      Components                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │  UI Library (shadcn/ui)  │  Business Components       ││
│  │  - Button, Card, Dialog  │  - ChatInterface           ││
│  │  - Form, Input, Toast    │  - VoiceRecorder           ││
│  │  - Table, Tabs, Badge    │  - LeadScoreDisplay        ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│                    Custom Hooks                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │ useVoiceChat │ useAdminData │ useSession │ useToast  ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│                   Business Logic                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ audioUtils │ leadScore │ conversationDynamics │ types ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Backend Architecture
```
┌──────────────────────────────────────────────────────────┐
│                   Supabase Platform                        │
├──────────────────────────────────────────────────────────┤
│                    Edge Functions                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ agent_reply      │ Handle AI responses & extraction   ││
│  │ speech_to_text   │ Convert audio to text (Groq)       ││
│  │ text_to_speech   │ Generate voice audio (ElevenLabs)  ││
│  │ groq_chat        │ Direct LLM interaction             ││
│  │ recall_memories  │ RAG memory retrieval               ││
│  │ save_memory      │ Store conversation context         ││
│  │ create_session   │ Initialize chat session            ││
│  │ summarize_session│ Generate conversation summary      ││
│  │ collect_email    │ Lead email collection              ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│                     Database                               │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Tables          │ Extensions                          ││
│  │ - sessions      │ - pgvector (embeddings)             ││
│  │ - utterances    │ - pgcrypto (encryption)             ││
│  │ - extracts      │ - uuid-ossp (IDs)                   ││
│  │ - memories      │                                     ││
│  │ - summaries     │                                     ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│             Realtime & Storage                             │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Realtime Channels │ Storage Buckets                   ││
│  │ - session:*       │ - audio                           ││
│  │ - admin:*         │ - exports                         ││
│  │                   │ - uploads                         ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### Voice Conversation Flow
```
User Speaks → Microphone → WebRTC Capture → Base64 Encoding
    ↓
Audio Blob → useVoiceChat Hook → Queue Management
    ↓
Supabase Edge Function (speech_to_text_groq)
    ↓
Transcribed Text → Session Update
    ↓
Agent Reply Function → LLM Processing → Response + Extraction
    ↓
Text to Speech → Audio Generation → Base64 Response
    ↓
Audio Player → Speaker Output → User Hears Response
```

### Lead Scoring Flow
```
Conversation → Entity Extraction → Extract Storage
    ↓
Lead Scoring Algorithm → Score Calculation
    ↓
Score >= 70? → Slack Notification
    ↓
Admin Dashboard → Lead Review → Follow-up Action
```

## State Management Architecture

### Client State Layers
1. **Component State** (useState)
   - UI state (modals, forms)
   - Temporary user input
   - Animation states

2. **Hook State** (custom hooks)
   - Voice recording state
   - Session management
   - Audio queue management

3. **Server State** (React Query)
   - API responses
   - Cached data
   - Background refetching

4. **Global State** (Context API)
   - User preferences
   - Theme settings
   - Authentication state

### State Flow
```
User Action → Local State Update → Optimistic UI Update
    ↓
API Call → Server Processing → Database Update
    ↓
Response → Cache Update → UI Sync → User Feedback
```

## Security Architecture

### Security Layers
1. **Frontend Security**
   - Input sanitization
   - XSS prevention
   - CORS enforcement
   - Secure cookie handling

2. **API Security**
   - Session-based authentication
   - Request validation
   - Rate limiting
   - Error masking

3. **Backend Security**
   - API key management
   - Database encryption
   - Secure connections
   - Audit logging

### Authentication Flow
```
Create Session → Generate UUID + Secret
    ↓
Store in Database → Return to Client
    ↓
Client Stores → Includes in Requests
    ↓
Edge Function Validates → Process Request
```

## Performance Architecture

### Optimization Strategies
1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading
   - Dynamic imports for heavy libraries

2. **Caching Strategy**
   - Browser cache for static assets
   - API response caching
   - CDN for global distribution
   - Database query caching

3. **Audio Optimization**
   - Streaming audio processing
   - Queue management
   - Compression algorithms
   - CDN delivery

### Performance Targets
- Initial Load: < 3s
- Time to Interactive: < 2s
- API Response: < 2s (p95)
- Audio Latency: < 1s

## Scalability Architecture

### Horizontal Scaling
```
Load Balancer
    ↓
CDN (Static Assets)
    ↓
Multiple Edge Function Instances
    ↓
Connection Pooling
    ↓
PostgreSQL with Read Replicas
```

### Vertical Scaling
- Database: Upgrade instance size
- Edge Functions: Increase memory/timeout
- Storage: Expand bucket limits

### Auto-scaling Triggers
- Request rate > 1000/min
- CPU usage > 80%
- Memory usage > 80%
- Queue depth > 100

## Error Handling Architecture

### Error Boundaries
```typescript
// Component Level
<ErrorBoundary fallback={<ErrorUI />}>
  <Component />
</ErrorBoundary>

// Application Level
<GlobalErrorBoundary>
  <App />
</GlobalErrorBoundary>
```

### Error Recovery Strategies
1. **Retry Logic**
   - Exponential backoff
   - Maximum retry limits
   - Circuit breaker pattern

2. **Fallback Mechanisms**
   - Cached responses
   - Degraded functionality
   - Offline mode

3. **User Communication**
   - Toast notifications
   - Error messages
   - Recovery instructions

## Monitoring Architecture

### Observability Stack
```
Application Metrics → Custom Events → Analytics Platform
    ↓
Performance Monitoring → RUM → Dashboard
    ↓
Error Tracking → Sentry → Alerts
    ↓
Business Metrics → Database → Reports
```

### Key Metrics
1. **Technical Metrics**
   - Response times
   - Error rates
   - API usage
   - Resource utilization

2. **Business Metrics**
   - Session duration
   - Lead conversion
   - Feature adoption
   - User engagement

## Deployment Architecture

### CI/CD Pipeline
```
Code Push → GitHub Actions → Tests → Build
    ↓
Preview Deploy → Manual Review → Production Deploy
    ↓
Health Checks → Rollback if Failed
```

### Environment Strategy
- **Development**: Local development
- **Staging**: Preview deployments
- **Production**: Live system

### Rollback Strategy
1. Automatic rollback on health check failure
2. Manual rollback via version tags
3. Database migration rollback scripts
4. Feature flags for gradual rollout

## Integration Architecture

### External Service Integration
```
Application → Edge Function → External API
    ↓
Response Processing → Error Handling → Cache
    ↓
Return to Application
```

### Service Dependencies
1. **Critical Services** (must be available)
   - Supabase Database
   - Groq API (STT)
   - ElevenLabs (TTS)

2. **Enhanced Services** (graceful degradation)
   - OpenAI (embeddings)
   - Slack (notifications)
   - Analytics

### Integration Patterns
- **Circuit Breaker**: Prevent cascade failures
- **Retry with Backoff**: Handle temporary failures
- **Fallback**: Use cached or default responses
- **Timeout**: Prevent hanging requests

## Future Architecture Considerations

### Planned Enhancements
1. **Microservices Migration**
   - Separate voice processing service
   - Independent lead scoring service
   - Dedicated memory service

2. **Event Streaming**
   - Apache Kafka for event bus
   - Real-time data pipeline
   - Event sourcing for audit trail

3. **Machine Learning Pipeline**
   - Model training infrastructure
   - A/B testing framework
   - Feature engineering pipeline

4. **Multi-Region Deployment**
   - Geographic distribution
   - Data replication
   - Regional failover

### Technology Adoption Criteria
- Must improve performance or reliability
- Should reduce operational complexity
- Need clear migration path
- Require cost-benefit analysis