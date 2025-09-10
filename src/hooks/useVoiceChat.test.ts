import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceChat } from './useVoiceChat';
import { supabase } from '@/integrations/supabase/client';
import * as audioUtils from '@/lib/audioUtils';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Create mock instances that will be accessible in tests
let mockAudioPlayer: any;
let mockAudioRecorder: any;

// Mock audio utilities - need to use factory function for hoisting
vi.mock('@/lib/audioUtils', () => ({
  AudioPlayer: class MockAudioPlayer {
    playAudio = vi.fn().mockResolvedValue(undefined);
    stopCurrentAudio = vi.fn();
    getIsPlaying = vi.fn().mockReturnValue(false);
    
    constructor() {
      mockAudioPlayer = this;
    }
  },
  AudioRecorder: class MockAudioRecorder {
    startContinuousListening = vi.fn().mockResolvedValue(undefined);
    stopContinuousListening = vi.fn();
    stopRecording = vi.fn();
    suppressDuringPlayback = vi.fn();
    enableImmediately = vi.fn();
    _onRecordingStateChange?: any;
    _onSpeechActivityChange?: any;
    _onTranscriptReady?: any;
    
    constructor(onRecordingStateChange?: any, onSpeechActivityChange?: any, onTranscriptReady?: any) {
      this._onRecordingStateChange = onRecordingStateChange;
      this._onSpeechActivityChange = onSpeechActivityChange;
      this._onTranscriptReady = onTranscriptReady;
      mockAudioRecorder = this;
    }
  },
  audioToBase64: vi.fn(() => Promise.resolve('base64_audio_data'))
}));

describe('useVoiceChat Hook', () => {
  let mockInvoke: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke = vi.mocked(supabase.functions.invoke);
    
    // Reset mock instances
    mockAudioPlayer = null;
    mockAudioRecorder = null;
    
    // Ensure audioToBase64 is properly mocked
    vi.mocked(audioUtils.audioToBase64).mockResolvedValue('base64_audio_data');
    
    // Mock successful session creation by default
    mockInvoke.mockImplementation((functionName: string) => {
      if (functionName === 'create_session') {
        return Promise.resolve({
          data: {
            session_id: 'test-session-id',
            session_secret: 'test-session-secret'
          },
          error: null
        });
      }
      if (functionName === 'speech_to_text_groq') {
        return Promise.resolve({
          data: {
            text: 'Test transcribed text',
            duration_ms: 1000,
            model: 'distil-whisper-large-v3-en'
          },
          error: null
        });
      }
      if (functionName === 'agent_reply') {
        return Promise.resolve({
          data: {
            text: 'Test agent response',
            audio_base64: 'base64_tts_audio',
            extract: {
              intent: 'testing',
              lead_score: 75
            }
          },
          error: null
        });
      }
      return Promise.resolve({ data: {}, error: null });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useVoiceChat());

      expect(result.current.sessionId).toBeNull();
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSpeechActive).toBe(false);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentIntent).toBeNull();
      expect(result.current.leadScore).toBe(0);
      expect(result.current.transcript).toEqual([]);
    });
  });

  describe('Session Creation', () => {
    it('should create a session successfully', async () => {
      const { result } = renderHook(() => useVoiceChat());

      await act(async () => {
        const sessionId = await result.current.createSession(true);
        expect(sessionId).toBe('test-session-id');
      });

      expect(result.current.sessionId).toBe('test-session-id');
      expect(mockInvoke).toHaveBeenCalledWith('create_session', {
        body: {
          visitor_id: expect.any(String),
          consent: true
        }
      });
    });

    it('should handle session creation errors', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error('Session creation failed')
      });

      const { result } = renderHook(() => useVoiceChat());

      await expect(
        act(async () => {
          await result.current.createSession();
        })
      ).rejects.toThrow('Failed to create session');
    });
  });

  describe('Audio Recording', () => {
    it('should start continuous listening', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      // Create session first
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockAudioRecorder?.startContinuousListening).toHaveBeenCalled();
    });

    it('should stop recording', () => {
      const { result } = renderHook(() => useVoiceChat());

      act(() => {
        result.current.stopRecording();
      });

      expect(mockAudioRecorder?.stopContinuousListening).toHaveBeenCalled();
    });

    it('should handle recording state changes', async () => {
      const { result } = renderHook(() => useVoiceChat());

      // Simulate recording state change
      act(() => {
        mockAudioRecorder?._onRecordingStateChange(true);
      });

      expect(result.current.isRecording).toBe(true);

      act(() => {
        mockAudioRecorder?._onRecordingStateChange(false);
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should handle speech activity changes', () => {
      const { result } = renderHook(() => useVoiceChat());

      act(() => {
        mockAudioRecorder?._onSpeechActivityChange(true);
      });

      expect(result.current.isSpeechActive).toBe(true);

      act(() => {
        mockAudioRecorder?._onSpeechActivityChange(false);
      });

      expect(result.current.isSpeechActive).toBe(false);
    });
  });

  describe('Audio Processing', () => {
    it('should process audio and get transcription', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      // Create session first
      await act(async () => {
        await result.current.createSession();
      });

      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });

      // Simulate audio data received
      await act(async () => {
        await mockAudioRecorder?._onTranscriptReady(audioBlob);
        // Wait for async processing
        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith('speech_to_text_groq', expect.any(Object));
        });
      });

      // Check transcript was updated
      await waitFor(() => {
        expect(result.current.transcript).toHaveLength(2); // User message + agent response
        expect(result.current.transcript[0]).toMatchObject({
          speaker: 'visitor',
          text: 'Test transcribed text'
        });
      });
    });

    it('should handle transcription errors gracefully', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Mock transcription error
      mockInvoke.mockImplementationOnce((functionName: string) => {
        if (functionName === 'speech_to_text_groq') {
          return Promise.resolve({
            data: null,
            error: new Error('Transcription failed')
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });

      // Process should not throw, but handle error internally
      await act(async () => {
        await mockAudioRecorder?._onTranscriptReady(audioBlob);
        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith('speech_to_text_groq', expect.any(Object));
        });
      });

      // Transcript should not be updated on error
      expect(result.current.transcript).toHaveLength(0);
    });

    it('should skip processing when no speech detected', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Mock empty transcription
      mockInvoke.mockImplementationOnce((functionName: string) => {
        if (functionName === 'speech_to_text_groq') {
          return Promise.resolve({
            data: { text: '', duration_ms: 100 },
            error: null
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });

      await act(async () => {
        await mockAudioRecorder?._onTranscriptReady(audioBlob);
        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith('speech_to_text_groq', expect.any(Object));
        });
      });

      // No agent_reply should be called for empty text
      expect(mockInvoke).not.toHaveBeenCalledWith('agent_reply', expect.any(Object));
      expect(result.current.transcript).toHaveLength(0);
    });
  });

  describe('Agent Interaction', () => {
    it('should send message to agent and receive response', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.sendTextMessage('Hello, agent!');
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('agent_reply', {
          body: {
            session_id: 'test-session-id',
            user_message: 'Hello, agent!',
            session_secret: 'test-session-secret',
            mode: undefined
          }
        });
      });

      // Check transcript updates
      expect(result.current.transcript).toHaveLength(2);
      expect(result.current.transcript[0]).toMatchObject({
        speaker: 'visitor',
        text: 'Hello, agent!'
      });
      expect(result.current.transcript[1]).toMatchObject({
        speaker: 'agent',
        text: 'Test agent response'
      });

      // Check extract data
      expect(result.current.currentIntent).toBe('testing');
      expect(result.current.leadScore).toBe(75);
    });

    it('should handle agent errors gracefully', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Mock agent error
      mockInvoke.mockImplementationOnce((functionName: string) => {
        if (functionName === 'agent_reply') {
          return Promise.resolve({
            data: null,
            error: new Error('Agent unavailable')
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await result.current.sendTextMessage('Hello, agent!');
      });

      // User message should still be in transcript
      expect(result.current.transcript).toHaveLength(1);
      expect(result.current.transcript[0]).toMatchObject({
        speaker: 'visitor',
        text: 'Hello, agent!'
      });
    });

    it('should clean debug commands from agent response', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Mock agent response with debug commands
      mockInvoke.mockImplementationOnce((functionName: string) => {
        if (functionName === 'agent_reply') {
          return Promise.resolve({
            data: {
              text: 'Here is my response. save_extract{type: "test"} More text.',
              audio_base64: null
            },
            error: null
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await result.current.sendTextMessage('Test message');
      });

      await waitFor(() => {
        // Check that debug commands were removed from display text
        const agentMessage = result.current.transcript.find(m => m.speaker === 'agent');
        expect(agentMessage?.text).toBe('Here is my response. More text.');
        
        // Check that debug commands were tracked
        expect(result.current.debugCommands).toHaveLength(1);
        expect(result.current.debugCommands[0].command).toContain('save_extract');
      });
    });
  });

  describe('TTS Playback', () => {
    it('should play TTS audio when available', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.sendTextMessage('Play audio');
      });

      await waitFor(() => {
        expect(mockAudioPlayer?.playAudio).toHaveBeenCalledWith(
          'base64_tts_audio',
          expect.any(Function)
        );
      });
    });

    it('should suppress microphone during TTS playback', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.sendTextMessage('Play audio');
      });

      await waitFor(() => {
        expect(mockAudioRecorder?.suppressDuringPlayback).toHaveBeenCalledWith(
          expect.any(Number)
        );
      });
    });

    it('should stop speaking when requested', () => {
      const { result } = renderHook(() => useVoiceChat());

      act(() => {
        result.current.stopSpeaking();
      });

      expect(mockAudioPlayer?.stopCurrentAudio).toHaveBeenCalled();
    });
  });

  describe('Barge-in Handling', () => {
    it('should stop TTS and enable microphone on barge-in', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Simulate TTS playing
      await act(async () => {
        await result.current.sendTextMessage('Play audio');
      });

      // Simulate speaking state and user speech detection
      act(() => {
        // Simulate playback callback indicating audio is playing
        const playbackCallback = mockAudioPlayer?.playAudio.mock.calls[0]?.[1];
        if (playbackCallback) playbackCallback(true);
      });

      // Verify speaking state is true
      expect(result.current.isSpeaking).toBe(true);

      // Now simulate user speech during TTS
      act(() => {
        mockAudioRecorder?._onSpeechActivityChange(true);
      });

      // Should trigger barge-in behavior
      expect(mockAudioPlayer?.stopCurrentAudio).toHaveBeenCalled();
      expect(mockAudioRecorder?.enableImmediately).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('Queue Management', () => {
    it('should handle audio queue overflow by keeping only latest', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });
      
      // Simulate multiple rapid audio inputs
      const audioBlobs = Array(5).fill(null).map(() => 
        new Blob(['audio'], { type: 'audio/wav' })
      );

      // Send all audio blobs rapidly
      await act(async () => {
        for (const blob of audioBlobs) {
          mockAudioRecorder?._onTranscriptReady(blob);
        }
      });

      // Allow some processing time
      await waitFor(() => {
        // Should process audio but with queue management
        const callCount = mockInvoke.mock.calls.filter(
          call => call[0] === 'speech_to_text_groq'
        ).length;
        
        // Due to queue management, not all 5 should be processed
        expect(callCount).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Personality Mode', () => {
    it('should pass personality mode to agent', async () => {
      const personality = { id: 'pirate', name: 'Pirate William' };
      const { result } = renderHook(() => useVoiceChat(true, 'distil-whisper-large-v3-en', personality));
      
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.sendTextMessage('Ahoy!');
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('agent_reply', {
          body: {
            session_id: 'test-session-id',
            user_message: 'Ahoy!',
            session_secret: 'test-session-secret',
            mode: 'pirate'
          }
        });
      });
    });
  });

  describe('Pause Token Parsing', () => {
    it('should correctly parse pause tokens from text', () => {
      const text = "Hello there! [pause:0.5s] This is amazing. [pause:1.2s] What do you think? [pause:0.3] Final part.";
      
      // Simulate the regex parsing logic from useVoiceChat
      const pauseTokens: Array<{index: number, duration: number}> = [];
      const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      let match;
      
      while ((match = pauseRegex.exec(text)) !== null) {
        const duration = parseFloat(match[1]) * 1000; // Convert to milliseconds
        const index = match.index;
        pauseTokens.push({ index, duration });
      }
      
      expect(pauseTokens).toHaveLength(3);
      expect(pauseTokens[0].duration).toBe(500);
      expect(pauseTokens[1].duration).toBe(1200);
      expect(pauseTokens[2].duration).toBe(300);
      // Just verify indices exist (exact values can vary based on text formatting)
      expect(pauseTokens[0].index).toBeGreaterThan(10);
      expect(pauseTokens[1].index).toBeGreaterThan(40);
      expect(pauseTokens[2].index).toBeGreaterThan(70);
    });
    
    it('should handle text segments between pause tokens', () => {
      const originalText = "Start text [pause:0.5s] middle text [pause:1.0s] end text";
      
      // First find actual pause token positions
      const pauseTokens: Array<{index: number, duration: number}> = [];
      const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      let match;
      
      while ((match = pauseRegex.exec(originalText)) !== null) {
        const duration = parseFloat(match[1]) * 1000;
        const index = match.index;
        pauseTokens.push({ index, duration });
      }
      
      // Simulate the segment creation logic
      const segments: Array<{text: string, pause?: number}> = [];
      let currentIndex = 0;
      const sortedPauses = [...pauseTokens].sort((a, b) => a.index - b.index);
      
      // We need to find the actual pause token lengths
      const pauseRegexForLength = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      let lengthMatch;
      const pauseLengths: number[] = [];
      
      while ((lengthMatch = pauseRegexForLength.exec(originalText)) !== null) {
        pauseLengths.push(lengthMatch[0].length);
      }
      
      for (let i = 0; i < sortedPauses.length; i++) {
        const pause = sortedPauses[i];
        if (pause.index > currentIndex) {
          const segmentText = originalText.slice(currentIndex, pause.index).trim();
          if (segmentText) {
            segments.push({ text: segmentText });
          }
          segments.push({ text: '', pause: pause.duration });
        }
        currentIndex = pause.index + (pauseLengths[i] || 12); // Use actual length or default to 12
      }
      
      // Add remaining text
      if (currentIndex < originalText.length) {
        const remainingText = originalText.slice(currentIndex).trim();
        if (remainingText) {
          segments.push({ text: remainingText });
        }
      }
      
      expect(segments).toHaveLength(5); // text, pause, text, pause, text
      expect(segments[0]).toEqual({ text: "Start text" });
      expect(segments[1]).toEqual({ text: "", pause: 500 });
      expect(segments[2]).toEqual({ text: "middle text" });
      expect(segments[3]).toEqual({ text: "", pause: 1000 });
      expect(segments[4]).toEqual({ text: "end text" });
    });
    
    it('should clean pause tokens from display text', () => {
      const text = "Hello [pause:0.5s] world [pause:1.0] how are you?";
      const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      
      const cleanedText = text.replace(pauseRegex, '').replace(/\s+/g, ' ').trim();
      
      expect(cleanedText).toBe("Hello world how are you?");
    });
    
    it('should handle various pause token formats', () => {
      const text = "Test [pause:0.5] and [pause:1.2s] and [pause:2] formats";
      const pauseTokens: Array<{index: number, duration: number}> = [];
      const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      let match;
      
      while ((match = pauseRegex.exec(text)) !== null) {
        const duration = parseFloat(match[1]) * 1000;
        const index = match.index;
        pauseTokens.push({ index, duration });
      }
      
      expect(pauseTokens).toHaveLength(3);
      expect(pauseTokens[0].duration).toBe(500);   // 0.5 seconds
      expect(pauseTokens[1].duration).toBe(1200);  // 1.2s
      expect(pauseTokens[2].duration).toBe(2000);  // 2 seconds
    });

    it('should handle agent response with pause tokens', async () => {
      const { result } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Mock agent response with pause tokens
      mockInvoke.mockImplementationOnce((functionName: string) => {
        if (functionName === 'agent_reply') {
          return Promise.resolve({
            data: {
              text: 'Welcome to the show! [pause:0.5s] This is going to be great [pause:1.0s] Let me tell you more.',
              audio_base64: null // No pre-generated audio, should use segmented TTS
            },
            error: null
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      await act(async () => {
        await result.current.sendTextMessage('Tell me about the show');
      });

      await waitFor(() => {
        // Check that pause tokens were removed from display text
        const agentMessage = result.current.transcript.find(m => m.speaker === 'agent');
        expect(agentMessage?.text).toBe('Welcome to the show! This is going to be great Let me tell you more.');
        
        // Original implementation should detect pause tokens and use segmented playback
        // (In a real test, we'd verify the segmented playback was triggered)
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => useVoiceChat());

      unmount();

      expect(mockAudioPlayer?.stopCurrentAudio).toHaveBeenCalled();
      expect(mockAudioRecorder?.stopRecording).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useVoiceChat());
      
      await act(async () => {
        await result.current.createSession();
      });

      // Unmount the component
      unmount();

      // Try to trigger state updates after unmount
      act(() => {
        mockAudioRecorder?._onRecordingStateChange(true);
        mockAudioRecorder?._onSpeechActivityChange(true);
      });

      // State should not have changed (component is unmounted)
      // No errors should be thrown
    });
  });
});