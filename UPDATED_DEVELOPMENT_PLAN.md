# AI William – Lovable + Supabase MVP Kit

A build-ready starter for creating an AI voice agent system. Includes: DB schema (SQL), Edge Function stubs, Types/validation, minimal React components, and LLM tool/few-shot pack.

---

## 0) Project Setup Checklist

✅ **Create Supabase project** → enable `pgvector`, `pgcrypto`, `uuid-ossp`.
✅ Create buckets: `audio`, `screens`, `uploads`, `exports` (private).
🔄 Add **Edge Functions** below; set secrets in Supabase **Project → Settings → Config**.
🔄 In Lovable (React + Vite), add the files from the scaffold, plug in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
🔄 Deploy Lovable app and Supabase functions; test end-to-end locally with the stubbed providers.

### Required Environment Variables

```env
# Supabase
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_ANON_KEY="anon-key"
SUPABASE_SERVICE_ROLE="service-role-key"  # only used server-side

# AI Services
DEEPGRAM_API_KEY="dg_..."  # or ASR provider of your choice
ELEVENLABS_API_KEY="eleven_..."
OPENAI_API_KEY="sk-..."  # or LLM provider of your choice

# Notifications
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Configuration
LEAD_SCORE_ALERT="70"
RAW_AUDIO_RETENTION_DAYS="30"
DIGEST_EMAIL_TO="you@domain.com"
```

---

## 1) Implementation Phases

### Phase 1: Foundation (Week 1) ✅
- [x] Database schema setup with RLS policies
- [x] Basic UI framework and routing
- [x] Core page structure (landing, chat, admin)
- [x] Design system implementation

### Phase 2: Core Voice Interface (Week 1-2) 🔄
- [ ] Session creation API
- [ ] Microphone capture utilities
- [ ] Audio streaming infrastructure
- [ ] Real-time caption display
- [ ] Basic consent flow

### Phase 3: AI Integration (Week 2-3)
- [ ] LLM integration with structured extraction
- [ ] Intent recognition and lead scoring
- [ ] Text-to-speech integration
- [ ] RAG system implementation
- [ ] Function calling setup

### Phase 4: Real-time Features (Week 3-4)
- [ ] WebSocket audio streaming
- [ ] Live transcript processing
- [ ] Speaking indicators and UI states
- [ ] CTA button system
- [ ] Contact capture flow

### Phase 5: Admin & Analytics (Week 4-5)
- [ ] Session monitoring dashboard
- [ ] Lead scoring analytics
- [ ] Conversation transcripts
- [ ] Export functionality
- [ ] Settings management

### Phase 6: Production Ready (Week 5-6)
- [ ] Slack notifications
- [ ] Session summarization
- [ ] Privacy compliance
- [ ] Performance optimization
- [ ] Error handling & monitoring

---

## 2) TypeScript Types + Zod Validation

### Intent & Extraction Schema

```typescript
// lib/types.ts
import { z } from "zod";

export const IntentEnum = z.enum([
  'consulting_inquiry',
  'collaboration', 
  'media_request',
  'speaking_request',
  'job_opportunity',
  'product_feedback',
  'partnership_vendor',
  'advice_request',
  'supporter_fan',
]);

export const ExtractSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  entities: z.object({
    org_name: z.string().optional(),
    person_name: z.string().optional(),
    role: z.string().optional(),
    budget_range: z.string().optional(),
    timeline: z.string().optional(),
    use_case: z.string().optional(),
    channel: z.string().optional(),
    geo: z.string().optional(),
    contact_email: z.string().email().optional(),
    permissions: z.object({
      email_opt_in: z.boolean().optional(),
      quote_ok: z.boolean().optional(),
    }).partial().optional(),
  }).partial(),
  followup_actions: z.array(z.string()).optional(),
  lead_score: z.number().min(0).max(100).optional(),
});

export type ExtractT = z.infer<typeof ExtractSchema>;
```

### Lead Scoring Algorithm

```typescript
// lib/leadScore.ts
import type { ExtractT } from './types';

export function scoreLead(e: ExtractT): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const txt = `${e.entities.role ?? ''} ${e.entities.use_case ?? ''}`.toLowerCase();

  // Senior title bonus
  if (/vp|chief|head|director/.test(txt)) { 
    s += 30; 
    reasons.push('senior_title'); 
  }
  
  // Budget indicators
  if (/\b(50k|100k|200k|\$50,?000|\$100,?000)/i.test(e.entities.budget_range ?? '')) {
    s += 20; 
    reasons.push('budget_>=50k');
  }
  
  // Timeline urgency
  if (/(now|urgent|6\s*weeks|q\d)/i.test(e.entities.timeline ?? '')) { 
    s += 15; 
    reasons.push('urgent_timeline'); 
  }
  
  // Warm intro indicators
  if (/(intro|referral|@bigco\.com)/i.test(JSON.stringify(e.entities))) { 
    s += 10; 
    reasons.push('warm_intro'); 
  }
  
  // Strategic alignment
  if (/rag|personalization|content routing|ai strategy|growth/i.test(e.entities.use_case ?? '')) { 
    s += 10; 
    reasons.push('aligned_thesis'); 
  }
  
  // Negative indicators
  if (/agency|reseller|partnership|discount/i.test(e.entities.use_case ?? '')) { 
    s -= 15; 
    reasons.push('vendor_pitch'); 
  }
  
  if (e.intent === 'supporter_fan' || e.intent === 'advice_request') { 
    s -= 10; 
    reasons.push('general_interest'); 
  }

  s = Math.max(0, Math.min(100, s));
  return { score: s, reasons };
}
```

---

## 3) Supabase Edge Functions (Priority Order)

### 🎯 create_session (High Priority)
Creates a new conversation session and returns session ID + realtime token.

### 🎯 agent_reply (High Priority)  
Processes user input through LLM, extracts intent/entities, and generates response.

### 🎯 ingest_audio_ws (High Priority)
WebSocket proxy for real-time audio streaming to ASR provider.

### 📊 capture_contact (Medium Priority)
Captures user contact information with consent.

### 📊 choose_cta (Medium Priority)
Handles call-to-action button clicks and generates appropriate links.

### 🔔 notify_slack (Medium Priority)
Sends Slack alerts for high-value leads.

### 📋 summarize_session (Low Priority)
Generates session summaries and action items.

### 📅 daily_digest (Low Priority)
Scheduled function for daily analytics emails.

---

## 4) LLM System Configuration

### System Prompt Template
```
You are AI William, William White's AI twin. 

PERSONALITY: Concise, pragmatic, curious, outcome-focused.

GOALS: 
1) Detect intent + key entities accurately
2) Ask 1-2 targeted follow-up questions  
3) Route to appropriate next steps
4) Generate structured extraction data

CONSTRAINTS:
- Never invent pricing or firm commitments
- If asked for human, escalate immediately
- Keep responses under 100 words
- Always generate hidden JSON call_state

KNOWLEDGE: {bio, patents, SiriusXM/Pandora work, offerings, rates, availability}
```

### Function Calling Schema
```json
{
  "name": "save_extract",
  "description": "Save conversation analysis",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": {"type": "string", "enum": ["consulting_inquiry", "collaboration", ...]},
      "confidence": {"type": "number", "minimum": 0, "maximum": 1},
      "entities": {"type": "object"},
      "lead_score": {"type": "number", "minimum": 0, "maximum": 100}
    }
  }
}
```

---

## 5) RAG Knowledge Base Structure

### Required Documents
- `bio.md`: Professional bio + key outcomes
- `services.md`: Offerings, engagement models, timelines  
- `case_siriusxm.md`: Metadata → discovery wins
- `case_pandora.md`: Personalization impact
- `press_kit.md`: Bio variants, headshots, topics
- `rates_faq.md`: Pricing approach (ranges, not quotes)

### Chunking Strategy
- Target: 120-180 tokens per chunk
- Store provenance and source metadata
- Use semantic search for retrieval
- Embedding dimension: 1536 (OpenAI compatible)

---

## 6) Current Status & Next Actions

### ✅ Completed
- Database schema with proper RLS policies
- Core UI framework and pages  
- Design system implementation
- Basic routing structure
- Storage buckets configuration

### 🔄 In Progress  
- Edge function stubs
- TypeScript types and validation
- Audio capture utilities
- Session management

### 📋 Next Immediate Tasks
1. **Implement create_session Edge Function**
   - Set up basic session creation
   - Add visitor ID generation
   - Return session tokens

2. **Build Core Chat Interface**
   - Add microphone permissions
   - Implement basic audio capture
   - Create session state management

3. **Add LLM Integration**
   - Set up OpenAI/provider connection
   - Implement structured extraction
   - Add function calling capability

4. **Test End-to-End Flow**
   - Session creation → audio capture → LLM response
   - Validate data persistence
   - Check real-time updates

---

## 7) Success Metrics

### Technical Targets
- < 2s total response latency
- > 95% uptime  
- < 5% error rate
- Real-time connection stability

### Business Targets
- Lead conversion tracking
- Session completion rates
- Intent accuracy > 80%
- CTA click-through rates

---

This plan prioritizes getting a working voice conversation flow as quickly as possible, then iteratively adding intelligence, analytics, and production features. Each phase builds incrementally while maintaining a testable system throughout development.