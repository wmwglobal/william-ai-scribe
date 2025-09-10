import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer, AudioRecorder, audioToBase64 } from '@/lib/audioUtils';
import type { CreateSessionResponse, AgentReplyResponse } from '@/lib/types';
// Memory and action hooks temporarily disabled for stable launch
// import { useMemories } from './useMemories';
// import { useActionItems } from './useActionItems';
import { EnhancedVAD, OptimizedAudioQueue, ResponseOptimizer, FAST_RESPONSE_CONFIG } from '@/lib/voiceOptimizations';

export function useVoiceChat(audioEnabled: boolean = true, asrModel: string = 'distil-whisper-large-v3-en', personality?: any, isPerformerMode: boolean = false, selectedModel?: any, isUserTyping: boolean = false) {
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
  const [transcript, setTranscript] = useState<Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date, turnId?: number}>>([]);
  // Track the "turn" to cancel/ignore stale responses on barge-in
  const turnIdRef = useRef(0);
  
  // Conversation keep-alive system
  const keepAliveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityTimeRef = useRef(Date.now());
  
  // Smart interruption system - track last user speech
  const lastUserSpeechRef = useRef<{text: string, timestamp: number} | null>(null);

  const [debugCommands, setDebugCommands] = useState<Array<{command: string, timestamp: Date}>>([]);
  
  // Use refs to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const processingRef = useRef(false);
  const audioQueueRef = useRef<Blob[]>([]);
  const isProcessingQueueRef = useRef(false);
  
  // Enhanced components for better performance
  const enhancedVAD = useRef<EnhancedVAD | null>(null);
  const optimizedQueue = useRef<OptimizedAudioQueue | null>(null);

  /**
   * Generate a proactive follow-up based on recent conversation
   */
  async function generateProactiveResponse(): Promise<string> {
    if (!sessionId || !sessionSecret) return '';
    
    // Get recent conversation context
    const recentMessages = transcript.slice(-6); // Last 6 messages for context
    const lastUserMessage = transcript.filter(t => t.speaker === 'visitor').slice(-1)[0];
    const conversationTopic = lastUserMessage?.text || 'our conversation';
    
    // Create a proactive prompt
    const proactivePrompts = [
      `That reminds me of something fascinating about ${conversationTopic}...`,
      `Speaking of ${conversationTopic}, I've been thinking about how it connects to something I learned recently.`,
      `You know what's interesting about what we were discussing? Let me share a perspective you might not have considered.`,
      `This conversation about ${conversationTopic} actually brings to mind a story that might resonate with you.`,
      `I've been processing what you said about ${conversationTopic}, and it made me think of an analogy that might be illuminating.`,
      `There's another angle to ${conversationTopic} that I find particularly compelling - let me walk you through it.`
    ];
    
    const selectedPrompt = proactivePrompts[Math.floor(Math.random() * proactivePrompts.length)];
    
    try {
      const { data, error } = await supabase.functions.invoke('agent_reply', {
        body: {
          session_id: sessionId,
          session_secret: sessionSecret,
          user_message: `${selectedPrompt} [PROACTIVE_FOLLOWUP: true]`,
          model: selectedModel?.id || 'llama-3.3-70b-versatile',
          context: {
            recent_messages: recentMessages.map(m => `${m.speaker}: ${m.text}`),
            is_followup: true,
            conversation_topic: conversationTopic
          }
        }
      });

      if (error) throw error;
      return data?.text || "Let me share something interesting that came to mind...";
      
    } catch (error) {
      console.error('Error generating proactive response:', error);
      return "You know, that conversation got me thinking about something I'd love to explore with you...";
    }
  }

  /**
   * Handle conversation lull with proactive content
   */
  async function handleConversationLull() {
    if (!sessionId || isSpeaking || isProcessing) return;
    
    console.log('🤖 Conversation lull detected - generating proactive response');
    
    try {
      setIsTyping(true);
      const proactiveMessage = await generateProactiveResponse();
      
      if (proactiveMessage && isMountedRef.current) {
        // Add to transcript as agent message
        setTranscript(prev => [...prev, {
          speaker: 'agent',
          text: proactiveMessage,
          timestamp: new Date()
        }]);
        
        // Generate TTS and play
        await generateAndPlayTTS(proactiveMessage);
        
        // Reset activity timer
        resetKeepAliveTimer();
      }
    } catch (error) {
      console.error('Error handling conversation lull:', error);
    } finally {
      setIsTyping(false);
    }
  }

  /**
   * Reset the keep-alive timer
   */
  function resetKeepAliveTimer() {
    // Clear existing timer
    if (keepAliveTimeoutRef.current) {
      clearTimeout(keepAliveTimeoutRef.current);
    }
    
    // Update last activity time
    lastActivityTimeRef.current = Date.now();
    
    // Set new timer for 30 seconds of inactivity
    keepAliveTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastActivityTimeRef.current >= 25000) { // 25 seconds buffer
        handleConversationLull();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Update activity timestamp
   */
  function updateActivity() {
    lastActivityTimeRef.current = Date.now();
    resetKeepAliveTimer();
  }

  /**
   * Adjust pause timing based on context - shorter for flow, longer for comedy
   */
  function adjustPauseTiming(originalPause: number, segmentText: string, segmentIndex: number, allSegments: any[]): number {
    // Comedic indicators that benefit from longer pauses
    const comedicMarkers = ['but', 'however', 'actually', 'well', 'so', 'and then', 'suddenly'];
    const prevSegment = allSegments[segmentIndex - 1];
    const nextSegment = allSegments[segmentIndex + 1];
    
    const prevText = prevSegment?.text?.toLowerCase() || '';
    const nextText = nextSegment?.text?.toLowerCase() || '';
    
    // Check for comedic setup/punchline patterns
    const isComedySetup = comedicMarkers.some(marker => 
      prevText.includes(marker) || nextText.startsWith(marker)
    );
    
    // Check for philosophical transitions (keep longer pauses)
    const isPhilosophical = prevText.includes('question') || 
                           prevText.includes('think') || 
                           nextText.includes('maybe') ||
                           nextText.includes('perhaps');
    
    // Check for natural conversational flow (reduce pauses)
    const isNaturalFlow = prevText.length < 50 && nextText.length < 50;
    
    // Adjust timing based on context
    if (isComedySetup) {
      // Keep longer pauses for comedic effect
      return Math.max(originalPause, 800);
    } else if (isPhilosophical) {
      // Keep moderate pauses for philosophical weight
      return Math.max(originalPause * 0.8, 500);
    } else if (isNaturalFlow) {
      // Significantly reduce pauses for natural conversation flow
      return Math.min(originalPause * 0.4, 300);
    } else {
      // Default: reduce pause by 30% for better pacing
      return originalPause * 0.7;
    }
  }

  /**
   * Play text with pause tokens by splitting into segments and adding to transcript progressively
   */
  async function playTextWithPauses(originalText: string, pauseTokens: Array<{index: number, duration: number}>, myTurn?: number) {
    const segments: Array<{text: string, pause?: number}> = [];
    let currentIndex = 0;
    
    // Sort pause tokens by index
    const sortedPauses = [...pauseTokens].sort((a, b) => a.index - b.index);
    
    // Find actual pause token lengths for accurate parsing
    const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
    let match;
    const pauseLengths: number[] = [];
    
    while ((match = pauseRegex.exec(originalText)) !== null) {
      pauseLengths.push(match[0].length);
    }
    
    // Split text into segments between pause tokens
    for (let i = 0; i < sortedPauses.length; i++) {
      const pause = sortedPauses[i];
      if (pause.index > currentIndex) {
        // Add text segment before the pause
        const segmentText = originalText.slice(currentIndex, pause.index).trim();
        if (segmentText) {
          segments.push({ text: segmentText });
        }
        // Add pause
        segments.push({ text: '', pause: pause.duration });
      }
      // Move past the pause token using actual length
      currentIndex = pause.index + (pauseLengths[i] || 12);
    }
    
    // Add remaining text after last pause
    if (currentIndex < originalText.length) {
      const remainingText = originalText.slice(currentIndex).trim();
      if (remainingText) {
        segments.push({ text: remainingText });
      }
    }
    
    console.log('🎙️ Playing segmented audio with pauses:', segments);
    
    // Play each segment with pauses AND add to transcript progressively
    setIsSpeaking(true);
    
    // Suppress VAD during TTS to prevent feedback
    const totalDuration = segments.reduce((total, seg) => 
      total + (seg.text ? seg.text.length * 100 : 0) + (seg.pause || 0), 0
    );
    console.log(`🎙️ Suppressing VAD for ${totalDuration + 2000}ms total duration`);
    enhancedVAD.current?.suppressDuringTTS(totalDuration + 2000); // +2s buffer for safety
    
    // Track text segments for progressive transcript updates
    const textSegments = segments.filter(s => s.text).map(s => s.text);
    let segmentIndex = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      console.log(`🎙️ Processing segment ${i + 1}/${segments.length}, myTurn=${myTurn}, currentTurn=${turnIdRef.current}`);
      
      // Check for barge-in
      if (myTurn !== undefined && myTurn !== turnIdRef.current) {
        console.log('🔇 Skipping remaining segments due to barge-in/turn mismatch.');
        console.log('🔇 Expected turn:', myTurn, 'Current turn:', turnIdRef.current);
        break;
      }
      
      if (segment.pause) {
        // Use smarter pause timing - shorter for natural flow, longer for comedic effect
        const adjustedPause = adjustPauseTiming(segment.pause, segment.text || '', i, segments);
        console.log(`🔇 Pausing for ${adjustedPause}ms (original: ${segment.pause}ms)`);
        await new Promise(resolve => setTimeout(resolve, adjustedPause));
      } else if (segment.text) {
        // Add this segment to transcript BEFORE playing it
        if (isMountedRef.current) {
          // Check if we've been interrupted
          if (myTurn !== undefined && myTurn !== turnIdRef.current) {
            console.log('🔇 Interrupted before adding segment to transcript');
            break;
          }
          
          // Add segment with pause marker if not the last segment
          const textWithPause = segmentIndex < textSegments.length - 1 
            ? segment.text + ` [pause:${(segments[i + 1]?.pause || 600) / 1000}s]`
            : segment.text;
          
          setTranscript(prev => [...prev, {
            speaker: 'agent',
            text: textWithPause,
            timestamp: new Date(),
            turnId: myTurn // Mark with turn ID for potential cleanup
          }]);
        }
        
        // Generate and play TTS for this segment
        console.log(`🎵 Playing segment ${segmentIndex + 1}/${textSegments.length}: "${segment.text.substring(0, 50)}..."`);
        
        // Check for interruption before starting new TTS
        if (myTurn !== undefined && myTurn !== turnIdRef.current) {
          console.log('🔇 Interruption detected before TTS generation - stopping gracefully');
          break;
        }
        
        await generateAndPlayTTS(segment.text);
        segmentIndex++;
        
        // Check for interruption after TTS completes (graceful stopping point)
        if (myTurn !== undefined && myTurn !== turnIdRef.current) {
          console.log('🔇 Interruption detected after segment completion - stopping gracefully');
          break;
        }
      }
    }
    
    setIsSpeaking(false);
    audioRecorderRef.current?.enableImmediately();
  }
  
  /**
   * Generate TTS for a text segment and play it with retry logic
   */
  async function generateAndPlayTTS(text: string, retryCount: number = 0): Promise<void> {
    const maxRetries = 2;
    try {
      const response = await supabase.functions.invoke('text_to_speech', {
        body: {
          text: text.replace(/\[pause:\d+(?:\.\d+)?s?\]/gi, ''), // Clean any remaining pause tokens
          voice: personality?.voice || 'Adam'
        }
      });
      
      if (response.error && retryCount < maxRetries) {
        console.warn(`TTS attempt ${retryCount + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return generateAndPlayTTS(text, retryCount + 1);
      }
      
      if (response.data?.audio_base64 && audioPlayerRef.current) {
        return new Promise((resolve) => {
          audioPlayerRef.current!.playAudio(response.data.audio_base64, (isPlaying) => {
            if (!isPlaying) {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        console.warn(`TTS attempt ${retryCount + 1} failed with error, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return generateAndPlayTTS(text, retryCount + 1);
      }
      console.error('TTS generation failed after all retries:', error);
    }
  }
  
  // Initialize audio utilities
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  
  // Memory and action hooks temporarily disabled for stable launch
  // const memoryHooks = useMemories(sessionId, sessionSecret);
  // const actionItemHooks = useActionItems(sessionId);
  
  // Memory consolidation temporarily disabled for stable launch
  // useEffect(() => {
  //   if (!sessionId) return;
  //   const consolidateMemories = async () => {
  //     try {
  //       const { data, error } = await supabase.functions.invoke('consolidate_memories', {
  //         body: { session_id: sessionId, max_memories: 100, importance_threshold: 0.7 }
  //       });
  //       if (!error && data?.consolidated_count > 0) {
  //         console.log('🧠 Memory consolidation complete:', data.consolidated_count, 'actions taken');
  //       }
  //     } catch (err) {
  //       console.error('Failed to consolidate memories:', err);
  //     }
  //   };
  //   const interval = setInterval(consolidateMemories, 5 * 60 * 1000);
  //   const initialTimer = setTimeout(consolidateMemories, 30 * 1000);
  //   return () => { clearInterval(interval); clearTimeout(initialTimer); };
  // }, [sessionId]);

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
        if (isMountedRef.current) setIsSpeechActive(speechActive);
      },
      (audioBlob) => {
        console.log('🎤 📝 Audio blob received, size:', audioBlob.size);
        handleAudioData(audioBlob);
      }
    );
    audioRecorderRef.current = recorder;

    // Initialize keep-alive system
    resetKeepAliveTimer();
    
    return () => {
      isMountedRef.current = false;
      audioPlayerRef.current?.stopCurrentAudio();
      audioRecorderRef.current?.stopRecording();
      
      // Cleanup keep-alive timer
      if (keepAliveTimeoutRef.current) {
        clearTimeout(keepAliveTimeoutRef.current);
      }
    };
  }, [sessionId, sessionSecret]); // Add dependencies so it recreates when session changes

  // DISABLED: Old noise-based barge-in system - now using word-based interruption
  // Enhanced barge-in will now only happen when actual user words are transcribed
  // useEffect(() => {
  //   // Old VAD-based interruption system disabled
  // }, [isSpeaking, isSpeechActive]);

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
    
    // Update activity timestamp
    updateActivity();
    
    // Audio interruption now handled by word-based detection in processAudioBlob
    // No need to interrupt on audio detection alone - wait for actual transcribed words
    console.log('🎤 Audio received - will check for interruption after transcription');
    
    // Clear any existing queue - prioritize the latest user input
    audioQueueRef.current = [];
    
    // Use optimized queue if available, fallback to original logic
    if (optimizedQueue.current) {
      optimizedQueue.current.interrupt(); // Clear existing queue
      optimizedQueue.current.addAudio(audioBlob);
    } else {
      // Fallback to original queue logic
      audioQueueRef.current.push(audioBlob);
      console.log('🎤 Added to queue (cleared old items), length:', audioQueueRef.current.length);
      processAudioQueue();
    }
  }

  async function processAudioBlob(audioBlob: Blob, myTurn?: number) {
    myTurn = myTurn || ++turnIdRef.current;
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
      
      // Smart interruption: Only interrupt William if actual words were spoken AND he's currently speaking AND user isn't typing
      if (isSpeaking && userMessage.length > 2 && !isUserTyping) { // Require at least 3 characters and not typing to avoid false triggers
        console.log('🗣️ WORD-BASED INTERRUPTION: User spoke while William was speaking');
        console.log('🗣️ User said:', userMessage);
        console.log('🗣️ Gracefully stopping William after current segment');
        
        // Invalidate current turn to prevent future segments
        const previousTurn = turnIdRef.current;
        turnIdRef.current += 1;
        console.log('🗣️ Turn ID incremented from', previousTurn, 'to:', turnIdRef.current);
        
        // Store the user's speech for context
        lastUserSpeechRef.current = {
          text: userMessage,
          timestamp: Date.now()
        };
        
        // Re-enable microphone for immediate follow-up
        audioRecorderRef.current?.enableImmediately();
      } else if (isSpeaking && userMessage.length > 2 && isUserTyping) {
        console.log('⌨️ TYPING PROTECTION: User spoke while typing - not interrupting William');
        console.log('⌨️ User said:', userMessage, '(while typing)');
      }
      
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

      // Optimized memory recall based on user input analysis
      let relevantMemories = [];
      const fastModeConfig = ResponseOptimizer.getFastModeConfig(userMessage);
      
      if (!fastModeConfig.skipMemory) {
        console.log('🧠 Recalling memories for context:', userMessage);
        try {
          const memoryParams = ResponseOptimizer.getMemoryParams();
          // Memory recall temporarily disabled for stable launch
          // relevantMemories = await memoryHooks.recallMemories({
          //   query: userMessage,
          //   limit: memoryParams.limit,
          //   minImportance: memoryParams.minImportance
          // });
        } catch (error) {
          console.warn('🧠 Memory recall failed, continuing without context');
        }
      } else {
        console.log('🧠 Skipping memory recall for fast response');
      }
      console.log('🧠 Recalled memories (optimized):', relevantMemories.length);
      
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
          mode: personality?.id,
          is_performer_mode: isPerformerMode,
          model: selectedModel?.id || 'llama-3.3-70b-versatile'
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
      
      // Clean debug commands and pause tokens from display text
      let displayText = agentResponse.text;
      const debugCommands: string[] = [];
      const pauseTokens: Array<{index: number, duration: number}> = [];
      
      // Extract pause tokens before cleaning other commands
      const pauseRegex = /\[pause:(\d+(?:\.\d+)?)s?\]/gi;
      let match;
      let textForTTS = agentResponse.text;
      
      // Find all pause tokens and their positions
      while ((match = pauseRegex.exec(agentResponse.text)) !== null) {
        const duration = parseFloat(match[1]) * 1000; // Convert to milliseconds
        const index = match.index;
        pauseTokens.push({ index, duration });
      }
      
      // Remove pause tokens from text for TTS
      textForTTS = textForTTS.replace(pauseRegex, '');
      
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
      
      // Also remove pause tokens from display text
      displayText = displayText.replace(pauseRegex, '').replace(/\s+/g, ' ').trim();
      
      // Add agent response to transcript - but ONLY if we don't have pause tokens
      // (If we have pause tokens, playTextWithPauses will add segments progressively)
      if (isMountedRef.current && pauseTokens.length === 0) {
        // No pause markers, add the full response at once
        const transcriptText = agentResponse.text
          .replace(saveExtractRegex1, '')
          .replace(saveExtractRegex2, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        setTranscript(prev => [...prev, {
          speaker: 'agent',
          text: transcriptText,
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
          
          // Save important conversation points as memories
          if (agentResponse.extract.company || agentResponse.extract.contact_info || agentResponse.extract.pain_points) {
            const memoryContent = [];
            if (agentResponse.extract.company) {
              memoryContent.push(`Company: ${agentResponse.extract.company}`);
            }
            if (agentResponse.extract.contact_info) {
              memoryContent.push(`Contact: ${JSON.stringify(agentResponse.extract.contact_info)}`);
            }
            if (agentResponse.extract.pain_points && agentResponse.extract.pain_points.length > 0) {
              memoryContent.push(`Pain points: ${agentResponse.extract.pain_points.join(', ')}`);
            }
            
            if (memoryContent.length > 0) {
              // Determine memory scope based on importance
              const scope = agentResponse.extract.lead_score > 70 ? 'long' : 
                           agentResponse.extract.lead_score > 40 ? 'medium' : 'short';
              const importance = agentResponse.extract.lead_score / 100;
              
              // Memory saving temporarily disabled for stable launch
              // memoryHooks.saveMemory({
              //   content: memoryContent.join(' | '),
              //   scope,
              //   importance,
              //   tags: [agentResponse.extract.intent || 'general'],
              //   metadata: agentResponse.extract
              // });
            }
          }
          
          // Extract and create action items for high-intent conversations
          if (agentResponse.extract.intent === 'purchase_intent' || 
              agentResponse.extract.intent === 'demo_request' ||
              agentResponse.extract.intent === 'consulting_inquiry') {
            
            // Create action items based on intent
            const actionTitle = agentResponse.extract.intent === 'purchase_intent' ? 'Follow up on purchase interest' :
                              agentResponse.extract.intent === 'demo_request' ? 'Schedule product demo' :
                              'Prepare consulting proposal';
            
            const actionDescription = agentResponse.extract.company ? 
              `For ${agentResponse.extract.company}` : 'From recent conversation';
            
            actionItemHooks.createActionItem({
              title: actionTitle,
              description: actionDescription,
              priority: agentResponse.extract.lead_score > 70 ? 'high' : 'medium',
              owner: 'you',
              category: 'sales',
              tags: [agentResponse.extract.intent]
            });
          }
          
          // Also extract action items from the full conversation context
          if (userMessage && displayText) {
            const conversationText = `User: ${userMessage}\nAgent: ${displayText}`;
            
            // Use the action_items Edge Function to extract action items
            supabase.functions.invoke('action_items', {
              body: {
                action: 'extract',
                session_id: sessionId,
                extract_from: conversationText
              }
            }).then(({ data, error }) => {
              if (!error && data?.extracted && data.extracted.length > 0) {
                console.log('📝 Extracted action items:', data.extracted);
              }
            }).catch(err => {
              console.error('Failed to extract action items:', err);
            });
          }
        }
        
        // Also save the conversation exchange as episodic memory
        if (userMessage && displayText) {
          // Memory saving temporarily disabled for stable launch
          // memoryHooks.saveMemory({
          //   content: `User: ${userMessage}\nAgent: ${displayText.substring(0, 200)}`,
          //   scope: 'episodic',
          //   importance: 0.3,
          //   tags: ['conversation'],
          //   metadata: { 
          //     user_message: userMessage, 
          //     agent_response: displayText,
          //     intent: agentResponse.extract?.intent 
          //   }
          // });
        }
      }

      // Stop showing "thinking" indicator before playing audio
      if (isMountedRef.current) setIsTyping(false);

      // Play TTS audio with pause token support if available and audio is enabled  
      if (audioEnabled && audioPlayerRef.current) {
        // If we have pause tokens, use segmented playback instead of the pre-generated audio
        if (pauseTokens.length > 0) {
          console.log('🎙️ Using pause-aware TTS playback with', pauseTokens.length, 'pauses');
          
          // Stale turn check for pause-aware playback
          if (myTurn !== undefined && myTurn !== turnIdRef.current) {
            console.log('🔇 Skipping pause-aware audio due to barge-in.');
            return;
          }
          
          await playTextWithPauses(agentResponse.text, pauseTokens, myTurn);
          return; // Skip the normal audio playback below
        }
      }
      
      // Normal TTS audio playback (when no pause tokens)
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
        
        // Set speaking state and suppress VAD
        setIsSpeaking(true);
        enhancedVAD.current?.suppressDuringTTS(estimatedDuration + 1000); // +1s buffer
        
        await audioPlayerRef.current.playAudio(agentResponse.audio_base64, (isPlaying) => {
          setIsSpeaking(isPlaying);
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
    
    // Update activity timestamp
    updateActivity();
    
    // Text message interruption - this is intentional user input, so interrupt gracefully
    if (isSpeaking) {
      console.log('💬 Text message sent while AI speaking - graceful interruption');
      
      // Increment turn ID to prevent future segments (current segment will complete)
      const previousTurn = turnIdRef.current;
      turnIdRef.current += 1;
      console.log('💬 Turn ID incremented from', previousTurn, 'to:', turnIdRef.current);
      
      // Store the user's text for context
      lastUserSpeechRef.current = {
        text: message,
        timestamp: Date.now()
      };
    }
    
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
    sendTextMessage,
    // Memory and action functions temporarily disabled for stable launch
    // memories: memoryHooks.memories,
    // memoriesLoading: memoryHooks.loading,
    // memoriesError: memoryHooks.error,
    // saveMemory: memoryHooks.saveMemory,
    // recallMemories: memoryHooks.recallMemories,
    // updateMemoryImportance: memoryHooks.updateMemoryImportance,
    // actionItems: actionItemHooks.actionItems,
    // actionItemsLoading: actionItemHooks.loading,
    // actionItemsError: actionItemHooks.error,
    // createActionItem: actionItemHooks.createActionItem,
    // updateActionItem: actionItemHooks.updateActionItem,
    // completeActionItem: actionItemHooks.completeActionItem,
    // scheduleActionItem: actionItemHooks.scheduleActionItem,
    // delegateActionItem: actionItemHooks.delegateActionItem,
    // Keep-alive system
    updateActivity,
    resetKeepAliveTimer
  };
}