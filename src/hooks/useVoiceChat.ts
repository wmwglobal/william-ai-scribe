import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer, AudioRecorder, audioToBase64 } from '@/lib/audioUtils';
import type { CreateSessionResponse, AgentReplyResponse } from '@/lib/types';

export function useVoiceChat(audioEnabled: boolean = true) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState(0);
  const [transcript, setTranscript] = useState<Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date}>>([]);
  
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
    if (!sessionId) return;

    try {
      // For now, we'll simulate speech recognition
      // In production, you'd send this to Deepgram or another ASR service
      const userMessage = "I'm interested in learning about AI consulting services for my company";
      
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
            session_secret: sessionSecret
          }
        }),
        new Promise(resolve => setTimeout(resolve, typingDuration))
      ]);

      if (response.error) throw response.error;

      const agentResponse = response.data as AgentReplyResponse;
      
      // Add agent response to transcript
      setTranscript(prev => [...prev, {
        speaker: 'agent',
        text: agentResponse.text,
        timestamp: new Date()
      }]);

      // Update intent and lead score if available
      if (agentResponse.extract) {
        setCurrentIntent(agentResponse.extract.intent);
        setLeadScore(agentResponse.extract.lead_score || 0);
      }

      // Play TTS audio if available and audio is enabled
      if (agentResponse.audio_base64 && audioEnabled) {
        await audioPlayer.playAudio(agentResponse.audio_base64);
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
    createSession,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextMessage
  };
}