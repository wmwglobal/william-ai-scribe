import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer, AudioRecorder, audioToBase64 } from '@/lib/audioUtils';
import type { CreateSessionResponse, AgentReplyResponse } from '@/lib/types';

export function useVoiceChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
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
    if (!sessionId) return;

    try {
      // Show typing indicator
      setIsTyping(true);
      
      // Add a small delay to make it feel more human
      await new Promise(resolve => setTimeout(resolve, 800));
      const { data, error } = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          user_message: userMessage
        }
      });

      if (error) throw error;

      const response = data as AgentReplyResponse;
      
      // Add agent response to transcript
      setTranscript(prev => [...prev, {
        speaker: 'agent',
        text: response.text,
        timestamp: new Date()
      }]);

      // Update intent and lead score if available
      if (response.extract) {
        setCurrentIntent(response.extract.intent);
        setLeadScore(response.extract.lead_score || 0);
      }

      // Play TTS audio if available
      if (response.audio_base64) {
        await audioPlayer.playAudio(response.audio_base64);
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
    if (!sessionId) return;
    
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