#!/bin/bash

# Deploy Edge Functions to Supabase
# Run this after linking your project with: npx supabase link

echo "Deploying Edge Functions to Supabase..."

# Deploy action_items function
echo "Deploying action_items function..."
npx supabase functions deploy action_items

# Deploy consolidate_memories function
echo "Deploying consolidate_memories function..."
npx supabase functions deploy consolidate_memories

echo "Edge Functions deployed successfully!"
echo ""
echo "Make sure you've set the following environment variables in Supabase dashboard:"
echo "- GROQ_API_KEY"
echo "- OPENAI_API_KEY (if using OpenAI features)"
echo "- ELEVENLABS_API_KEY (if using ElevenLabs TTS)"