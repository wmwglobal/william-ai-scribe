import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer, AudioRecorder, audioToBase64 } from '@/lib/audioUtils';
import type { CreateSessionResponse, AgentReplyResponse } from '@/lib/types';

export function useVoiceChat(audioEnabled: boolean = true, asrModel: string = 'distil-whisper-large-v3-en', personality?: any) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState(0);
  const [transcript, setTranscript] = useState<Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date}>>([]);
  const [debugCommands, setDebugCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  
  const audioPlayer = new AudioPlayer((playing) => setIsSpeaking(playing));
  const audioRecorder = new AudioRecorder(
    handleAudioData,
    (recording) => setIsRecording(recording)
  );

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
      setSessionId(response.session_id);
      setSessionSecret(response.session_secret);
      return response.session_id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async function handleAudioData(audioBlob: Blob) {
    if (!sessionId || !sessionSecret) return;

    try {
      console.log('🎤 Processing audio with ASR model:', asrModel);
      
      // Convert to base64
      const audioBase64 = await audioToBase64(audioBlob);
      
      // Call speech-to-text API
      const { data, error } = await supabase.functions.invoke('speech_to_text_groq', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          audio_base64: audioBase64,
          model: asrModel
        }
      });

      if (error) {
        console.error('ASR error:', error);
        throw new Error('Speech recognition failed');
      }

      const userMessage = data.text?.trim();
      if (!userMessage) {
        console.log('No speech detected in audio');
        return;
      }

      console.log('🎤 ASR result:', { text: userMessage, duration: data.duration_ms, model: data.model });
      
      // Add user message to transcript
      setTranscript(prev => [...prev, {
        speaker: 'visitor',
        text: userMessage,
        timestamp: new Date()
      }]);

      // Send to agent for processing
      await sendToAgent(userMessage);
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  async function sendToAgent(userMessage: string) {
    if (!sessionId || !sessionSecret) return;

    try {
      // Add a natural delay before showing typing indicator (1-4 seconds)
      const initialDelay = Math.random() * 3000 + 1000;
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      
      // Show typing indicator
      setIsTyping(true);
      
      // Keep typing indicator visible for a minimum time (2-4 seconds)
      const typingDuration = Math.random() * 2000 + 2000;
      // Start the API call and typing timer in parallel
      const [response] = await Promise.all([
        supabase.functions.invoke('agent_reply', {
          body: {
            session_id: sessionId,
            user_message: userMessage,
            session_secret: sessionSecret,
            mode: personality?.id
          }
        }),
        new Promise(resolve => setTimeout(resolve, typingDuration))
      ]);

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
      }

      // Play TTS audio if available and audio is enabled
      if (agentResponse.audio_base64 && audioEnabled) {
        console.log('🎵 useVoiceChat: Playing TTS audio, length:', agentResponse.audio_base64.length);
        await audioPlayer.playAudio(agentResponse.audio_base64);
        
        // Handle debug commands from TTS response
        if (agentResponse.debug_commands && agentResponse.debug_commands.length > 0) {
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
    } finally {
      setIsTyping(false);
    }
  }

  async function startRecording() {
    try {
      await audioRecorder.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  function stopRecording() {
    audioRecorder.stopRecording();
  }

  function stopSpeaking() {
    audioPlayer.stopCurrentAudio();
  }

  async function sendTextMessage(message: string) {
    if (!sessionId || !sessionSecret) return;
    
    // Add to transcript
    setTranscript(prev => [...prev, {
      speaker: 'visitor',
      text: message,
      timestamp: new Date()
    }]);

    // Send to agent
    await sendToAgent(message);
  }

  return {
    sessionId,
    isRecording,
    isSpeaking,
    isTyping,
    currentIntent,
    leadScore,
    transcript,
    debugCommands,
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  };
}