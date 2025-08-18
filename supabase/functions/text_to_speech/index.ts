import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Allowed origins for production security
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be replaced with origin validation
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Origin validation for security
  const origin = req.headers.get('origin');
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin);
  
  if (!isAllowedOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { text, voice_id, session_id } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Extract debug commands (save_extract, etc.) from the text
    const debugCommands: string[] = [];
    let cleanText = text;
    
    // Find and extract save_extract commands (multiple formats)
    const saveExtractRegex1 = /save_extract\{[^}]*\}/gi;
    const saveExtractRegex2 = /Save_extract:\s*[^.]*\./gi;
    
    const matches1 = cleanText.match(saveExtractRegex1);
    const matches2 = cleanText.match(saveExtractRegex2);
    
    if (matches1) {
      debugCommands.push(...matches1);
      cleanText = cleanText.replace(saveExtractRegex1, '').trim();
    }
    if (matches2) {
      debugCommands.push(...matches2);
      cleanText = cleanText.replace(saveExtractRegex2, '').trim();
    }
    
    // Clean up any extra whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    console.log(`Generating speech for session ${session_id}:`, cleanText.substring(0, 100));
    if (debugCommands.length > 0) {
      console.log(`Extracted debug commands:`, debugCommands);
    }

    // Use your custom ElevenLabs voice clone for William MacDonald White
    const voiceId = voice_id || 'kEvELaJKlvVX03azWDUC'; // Your custom voice clone
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanText, // Use cleaned text for TTS
        model_id: 'eleven_turbo_v2_5', // High quality, low latency
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error:', response.status, errorText);
      throw new Error(`Eleven Labs API error: ${response.status}`);
    }

    // Convert audio to base64 for easy transport
    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Convert to base64 in chunks to avoid call stack overflow
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binary);

    console.log(`Generated ${audioBuffer.byteLength} bytes of audio for session ${session_id}`);

    return new Response(JSON.stringify({ 
      audio_base64: base64Audio,
      format: 'mp3',
      text: cleanText,
      original_text: text,
      debug_commands: debugCommands
    }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in text-to-speech:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Text-to-speech generation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});