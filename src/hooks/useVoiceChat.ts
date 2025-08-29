import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer, AudioRecorder, audioToBase64 } from '@/lib/audioUtils';
import type { CreateSessionResponse, AgentReplyResponse } from '@/lib/types';

export function useVoiceChat(audioEnabled: boolean = true, asrModel: string = 'distil-whisper-large-v3-en', personality?: any) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false); // Voice activity detection
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState(0);
  const [latestExtract, setLatestExtract] = useState<any>(null);
  const [transcript, setTranscript] = useState<Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date}>>([]);
  // Track the "turn" to cancel/ignore stale responses on barge-in
  const turnIdRef = useRef(0);

  const [debugCommands, setDebugCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  
  // Use refs to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);
  const audioQueueRef = useRef<Blob[]>([]);
  const isProcessingQueueRef = useRef(false);
  
  // Initialize audio utilities
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize audio player and recorder with new simplified interface
    audioPlayerRef.current = new AudioPlayer();
    
    // Create the audio recorder with the new simplified interface
    const recorder = new AudioRecorder(
      (recording) => {
        console.log('🎤 Recording state changed:', recording);
        if (isMountedRef.current) setIsRecording(recording);
      },
      (speechActive) => {
        console.log('🎤 Speech activity changed:', speechActive);
        if (isMountedRef.current) setIsSpeaking(speechActive);
      },
      (audioBlob) => {
        console.log('🎤 📝 Audio blob received, size:', audioBlob.size);
        handleAudioData(audioBlob);
      }
    );
    audioRecorderRef.current = recorder;

    return () => {
      isMountedRef.current = false;
      audioPlayerRef.current?.stopCurrentAudio();
      audioRecorderRef.current?.stopRecording();
    };
  }, [sessionId, sessionSecret]); // Add dependencies so it recreates when session changes

  // Barge-in: if user starts speaking while TTS is playing, stop audio and invalidate current turn
  useEffect(() => {
    if (isSpeaking && isSpeechActive) {
      console.log('🛑 BARGE-IN: user speech detected during TTS playback. Stopping audio and cancelling in-flight turn.');
      audioPlayerRef.current?.stopCurrentAudio();
      // Re-enable microphone immediately for barge-in
      audioRecorderRef.current?.enableImmediately();
      // Invalidate current turn so any late responses are ignored
      turnIdRef.current += 1;
    }
  }, [isSpeaking, isSpeechActive]);

  // Queue-based audio processing to prevent backlog
  async function processAudioQueue() {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    
    try {
      while (audioQueueRef.current.length > 0 && isMountedRef.current) {
        // Only keep the most recent audio if queue gets too long
        if (audioQueueRef.current.length > 2) {
          console.log('🎤 ⚠️ Queue too long, keeping only latest audio');
          audioQueueRef.current = [audioQueueRef.current[audioQueueRef.current.length - 1]];
        }
        
        const audioBlob = audioQueueRef.current.shift()!;
        await processAudioBlob(audioBlob);
        
        // Add small delay between processing
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }

  async function handleAudioData(audioBlob: Blob) {
    if (!sessionId || !sessionSecret || !isMountedRef.current) {
      console.log('🎤 BLOCKED: Missing session or unmounted');
      return;
    }
    
    // Add to queue instead of processing immediately
    audioQueueRef.current.push(audioBlob);
    console.log('🎤 Added to queue, length:', audioQueueRef.current.length);
    
    // Start processing queue
    processAudioQueue();
  }

  async function processAudioBlob(audioBlob: Blob) {
    const myTurn = ++turnIdRef.current;
    console.log('🎤 ===== processAudioBlob START =====');
    console.log('🎤 Blob size:', audioBlob.size, 'bytes');

    try {
      processingRef.current = true;
      if (isMountedRef.current) setIsProcessing(true);
      
      console.log('🎤 Processing audio with ASR model:', asrModel);
      console.log('🎤 Converting to base64...');
      
      // Convert to base64
      const audioBase64 = await audioToBase64(audioBlob);
      console.log('🎤 ✅ Base64 conversion complete, length:', audioBase64.length);
      console.log('🎤 Base64 preview:', audioBase64.substring(0, 100) + '...');
      
      console.log('🎤 🚀 About to call speech_to_text_groq edge function...');
      
      console.log('🎤 Calling speech_to_text_groq edge function...');
      // Call speech-to-text API
      const { data, error } = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          audio_base64: audioBase64,
          model: asrModel
        }
      });

      console.log('🎤 ⬅️ Edge function response received');
      console.log('🎤 Response data:', data);
      console.log('🎤 Response error:', error);

      if (error) {
        console.error('🎤 ❌ ASR error:', error);
        throw new Error('Speech recognition failed: ' + (error.message || 'Unknown error'));
      }

      const userMessage = data.text?.trim();
      console.log('🎤 📝 Extracted text from ASR:', userMessage);
      console.log('🎤 Text length:', userMessage?.length || 0);
      
      if (!userMessage) {
        console.log('🎤 ⚠️ No speech detected in audio - stopping processing');
        return;
      }

      console.log('🎤 ✅ ASR SUCCESS:', { text: userMessage, duration: data.duration_ms, model: data.model });
      
      // Add user message to transcript
      if (isMountedRef.current) {
        
        // Stale turn? If user barged in, ignore this response.
        if (myTurn !== turnIdRef.current) {
          console.log('⏭️ Ignoring agent text due to barge-in.');
          return;
        }
        setTranscript(prev => [...prev, {
          speaker: 'visitor',
          text: userMessage,
          timestamp: new Date()
        }]);
      }

      // Send to agent for processing
      console.log('🎤 🤖 About to send to agent:', userMessage);
      await sendToAgent(userMessage, myTurn);
      console.log('🎤 ✅ Agent processing complete');
    } catch (error) {
      console.error('🎤 ❌ Error processing audio:', error);
      console.error('🎤 Error stack:', error.stack);
    } finally {
      processingRef.current = false;
      if (isMountedRef.current) setIsProcessing(false);
      console.log('🎤 ===== handleAudioData END =====');
    }
  }


  async function createSession(consent: boolean = false): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('create_session', {
        body: {
          visitor_id: crypto.randomUUID(),
          consent
        }
      });

      if (error) throw error;

      const response = data as CreateSessionResponse;
      if (isMountedRef.current) {
        setSessionId(response.session_id);
        setSessionSecret(response.session_secret);
      }
      return response.session_id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async function sendToAgent(userMessage: string, myTurn?: number) {
    if (!sessionId || !sessionSecret || !isMountedRef.current) {
      console.log('🤖 Skipping agent request - session not ready or component unmounted');
      return;
    }

    console.log('🤖 ===== SENDING TO AGENT =====');
    console.log('🤖 User message:', userMessage);
    console.log('🤖 Session ID:', sessionId);
    console.log('🤖 Audio enabled:', audioEnabled);

    try {
      // Show typing indicator immediately
      if (isMountedRef.current) setIsTyping(true);
      
      // If a barge-in occurred, abandon this turn early
      if (myTurn !== undefined && myTurn !== turnIdRef.current) {
        console.log('⏩ Abandoning turn due to barge-in before agent call.');
        return;
      }
      
      const response = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          user_message: userMessage,
          session_secret: sessionSecret,
          mode: personality?.id
        }
      });

      console.log('🤖 Agent response received:', {
        hasError: !!response.error,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      if (response.error) throw response.error;

      const agentResponse = response.data as AgentReplyResponse;
      
      console.log('🤖 Agent response details:', {
        text: agentResponse.text?.substring(0, 100) + '...',
        hasAudio: !!agentResponse.audio_base64,
        audioLength: agentResponse.audio_base64?.length || 0
      });
      
      // Clean debug commands from display text
      let displayText = agentResponse.text;
      const debugCommands: string[] = [];
      
      // Extract and remove save_extract commands (multiple formats)
      const saveExtractRegex1 = /save_extract\{[^}]*\}/gi;
      const saveExtractRegex2 = /Save_extract:\s*[^.]*\./gi;
      
      const matches1 = displayText.match(saveExtractRegex1);
      const matches2 = displayText.match(saveExtractRegex2);
      
      if (matches1) {
        debugCommands.push(...matches1);
        displayText = displayText.replace(saveExtractRegex1, '').trim();
      }
      if (matches2) {
        debugCommands.push(...matches2);
        displayText = displayText.replace(saveExtractRegex2, '').trim();
      }
      
      // Clean up any extra whitespace
      displayText = displayText.replace(/\s+/g, ' ').trim();
      
      // Add agent response to transcript with cleaned text
      if (isMountedRef.current) {
        setTranscript(prev => [...prev, {
          speaker: 'agent',
          text: displayText,
          timestamp: new Date()
        }]);
        
        // Add debug commands to debug state
        if (debugCommands.length > 0) {
          setDebugCommands(prev => [
            ...prev,
            ...debugCommands.map((cmd: string) => ({
              command: cmd,
              timestamp: new Date()
            }))
          ]);
        }

        // Update intent and lead score if available
        if (agentResponse.extract) {
          setCurrentIntent(agentResponse.extract.intent);
          setLeadScore(agentResponse.extract.lead_score || 0);
          setLatestExtract(agentResponse.extract);
        }
      }

      // Stop showing "thinking" indicator before playing audio
      if (isMountedRef.current) setIsTyping(false);

      // Play TTS audio if available and audio is enabled
      if (agentResponse.audio_base64 && audioEnabled && audioPlayerRef.current) {
        console.log('🎵 useVoiceChat: Playing TTS audio, length:', agentResponse.audio_base64.length);
        
        // Stale turn? If user barged in, skip audio playback.
        if (myTurn !== undefined && myTurn !== turnIdRef.current) {
          console.log('🔇 Skipping audio playbook due to barge-in.');
          return;
        }
        
        // Suppress microphone during TTS playback to prevent feedback
        const audioLength = agentResponse.audio_base64.length;
        const estimatedDuration = Math.max(3000, (audioLength / 1000) * 50); // Rough estimate
        audioRecorderRef.current?.suppressDuringPlayback(estimatedDuration);
        
        await audioPlayerRef.current.playAudio(agentResponse.audio_base64, (isPlaying) => {
          if (!isPlaying) {
            // Re-enable microphone when audio playback ends
            setTimeout(() => {
              audioRecorderRef.current?.enableImmediately();
            }, 500); // Small delay to ensure audio output has fully stopped
          }
        });
        
        // Handle debug commands from TTS response
        if (agentResponse.debug_commands && agentResponse.debug_commands.length > 0 && isMountedRef.current) {
          setDebugCommands(prev => [
            ...prev,
            ...agentResponse.debug_commands.map((cmd: string) => ({
              command: cmd,
              timestamp: new Date()
            }))
          ]);
        }
      } else {
        console.log('🎵 useVoiceChat: No audio to play', {
          hasAudio: !!agentResponse.audio_base64,
          audioEnabled,
          audioLength: agentResponse.audio_base64?.length || 0
        });
      }

    } catch (error) {
      console.error('Error sending to agent:', error);
      // Ensure typing indicator is turned off on error
      if (isMountedRef.current) setIsTyping(false);
    }
  }

  async function startRecording() {
    try {
      if (audioRecorderRef.current) {
        await audioRecorderRef.current.startContinuousListening();
      }
    } catch (error) {
      console.error('Error starting continuous listening:', error);
      throw error;
    }
  }

  function stopRecording() {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stopContinuousListening();
    }
  }

  function stopSpeaking() {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopCurrentAudio();
    }
  }

  async function sendTextMessage(message: string) {
    if (!sessionId || !sessionSecret || !isMountedRef.current) return;
    
    // Add to transcript
    if (isMountedRef.current) {
      setTranscript(prev => [...prev, {
        speaker: 'visitor',
        text: message,
        timestamp: new Date()
      }]);
    }

    // Send to agent
    await sendToAgent(message);
  }

  return {
    sessionId,
    isRecording,
    isSpeaking,
    isSpeechActive,
    isTyping,
    isProcessing,
    currentIntent,
    leadScore,
    latestExtract,
    transcript,
    debugCommands,
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  };
}