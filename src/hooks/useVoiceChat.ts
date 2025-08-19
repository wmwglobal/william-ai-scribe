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
  const [debugCommands, setDebugCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  
  // Use refs to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);
  
  // Initialize audio utilities
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize audio player and recorder
    audioPlayerRef.current = new AudioPlayer((playing) => {
      if (isMountedRef.current) setIsSpeaking(playing);
    });
    
    // Create the audio recorder with the callback function
    const recorder = new AudioRecorder(
      (audioBlob: Blob) => {
        console.log('🎤 ===== AUDIO CALLBACK TRIGGERED =====');
        console.log('🎤 AudioRecorder callback triggered with blob size:', audioBlob.size);
        console.log('🎤 Blob type:', audioBlob.type);
        console.log('🎤 Session state:', { sessionId, sessionSecret: !!sessionSecret });
        console.log('🎤 Component mounted:', isMountedRef.current);
        console.log('🎤 Processing state:', processingRef.current);
        console.log('🎤 About to call handleAudioData...');
        handleAudioData(audioBlob);
      },
      (recording) => {
        console.log('🎤 Recording state changed:', recording);
        if (isMountedRef.current) setIsRecording(recording);
      },
      (speechActive) => {
        console.log('🎤 Speech activity changed:', speechActive);
        if (isMountedRef.current) setIsSpeechActive(speechActive);
      }
    );
    audioRecorderRef.current = recorder;

    return () => {
      isMountedRef.current = false;
      audioPlayerRef.current?.stopCurrentAudio();
      audioRecorderRef.current?.stopRecording();
    };
  }, [sessionId, sessionSecret]); // Add dependencies so it recreates when session changes

  async function handleAudioData(audioBlob: Blob) {
    console.log('🎤 ===== handleAudioData START =====');
    console.log('🎤 Blob size:', audioBlob.size, 'bytes');
    console.log('🎤 Session ID:', sessionId);
    console.log('🎤 Session Secret:', sessionSecret ? 'Present' : 'Missing');
    console.log('🎤 Processing ref:', processingRef.current);
    console.log('🎤 Mounted ref:', isMountedRef.current);
    
    if (!sessionId) {
      console.error('🎤 BLOCKED: No session ID');
      return;
    }
    
    if (!sessionSecret) {
      console.error('🎤 BLOCKED: No session secret');
      return;
    }
    
    if (processingRef.current) {
      console.error('🎤 BLOCKED: Already processing');
      return;
    }
    
    if (!isMountedRef.current) {
      console.error('🎤 BLOCKED: Component unmounted');
      return;
    }

    console.log('🎤 All checks passed, starting processing...');

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
        setTranscript(prev => [...prev, {
          speaker: 'visitor',
          text: userMessage,
          timestamp: new Date()
        }]);
      }

      // Send to agent for processing
      console.log('🎤 🤖 About to send to agent:', userMessage);
      await sendToAgent(userMessage);
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

  async function sendToAgent(userMessage: string) {
    if (!sessionId || !sessionSecret || !isMountedRef.current) {
      console.log('🤖 Skipping agent request - session not ready or component unmounted');
      return;
    }

    try {
      // Show typing indicator immediately
      if (isMountedRef.current) setIsTyping(true);
      
      const response = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          user_message: userMessage,
          session_secret: sessionSecret,
          mode: personality?.id
        }
      });

      if (response.error) throw response.error;

      const agentResponse = response.data as AgentReplyResponse;
      
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
        await audioPlayerRef.current.playAudio(agentResponse.audio_base64);
        
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