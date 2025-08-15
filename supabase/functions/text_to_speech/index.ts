import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log(`Generating speech for session ${session_id}:`, text.substring(0, 100));

    // Use Brian voice (professional male voice) for William MacDonald White
    const voiceId = voice_id || 'nPczCjzI2devNBz1zQrb'; // Brian voice - professional male
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
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
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    console.log(`Generated ${audioBuffer.byteLength} bytes of audio for session ${session_id}`);

    return new Response(JSON.stringify({ 
      audio_base64: base64Audio,
      format: 'mp3',
      text: text
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