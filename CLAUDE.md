# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI voice agent system called "William AI Scribe" - a conversational AI assistant with voice capabilities. It's built using React + Vite + TypeScript on the frontend with Supabase for backend services and real-time features.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS with custom design system

### Backend Services
- **Database & Auth**: Supabase (PostgreSQL with pgvector, pgcrypto, uuid-ossp extensions)
- **Edge Functions**: Supabase Edge Functions for serverless APIs
- **Real-time**: Supabase Realtime for live updates
- **Storage**: Supabase Storage buckets (audio, screens, uploads, exports)

### Key Directories
- `/src/pages/` - Main application pages (Index, Chat, Admin, Auth, Personalities)
- `/src/components/` - React components including UI library
- `/src/hooks/` - Custom React hooks (useVoiceChat, useAdminData, etc.)
- `/src/lib/` - Utilities, types, and business logic
- `/supabase/functions/` - Edge Functions for AI services
- `/supabase/migrations/` - Database schema migrations

## AI Integration Points

### Voice Services
- **Speech-to-Text**: Groq API integration (`speech_to_text_groq`)
- **Text-to-Speech**: ElevenLabs voice synthesis (`text_to_speech`)
- **LLM Chat**: Multiple model support via Groq API (`groq_chat`, `agent_reply`)

### Edge Functions
- `agent_reply` - Handles AI agent responses with structured extraction
- `groq_chat` - Direct chat with Groq models
- `text_to_speech` - ElevenLabs TTS integration
- `speech_to_text_groq` - Groq Whisper transcription
- `collect_email` - Email collection and validation
- `recall_memories` - RAG memory retrieval
- `save_memory` - Store conversation memories
- `summarize_session` - Generate session summaries

## Key Features

### Voice Chat System
The main voice interaction is handled through the `useVoiceChat` hook which manages:
- Audio recording and streaming
- Real-time transcription
- AI response generation
- TTS playback queue
- Session state management

### Lead Scoring
Implemented in `/src/lib/leadScore.ts` - calculates engagement scores based on:
- Intent classification
- Entity extraction
- Conversation dynamics
- User interactions

### Personality System
Multiple AI personalities defined in `/src/lib/models.ts`:
- Professional William
- Casual William
- Pirate William
- Each with custom voice and behavioral settings

## TypeScript Configuration

The project uses relaxed TypeScript settings for rapid development:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`

Path alias configured: `@/*` maps to `./src/*`

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Edge Function secrets (set in Supabase dashboard):
- `GROQ_API_KEY`
- `ELEVENLABS_API_KEY`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `SLACK_WEBHOOK_URL`

## Database Schema

Key tables include:
- `sessions` - Chat session management
- `utterances` - Conversation transcript storage
- `extracts` - Structured data extraction
- `summaries` - Session summaries
- `events` - User interaction tracking
- RAG tables for memory/knowledge base

## Testing

No test framework is currently configured. The project focuses on rapid prototyping with manual testing through the development server.

## Important Notes

1. The project originated from Lovable.dev platform for rapid AI-assisted development
2. Supabase Edge Functions handle all AI API integrations to protect API keys
3. Real-time features use Supabase Realtime channels
4. Audio processing uses base64 encoding for streaming
5. The UI is fully responsive with mobile-first considerations