#!/bin/bash
# Deploy CORS fixes for Edge Functions
# Run this after linking to Supabase project with: npx supabase link --project-ref suyervjawrmbyyxetblv

echo "Deploying CORS fixes for Edge Functions..."

# Deploy the critical functions that need localhost:5174 CORS support
npx supabase functions deploy create_session
npx supabase functions deploy agent_reply
npx supabase functions deploy groq_chat
npx supabase functions deploy speech_to_text_groq
npx supabase functions deploy text_to_speech

echo "CORS fixes deployed! The app should now work properly on localhost:5174"