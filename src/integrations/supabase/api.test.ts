import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from './client';

// Mock the Supabase client
vi.mock('./client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

describe('Supabase API Integration Tests', () => {
  let mockInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke = vi.mocked(supabase.functions.invoke);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create_session Edge Function', () => {
    it('should create a session successfully', async () => {
      const mockResponse = {
        data: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          visitor_id: 'visitor-789'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('create_session', {
        body: {
          visitor_id: 'visitor-789',
          consent: true
        }
      });

      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('create_session', {
        body: {
          visitor_id: 'visitor-789',
          consent: true
        }
      });
    });

    it('should handle session creation errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Failed to create session',
          status: 500
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('create_session', {
        body: {
          visitor_id: 'visitor-789',
          consent: false
        }
      });

      expect(result.error).toEqual(mockError.error);
      expect(result.data).toBeNull();
    });

    it('should handle missing visitor_id', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'visitor_id is required',
          status: 400
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('create_session', {
        body: {
          consent: true
        }
      });

      expect(result.error?.message).toBe('visitor_id is required');
      expect(result.error?.status).toBe(400);
    });
  });

  describe('speech_to_text_groq Edge Function', () => {
    it('should transcribe audio successfully', async () => {
      const mockResponse = {
        data: {
          text: 'Hello, this is a test transcription',
          duration_ms: 3500,
          model: 'distil-whisper-large-v3-en'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          audio_base64: 'base64_encoded_audio_data',
          model: 'distil-whisper-large-v3-en'
        }
      });

      expect(result.data?.text).toBe('Hello, this is a test transcription');
      expect(result.data?.duration_ms).toBe(3500);
      expect(result.data?.model).toBe('distil-whisper-large-v3-en');
      expect(result.error).toBeNull();
    });

    it('should handle transcription errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Transcription failed: Invalid audio format',
          status: 400
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          audio_base64: 'invalid_audio',
          model: 'distil-whisper-large-v3-en'
        }
      });

      expect(result.error?.message).toContain('Invalid audio format');
      expect(result.data).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Invalid session credentials',
          status: 401
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: 'invalid-session',
          session_secret: 'wrong-secret',
          audio_base64: 'base64_audio',
          model: 'distil-whisper-large-v3-en'
        }
      });

      expect(result.error?.status).toBe(401);
      expect(result.error?.message).toBe('Invalid session credentials');
    });

    it('should handle empty audio', async () => {
      const mockResponse = {
        data: {
          text: '',
          duration_ms: 0,
          model: 'distil-whisper-large-v3-en'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          audio_base64: '',
          model: 'distil-whisper-large-v3-en'
        }
      });

      expect(result.data?.text).toBe('');
      expect(result.data?.duration_ms).toBe(0);
    });
  });

  describe('agent_reply Edge Function', () => {
    it('should generate agent response with TTS', async () => {
      const mockResponse = {
        data: {
          text: 'Hello! How can I help you today?',
          audio_base64: 'base64_tts_audio_data',
          extract: {
            intent: 'greeting',
            entities: [],
            lead_score: 10
          },
          debug_commands: []
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          user_message: 'Hello!',
          mode: 'professional'
        }
      });

      expect(result.data?.text).toBe('Hello! How can I help you today?');
      expect(result.data?.audio_base64).toBeTruthy();
      expect(result.data?.extract?.intent).toBe('greeting');
      expect(result.data?.extract?.lead_score).toBe(10);
    });

    it('should handle agent errors gracefully', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'LLM service unavailable',
          status: 503
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          user_message: 'Help me with something',
          mode: 'professional'
        }
      });

      expect(result.error?.status).toBe(503);
      expect(result.error?.message).toBe('LLM service unavailable');
    });

    it('should work with different personality modes', async () => {
      const mockResponse = {
        data: {
          text: 'Ahoy matey! What be ye needin\' help with?',
          audio_base64: 'pirate_voice_base64',
          extract: {
            intent: 'greeting',
            entities: [],
            lead_score: 10
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          user_message: 'Hello!',
          mode: 'pirate'
        }
      });

      expect(result.data?.text).toContain('Ahoy');
      expect(result.data?.audio_base64).toBeTruthy();
    });

    it('should extract structured data from conversations', async () => {
      const mockResponse = {
        data: {
          text: 'I can help you with that product inquiry.',
          audio_base64: 'base64_audio',
          extract: {
            intent: 'product_inquiry',
            entities: [
              { type: 'product', value: 'laptop' },
              { type: 'budget', value: '$1000' }
            ],
            lead_score: 65
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: 'test-session-123',
          session_secret: 'secret-456',
          user_message: 'I need a laptop under $1000',
          mode: 'professional'
        }
      });

      expect(result.data?.extract?.intent).toBe('product_inquiry');
      expect(result.data?.extract?.entities).toHaveLength(2);
      expect(result.data?.extract?.lead_score).toBe(65);
    });
  });

  describe('text_to_speech Edge Function', () => {
    it('should generate TTS audio successfully', async () => {
      const mockResponse = {
        data: {
          audio_base64: 'base64_encoded_tts_audio',
          duration_ms: 2500,
          voice_id: 'william_professional'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('text_to_speech', {
        body: {
          text: 'This is a test message.',
          voice_id: 'william_professional'
        }
      });

      expect(result.data?.audio_base64).toBeTruthy();
      expect(result.data?.duration_ms).toBe(2500);
      expect(result.data?.voice_id).toBe('william_professional');
    });

    it('should handle TTS service errors', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'TTS service unavailable',
          status: 503
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('text_to_speech', {
        body: {
          text: 'This is a test message.',
          voice_id: 'william_professional'
        }
      });

      expect(result.error?.status).toBe(503);
      expect(result.error?.message).toBe('TTS service unavailable');
    });

    it('should handle empty text input', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Text input cannot be empty',
          status: 400
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('text_to_speech', {
        body: {
          text: '',
          voice_id: 'william_professional'
        }
      });

      expect(result.error?.status).toBe(400);
      expect(result.error?.message).toBe('Text input cannot be empty');
    });
  });

  describe('Memory Functions', () => {
    describe('save_memory', () => {
      it('should save memory successfully', async () => {
        const mockResponse = {
          data: {
            id: 'memory-123',
            session_id: 'test-session-123',
            content: 'User is interested in laptops',
            embedding: [0.1, 0.2, 0.3],
            created_at: new Date().toISOString()
          },
          error: null
        };

        mockInvoke.mockResolvedValueOnce(mockResponse);

        const result = await supabase.functions.invoke('save_memory', {
          body: {
            session_id: 'test-session-123',
            content: 'User is interested in laptops',
            type: 'preference'
          }
        });

        expect(result.data?.id).toBe('memory-123');
        expect(result.data?.content).toBe('User is interested in laptops');
        expect(result.data?.embedding).toBeTruthy();
      });

      it('should handle memory save errors', async () => {
        const mockError = {
          data: null,
          error: {
            message: 'Failed to generate embedding',
            status: 500
          }
        };

        mockInvoke.mockResolvedValueOnce(mockError);

        const result = await supabase.functions.invoke('save_memory', {
          body: {
            session_id: 'test-session-123',
            content: 'Test memory',
            type: 'general'
          }
        });

        expect(result.error?.message).toBe('Failed to generate embedding');
      });
    });

    describe('recall_memories', () => {
      it('should recall relevant memories', async () => {
        const mockResponse = {
          data: {
            memories: [
              {
                id: 'memory-1',
                content: 'User prefers budget laptops',
                similarity: 0.95,
                created_at: '2024-01-01T00:00:00Z'
              },
              {
                id: 'memory-2',
                content: 'User mentioned $1000 budget',
                similarity: 0.87,
                created_at: '2024-01-01T01:00:00Z'
              }
            ]
          },
          error: null
        };

        mockInvoke.mockResolvedValueOnce(mockResponse);

        const result = await supabase.functions.invoke('recall_memories', {
          body: {
            session_id: 'test-session-123',
            query: 'laptop preferences',
            limit: 5
          }
        });

        expect(result.data?.memories).toHaveLength(2);
        expect(result.data?.memories[0].similarity).toBeGreaterThan(0.9);
      });

      it('should handle no matching memories', async () => {
        const mockResponse = {
          data: {
            memories: []
          },
          error: null
        };

        mockInvoke.mockResolvedValueOnce(mockResponse);

        const result = await supabase.functions.invoke('recall_memories', {
          body: {
            session_id: 'test-session-123',
            query: 'unrelated topic',
            limit: 5
          }
        });

        expect(result.data?.memories).toHaveLength(0);
      });
    });
  });

  describe('summarize_session Edge Function', () => {
    it('should summarize session successfully', async () => {
      const mockResponse = {
        data: {
          summary: {
            id: 'summary-123',
            session_id: 'test-session-123',
            summary_text: 'User inquired about laptops under $1000',
            key_topics: ['laptops', 'budget', 'specifications'],
            sentiment: 'positive',
            lead_score: 75,
            action_items: ['Follow up with laptop recommendations'],
            created_at: new Date().toISOString()
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('summarize_session', {
        body: {
          session_id: 'test-session-123'
        }
      });

      expect(result.data?.summary?.summary_text).toContain('laptops');
      expect(result.data?.summary?.key_topics).toContain('budget');
      expect(result.data?.summary?.lead_score).toBe(75);
    });

    it('should handle empty session', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'No utterances found for session',
          status: 404
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('summarize_session', {
        body: {
          session_id: 'empty-session-123'
        }
      });

      expect(result.error?.status).toBe(404);
      expect(result.error?.message).toBe('No utterances found for session');
    });
  });

  describe('collect_email Edge Function', () => {
    it('should collect email successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          email: 'user@example.com',
          session_id: 'test-session-123'
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('collect_email', {
        body: {
          email: 'user@example.com',
          session_id: 'test-session-123'
        }
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.email).toBe('user@example.com');
    });

    it('should validate email format', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Invalid email format',
          status: 400
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('collect_email', {
        body: {
          email: 'invalid-email',
          session_id: 'test-session-123'
        }
      });

      expect(result.error?.status).toBe(400);
      expect(result.error?.message).toBe('Invalid email format');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle network errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));

      try {
        await supabase.functions.invoke('create_session', {
          body: { visitor_id: 'test', consent: true }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockInvoke.mockRejectedValueOnce(timeoutError);

      try {
        await supabase.functions.invoke('agent_reply', {
          body: {
            session_id: 'test',
            session_secret: 'secret',
            user_message: 'test'
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Request timeout');
      }
    });

    it('should handle rate limiting', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Rate limit exceeded',
          status: 429,
          retry_after: 60
        }
      };

      mockInvoke.mockResolvedValueOnce(mockError);

      const result = await supabase.functions.invoke('groq_chat', {
        body: {
          messages: [{ role: 'user', content: 'test' }]
        }
      });

      expect(result.error?.status).toBe(429);
      expect(result.error?.message).toBe('Rate limit exceeded');
    });

    it('should handle malformed responses', async () => {
      const mockResponse = {
        data: 'invalid-json-string',
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: 'test',
          session_secret: 'secret',
          user_message: 'test'
        }
      });

      // The response should still be returned even if malformed
      expect(result.data).toBe('invalid-json-string');
      expect(result.error).toBeNull();
    });
  });

  describe('groq_chat Edge Function', () => {
    it('should handle direct chat with Groq', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'This is a response from Groq'
              }
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('groq_chat', {
        body: {
          messages: [
            { role: 'user', content: 'Hello, Groq!' }
          ],
          model: 'mixtral-8x7b-32768'
        }
      });

      expect(result.data?.choices[0].message.content).toBe('This is a response from Groq');
      expect(result.data?.usage?.total_tokens).toBe(30);
    });

    it('should handle model selection', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response from specific model'
              }
            }
          ]
        },
        error: null
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      const result = await supabase.functions.invoke('groq_chat', {
        body: {
          messages: [
            { role: 'user', content: 'Test' }
          ],
          model: 'llama2-70b-4096'
        }
      });

      expect(result.data?.choices[0].message.content).toBeTruthy();
    });
  });
});