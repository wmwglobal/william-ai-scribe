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

// Database types
export interface Session {
  id: string;
  created_by?: string;
  visitor_id?: string;
  started_at: string;
  ended_at?: string;
  channel: 'web';
  consent: boolean;
  final_intent?: string;
  lead_score: number;
  email?: string;
  contact_name?: string;
  cta_chosen?: string;
  notes?: string;
}

export interface Utterance {
  id: string;
  session_id: string;
  speaker: 'visitor' | 'agent';
  text: string;
  ts: string;
  asr_conf?: number;
  audio_url?: string;
}

export interface Extract {
  id: string;
  session_id: string;
  utterance_id?: string;
  intent?: string;
  confidence?: number;
  entities?: Record<string, any>;
  followup_actions?: string[];
  lead_score?: number;
  created_at: string;
}

export interface SessionSummary {
  session_id: string;
  executive_summary?: string;
  action_items?: Array<{
    owner: 'you' | 'agent' | 'prospect';
    text: string;
    due_date?: string;
  }>;
  crm_payload?: Record<string, any>;
  created_at: string;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  kind: string;
  payload?: Record<string, any>;
  ts: string;
}

// API Response types
export interface CreateSessionResponse {
  session_id: string;
  realtime_token: string;
}

export interface AgentReplyResponse {
  ok: boolean;
  text: string;
  extract?: ExtractT;
  audio_base64?: string;
  session_id: string;
}

export interface CTAResponse {
  link: string;
}

// Real-time event types
export interface RealtimeEvent {
  type: 'caption' | 'agent_reply' | 'extract_update' | 'session_ended';
  payload: any;
  timestamp: string;
}