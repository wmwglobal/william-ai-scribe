import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log('🔌 WebSocket upgrade requested');

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  // Connect to OpenAI Realtime API
  const connectToOpenAI = () => {
    console.log('🤖 Connecting to OpenAI Realtime API...');
    
    const openaiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openAISocket = new WebSocket(openaiUrl, [], {
      headers: {
        "Authorization": `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    openAISocket.onopen = () => {
      console.log('🤖 ✅ Connected to OpenAI Realtime API');
    };

    openAISocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🤖 📨 Received from OpenAI:', data.type);

        // Configure session after receiving session.created
        if (data.type === 'session.created' && !sessionConfigured) {
          console.log('🤖 🔧 Configuring session...');
          
          const sessionUpdate = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: "You are AI William, a helpful assistant. Be conversational and engaging.",
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              temperature: 0.8,
              max_response_output_tokens: "inf"
            }
          };
          
          openAISocket?.send(JSON.stringify(sessionUpdate));
          sessionConfigured = true;
          console.log('🤖 ✅ Session configured');
        }

        // Forward all messages to client
        socket.send(event.data);

      } catch (error) {
        console.error('🤖 ❌ Error processing OpenAI message:', error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error('🤖 ❌ OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'OpenAI connection error' 
      }));
    };

    openAISocket.onclose = (event) => {
      console.log('🤖 🔌 OpenAI WebSocket closed:', event.code, event.reason);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'OpenAI connection closed' 
      }));
    };
  };

  // Handle client WebSocket events
  socket.onopen = () => {
    console.log('🔌 ✅ Client WebSocket opened');
    connectToOpenAI();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('🔌 📨 Received from client:', data.type);

      // Forward client messages to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
        console.log('🔌 ➡️ Forwarded to OpenAI:', data.type);
      } else {
        console.error('🔌 ❌ OpenAI socket not ready');
      }
    } catch (error) {
      console.error('🔌 ❌ Error processing client message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('🔌 ❌ Client WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('🔌 🔌 Client WebSocket closed');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});