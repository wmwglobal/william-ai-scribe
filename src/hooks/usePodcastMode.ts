/**
 * Podcast Mode Hook
 * Integrates all podcast systems with the existing voice chat infrastructure
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceChat } from './useVoiceChat';
import { ConsciousnessController } from '@/lib/podcast/consciousness';
import { ConversationStateManager } from '@/lib/podcast/conversationStateManager';
import { EnhancedDynamicPromptSystem } from '@/lib/podcast/enhancedDynamicPromptSystem';
import { ResponsePipeline } from '@/lib/podcast/responsePipeline';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ConversationMode, 
  ConversationContext,
  CallbackOpportunity 
} from '@/lib/podcast/consciousness';
import type { ProcessedResponse } from '@/lib/podcast/responsePipeline';

export interface PodcastState {
  isActive: boolean;
  mode: ConversationMode;
  context: ConversationContext;
  episodeNumber: number;
  bestMoments: Array<{
    content: string;
    timestamp: Date;
    score: number;
  }>;
  audienceEngagement: number;
  showDuration: number;
}

export interface PodcastWebSocketEvents {
  'mode-change': (mode: ConversationMode) => void;
  'context-update': (context: ConversationContext) => void;
  'moment-registered': (moment: unknown) => void;
  'callback-available': (callback: CallbackOpportunity) => void;
  'segment-change': (segment: unknown) => void;
  'engagement-update': (level: number) => void;
}

/**
 * Main Podcast Mode Hook
 */
export function usePodcastMode(sessionId: string, voiceChatIntegration?: {
  sendTextMessage: (message: string) => Promise<void>;
  transcript: Array<{speaker: 'visitor' | 'agent', text: string, timestamp: Date}>;
}) {
  // Core systems
  const consciousnessRef = useRef<ConsciousnessController>();
  const stateManagerRef = useRef<ConversationStateManager>();
  const promptSystemRef = useRef<EnhancedDynamicPromptSystem>();
  const pipelineRef = useRef<ResponsePipeline>();
  
  // WebSocket connection
  const wsRef = useRef<WebSocket>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  // State
  const [podcastState, setPodcastState] = useState<PodcastState>({
    isActive: false,
    mode: 'banter',
    context: {} as ConversationContext,
    episodeNumber: 1,
    bestMoments: [],
    audienceEngagement: 5,
    showDuration: 0
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [processingResponse, setProcessingResponse] = useState(false);
  
  // Note: We'll receive voice chat integration from the parent component
  
  // Initialize systems
  useEffect(() => {
    if (sessionId) {
      initializeSystems();
      // Skip WebSocket connection for now - no server running
      // connectWebSocket();
    }
    
    return () => {
      cleanup();
    };
  }, [sessionId]);
  
  /**
   * Initialize all podcast systems
   */
  const initializeSystems = useCallback(() => {
    // Create instances
    consciousnessRef.current = new ConsciousnessController();
    stateManagerRef.current = new ConversationStateManager(sessionId);
    promptSystemRef.current = new EnhancedDynamicPromptSystem();
    pipelineRef.current = new ResponsePipeline();
    
    // Set up event listeners
    setupSystemEvents();
    
    // Load show memory
    stateManagerRef.current?.loadShowMemory();
  }, [sessionId]);
  
  /**
   * Set up inter-system event communication
   */
  const setupSystemEvents = () => {
    const consciousness = consciousnessRef.current;
    const stateManager = stateManagerRef.current;
    
    if (!consciousness || !stateManager) return;
    
    // Consciousness events
    consciousness.on('mode-change', (mode: ConversationMode) => {
      setPodcastState(prev => ({ ...prev, mode }));
      stateManager.switchMode(mode);
      broadcastWebSocketEvent('mode-change', mode);
    });
    
    consciousness.on('context-updated', (context: ConversationContext) => {
      setPodcastState(prev => ({ ...prev, context }));
      broadcastWebSocketEvent('context-update', context);
    });
    
    consciousness.on('response-generated', (response: any) => {
      // Track in state manager
      stateManager.addToThread('william', response.text, {
        mode: podcastState.mode,
        emotionalTone: response.emotionalTone
      });
    });
    
    // State manager events
    stateManager.on('moment-registered', (moment: any) => {
      setPodcastState(prev => ({
        ...prev,
        bestMoments: [...prev.bestMoments, {
          content: moment.content,
          timestamp: moment.timestamp,
          score: moment.audienceReaction
        }].sort((a, b) => b.score - a.score).slice(0, 10)
      }));
      broadcastWebSocketEvent('moment-registered', moment);
    });
    
    stateManager.on('callback-registered', (callback: CallbackOpportunity) => {
      broadcastWebSocketEvent('callback-available', callback);
    });
    
    stateManager.on('thread-started', (thread: any) => {
      console.log('New conversation thread:', thread.topic);
    });
    
    stateManager.on('show-memory-saved', (memory: any) => {
      console.log('Show memory saved:', memory);
    });
  };
  
  /**
   * WebSocket connection management
   */
  const connectWebSocket = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/podcast/${sessionId}`);
      
      wsRef.current.onopen = () => {
        console.log('Podcast WebSocket connected');
        setIsConnected(true);
        
        // Send initial state
        wsRef.current?.send(JSON.stringify({
          type: 'init',
          data: {
            sessionId,
            state: podcastState
          }
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      scheduleReconnect();
    }
  }, [sessionId, podcastState]);
  
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting WebSocket reconnection...');
      connectWebSocket();
    }, 5000);
  };
  
  const handleWebSocketMessage = (data: string) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'mode-change-request':
          switchMode(message.data.mode);
          break;
          
        case 'energy-adjustment':
          consciousnessRef.current?.adjustEnergy(message.data.delta);
          break;
          
        case 'audience-update':
          setPodcastState(prev => ({
            ...prev,
            audienceEngagement: message.data.engagement
          }));
          break;
          
        case 'command':
          handleRemoteCommand(message.data);
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };
  
  const broadcastWebSocketEvent = (event: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: event,
        data,
        timestamp: Date.now()
      }));
    }
  };
  
  const handleRemoteCommand = (command: any) => {
    switch (command.action) {
      case 'reset':
        resetPodcast();
        break;
      case 'save-moment':
        stateManagerRef.current?.registerMoment(
          command.type || 'comedy',
          command.content,
          command.context
        );
        break;
      case 'use-callback':
        const callback = stateManagerRef.current?.getAvailableCallbacks()[0];
        if (callback) {
          stateManagerRef.current?.useCallback(callback.id);
        }
        break;
    }
  };
  
  /**
   * Process user input through podcast pipeline
   */
  const processInput = useCallback(async (input: string): Promise<ProcessedResponse | null> => {
    if (!consciousnessRef.current || !stateManagerRef.current || !promptSystemRef.current || !pipelineRef.current) {
      console.error('Podcast systems not initialized');
      return null;
    }
    
    setProcessingResponse(true);
    
    try {
      // Add user message to voice chat transcript first
      if (voiceChatIntegration?.transcript) {
        // We'll let the voice chat system handle this naturally
        // by calling voiceChatIntegration.sendTextMessage which adds to transcript
      }
      
      // Track in state manager
      stateManagerRef.current.addToThread('user', input);
      
      // Analyze for callbacks
      stateManagerRef.current.registerCallback(input, 'user-input');
      
      // Get current context
      const context = consciousnessRef.current.getContext();
      const showMemory = stateManagerRef.current.getShowMemory();
      
      // Generate dynamic prompt
      const { systemPrompt, userPrompt, temperature, parameters } = 
        promptSystemRef.current.generatePrompt(input, context, {
          recentExchanges: voiceChatIntegration?.transcript?.slice(-5).map(t => `${t.speaker}: ${t.text}`) || [],
          activeThemes: context.themes.map(t => t.topic),
          availableCallbacks: stateManagerRef.current.getAvailableCallbacks().map(c => c.setup),
          emotionalContext: context.emotionalArc.current,
          audienceEngagement: context.audienceEngagement,
          showHistory: showMemory
        });
      
      // Generate base response (integrate with your existing LLM)
      const baseResponse = await generateLLMResponse(systemPrompt, userPrompt, temperature, parameters);
      
      // Process through consciousness
      const consciousResponse = await consciousnessRef.current.processInput(baseResponse);
      
      // Get best callbacks
      const callbacks = stateManagerRef.current.getAvailableCallbacks(7)
        .slice(0, 2)
        .map(c => c.setup);
      
      // Process through pipeline
      const processed = await pipelineRef.current.process(
        consciousResponse.text,
        context,
        callbacks
      );
      
      // Update audience engagement
      const newEngagement = calculateAudienceEngagement(processed, context);
      setPodcastState(prev => ({
        ...prev,
        audienceEngagement: newEngagement
      }));
      
      // Broadcast processed response
      broadcastWebSocketEvent('response-processed', processed);
      
      return processed;
      
    } catch (error) {
      console.error('Error processing podcast input:', error);
      return null;
    } finally {
      setProcessingResponse(false);
    }
  }, [voiceChatIntegration?.transcript]);
  
  /**
   * Generate LLM response (integrate with your existing system)
   */
  const generateLLMResponse = async (
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    parameters: any
  ): Promise<string> => {
    // This should integrate with your existing LLM service
    // For now, using Supabase Edge Function as example
    
    try {
      const { data, error } = await supabase.functions.invoke('groq_chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          top_p: parameters?.topP || 0.9,
          presence_penalty: parameters?.presencePenalty || 0,
          frequency_penalty: parameters?.frequencyPenalty || 0,
          max_tokens: 500
        }
      });
      
      if (error) throw error;
      return data.text || "I need to think about that...";
      
    } catch (error) {
      console.error('LLM generation error:', error);
      return "Let me rephrase that thought...";
    }
  };
  
  /**
   * Calculate audience engagement based on response
   */
  const calculateAudienceEngagement = (
    response: ProcessedResponse,
    context: ConversationContext
  ): number => {
    let engagement = podcastState.audienceEngagement;
    
    // Comedy boost
    if (response.metadata.comedyScore > 7) {
      engagement += 0.5;
    }
    
    // Callback boost
    if (response.metadata.callbacksUsed.length > 0) {
      engagement += 0.3;
    }
    
    // Variety boost
    if (context.pacing.varietyScore > 7) {
      engagement += 0.2;
    }
    
    // Natural decay
    engagement -= 0.1;
    
    return Math.max(0, Math.min(10, engagement));
  };
  
  /**
   * Public API methods
   */
  const startPodcast = useCallback(() => {
    setPodcastState(prev => ({ ...prev, isActive: true }));
    stateManagerRef.current?.startNewThread('Podcast Opening');
    broadcastWebSocketEvent('podcast-started', { sessionId });
  }, [sessionId]);
  
  const stopPodcast = useCallback(() => {
    setPodcastState(prev => ({ ...prev, isActive: false }));
    stateManagerRef.current?.saveShowMemory();
    broadcastWebSocketEvent('podcast-stopped', { sessionId });
  }, [sessionId]);
  
  const switchMode = useCallback((mode: ConversationMode) => {
    consciousnessRef.current?.setMode(mode);
    setPodcastState(prev => ({ ...prev, mode }));
  }, []);
  
  const adjustEnergy = useCallback((delta: number) => {
    consciousnessRef.current?.adjustEnergy(delta);
  }, []);
  
  const registerMoment = useCallback((type: any, content: string, context: string) => {
    stateManagerRef.current?.registerMoment(type, content, context);
  }, []);
  
  const getConversationArc = useCallback(() => {
    return consciousnessRef.current?.getConversationArc();
  }, []);
  
  const resetPodcast = useCallback(() => {
    consciousnessRef.current?.reset();
    setPodcastState(prev => ({
      ...prev,
      mode: 'banter',
      context: {} as ConversationContext,
      bestMoments: [],
      audienceEngagement: 5
    }));
  }, []);
  
  /**
   * Cleanup
   */
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stateManagerRef.current?.destroy();
  };
  
  return {
    // State
    podcastState,
    isConnected,
    processingResponse,
    
    // Core functions
    processInput,
    startPodcast,
    stopPodcast,
    switchMode,
    adjustEnergy,
    registerMoment,
    getConversationArc,
    resetPodcast,
    
    // Voice chat integration (provided by parent component)
    voiceChatIntegration,
    
    // Systems (for advanced usage)
    systems: {
      consciousness: consciousnessRef.current,
      stateManager: stateManagerRef.current,
      promptSystem: promptSystemRef.current,
      pipeline: pipelineRef.current
    }
  };
}