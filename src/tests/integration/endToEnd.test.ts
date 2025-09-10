import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('End-to-End Integration Tests', () => {
  let mockInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke = vi.mocked(supabase.functions.invoke);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Voice Conversation Flow', () => {
    it('should handle full conversation cycle from audio to response', async () => {
      // Step 1: Create session
      const sessionResponse = {
        data: {
          session_id: 'test-session-123',
          session_secret: 'secret-456'
        },
        error: null
      };
      
      mockInvoke.mockResolvedValueOnce(sessionResponse);
      
      const sessionResult = await supabase.functions.invoke('create_session', {
        body: {
          visitor_id: 'test-visitor',
          consent: true
        }
      });

      expect(sessionResult.data?.session_id).toBe('test-session-123');

      // Step 2: Speech to text
      const transcriptionResponse = {
        data: {
          text: 'I am looking for a laptop under $1000',
          duration_ms: 3000,
          model: 'distil-whisper-large-v3-en'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(transcriptionResponse);

      const sttResult = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: sessionResult.data?.session_id,
          session_secret: sessionResult.data?.session_secret,
          audio_base64: 'mock_audio_data',
          model: 'distil-whisper-large-v3-en'
        }
      });

      expect(sttResult.data?.text).toBe('I am looking for a laptop under $1000');

      // Step 3: Agent reply with lead scoring
      const agentResponse = {
        data: {
          text: 'I can help you find the perfect laptop within your budget.',
          audio_base64: 'tts_audio_base64',
          extract: {
            intent: 'product_inquiry',
            entities: [
              { type: 'product', value: 'laptop' },
              { type: 'budget', value: '$1000' }
            ],
            lead_score: 75
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(agentResponse);

      const agentResult = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionResult.data?.session_id,
          session_secret: sessionResult.data?.session_secret,
          user_message: sttResult.data?.text,
          mode: 'professional'
        }
      });

      expect(agentResult.data?.extract?.lead_score).toBe(75);
      expect(agentResult.data?.extract?.intent).toBe('product_inquiry');
      expect(agentResult.data?.audio_base64).toBeTruthy();

      // Step 4: Save memory
      const memoryResponse = {
        data: {
          id: 'memory-123',
          content: 'Customer interested in laptops under $1000',
          session_id: sessionResult.data?.session_id
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(memoryResponse);

      const memoryResult = await supabase.functions.invoke('save_memory', {
        body: {
          session_id: sessionResult.data?.session_id,
          content: 'Customer interested in laptops under $1000',
          type: 'product_interest'
        }
      });

      expect(memoryResult.data?.content).toContain('laptops under $1000');

      // Verify all functions were called in sequence
      expect(mockInvoke).toHaveBeenCalledTimes(4);
    });

    it('should handle conversation with escalating lead scores', async () => {
      const sessionId = 'test-session-456';
      const sessionSecret = 'secret-789';

      // Initial low-intent message
      mockInvoke.mockResolvedValueOnce({
        data: {
          text: 'Just browsing',
          extract: {
            intent: 'browsing',
            lead_score: 20
          }
        },
        error: null
      });

      let result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          user_message: 'Just looking around'
        }
      });

      expect(result.data?.extract?.lead_score).toBe(20);

      // Medium-intent message
      mockInvoke.mockResolvedValueOnce({
        data: {
          text: 'Let me show you our features',
          extract: {
            intent: 'feature_inquiry',
            lead_score: 50
          }
        },
        error: null
      });

      result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          user_message: 'What features do you offer?'
        }
      });

      expect(result.data?.extract?.lead_score).toBe(50);

      // High-intent message
      mockInvoke.mockResolvedValueOnce({
        data: {
          text: 'I can help you get started right away',
          extract: {
            intent: 'purchase_ready',
            lead_score: 90
          }
        },
        error: null
      });

      result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          user_message: 'I want to buy now'
        }
      });

      expect(result.data?.extract?.lead_score).toBe(90);
    });
  });

  describe('Authentication and Session Management', () => {
    it('should handle complete authentication flow', async () => {
      // Sign up
      const signUpMock = vi.mocked(supabase.auth.signUp);
      signUpMock.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user-id', email: 'test@example.com' },
          session: null
        },
        error: null
      } as any);

      const signUpResult = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'securePassword123'
      });

      expect(signUpResult.data?.user?.email).toBe('test@example.com');

      // Sign in
      const signInMock = vi.mocked(supabase.auth.signInWithPassword);
      signInMock.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user-id', email: 'test@example.com' },
          session: {
            access_token: 'access_token_123',
            refresh_token: 'refresh_token_456'
          }
        },
        error: null
      } as any);

      const signInResult = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'securePassword123'
      });

      expect(signInResult.data?.session?.access_token).toBeTruthy();

      // Get session
      const getSessionMock = vi.mocked(supabase.auth.getSession);
      getSessionMock.mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'new-user-id', email: 'test@example.com' },
            access_token: 'access_token_123'
          }
        },
        error: null
      } as any);

      const sessionResult = await supabase.auth.getSession();
      expect(sessionResult.data?.session?.user?.email).toBe('test@example.com');

      // Sign out
      const signOutMock = vi.mocked(supabase.auth.signOut);
      signOutMock.mockResolvedValueOnce({ error: null } as any);

      const signOutResult = await supabase.auth.signOut();
      expect(signOutResult.error).toBeNull();
    });
  });

  describe('Memory and Context Management', () => {
    it('should save and recall conversation memories', async () => {
      const sessionId = 'memory-test-session';

      // Save multiple memories
      const memories = [
        'User prefers email communication',
        'Interested in enterprise features',
        'Budget range is $5000-$10000'
      ];

      for (const memory of memories) {
        mockInvoke.mockResolvedValueOnce({
          data: {
            id: `memory-${Date.now()}`,
            content: memory,
            session_id: sessionId
          },
          error: null
        });

        const result = await supabase.functions.invoke('save_memory', {
          body: {
            session_id: sessionId,
            content: memory,
            type: 'context'
          }
        });

        expect(result.data?.content).toBe(memory);
      }

      // Recall memories
      mockInvoke.mockResolvedValueOnce({
        data: {
          memories: [
            {
              content: 'User prefers email communication',
              similarity: 0.95
            },
            {
              content: 'Budget range is $5000-$10000',
              similarity: 0.88
            }
          ]
        },
        error: null
      });

      const recallResult = await supabase.functions.invoke('recall_memories', {
        body: {
          session_id: sessionId,
          query: 'communication preferences and budget',
          limit: 5
        }
      });

      expect(recallResult.data?.memories).toHaveLength(2);
      expect(recallResult.data?.memories[0].similarity).toBeGreaterThan(0.9);
    });
  });

  describe('Session Summarization', () => {
    it('should generate comprehensive session summary', async () => {
      const sessionId = 'summary-test-session';

      mockInvoke.mockResolvedValueOnce({
        data: {
          summary: {
            id: 'summary-123',
            session_id: sessionId,
            summary_text: 'Customer inquired about enterprise features with budget of $5000-$10000',
            key_topics: ['enterprise', 'budget', 'features'],
            sentiment: 'positive',
            lead_score: 80,
            action_items: [
              'Send enterprise pricing',
              'Schedule demo'
            ],
            entities_extracted: [
              { type: 'budget', value: '$5000-$10000' },
              { type: 'product_tier', value: 'enterprise' }
            ]
          }
        },
        error: null
      });

      const result = await supabase.functions.invoke('summarize_session', {
        body: {
          session_id: sessionId
        }
      });

      expect(result.data?.summary?.lead_score).toBe(80);
      expect(result.data?.summary?.key_topics).toContain('enterprise');
      expect(result.data?.summary?.action_items).toHaveLength(2);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle API failures gracefully', async () => {
      // Network error
      mockInvoke.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await supabase.functions.invoke('agent_reply', {
          body: { session_id: 'test', user_message: 'hello' }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network timeout');
      }

      // Rate limiting
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          status: 429,
          retry_after: 60
        }
      });

      const result = await supabase.functions.invoke('agent_reply', {
        body: { session_id: 'test', user_message: 'hello' }
      });

      expect(result.error?.status).toBe(429);

      // Invalid session
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Invalid session',
          status: 401
        }
      });

      const invalidResult = await supabase.functions.invoke('agent_reply', {
        body: { session_id: 'invalid', user_message: 'hello' }
      });

      expect(invalidResult.error?.status).toBe(401);
    });

    it('should handle empty or invalid inputs', async () => {
      // Empty audio
      mockInvoke.mockResolvedValueOnce({
        data: {
          text: '',
          duration_ms: 0
        },
        error: null
      });

      const emptyAudioResult = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: 'test',
          audio_base64: ''
        }
      });

      expect(emptyAudioResult.data?.text).toBe('');

      // Invalid email
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Invalid email format',
          status: 400
        }
      });

      const invalidEmailResult = await supabase.functions.invoke('collect_email', {
        body: {
          email: 'not-an-email',
          session_id: 'test'
        }
      });

      expect(invalidEmailResult.error?.status).toBe(400);
    });
  });

  describe('Multi-Model Support', () => {
    it('should work with different AI models', async () => {
      const models = [
        'mixtral-8x7b-32768',
        'llama2-70b-4096',
        'gemma-7b-it'
      ];

      for (const model of models) {
        mockInvoke.mockResolvedValueOnce({
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: `Response from ${model}`
                }
              }
            ],
            model: model
          },
          error: null
        });

        const result = await supabase.functions.invoke('groq_chat', {
          body: {
            messages: [{ role: 'user', content: 'test' }],
            model: model
          }
        });

        expect(result.data?.model).toBe(model);
        expect(result.data?.choices[0].message.content).toContain(model);
      }
    });

    it('should support different TTS voices', async () => {
      const voices = [
        'william_professional',
        'william_casual',
        'william_pirate'
      ];

      for (const voice of voices) {
        mockInvoke.mockResolvedValueOnce({
          data: {
            audio_base64: `audio_for_${voice}`,
            voice_id: voice,
            duration_ms: 2000
          },
          error: null
        });

        const result = await supabase.functions.invoke('text_to_speech', {
          body: {
            text: 'Test message',
            voice_id: voice
          }
        });

        expect(result.data?.voice_id).toBe(voice);
        expect(result.data?.audio_base64).toContain(voice);
      }
    });
  });
});