# William AI Scribe - Now Spec-Driven! 🚀

## Overview

William AI Scribe is an AI-powered voice agent system that enables natural conversational interactions with multiple AI personalities. The project now uses **specification-driven development with AI agents** for rapid, high-quality feature implementation.

## 🎯 Spec-Driven Development

This project uses specification-driven development with AI agents for implementation.

### Quick Start for AI Development

1. **Check specifications** in `specs/specification.md` for product requirements
2. **Review technical plan** in `specs/plan.md` for implementation approach  
3. **Pick a task** from `specs/tasks/backlog/`
4. **Implement** following `specs/context/` guidelines
5. **Validate** using `specs/validations/`

### For Human Developers

- Specifications are the source of truth
- Update specs before changing code
- Use AI agents for implementation when possible
- Focus on specification quality and validation

### Available Commands

```bash
# Task management
python scripts/spec_manager.py list --status backlog
python scripts/spec_manager.py show TASK-001
python scripts/spec_manager.py move TASK-001 in-progress
python scripts/spec_manager.py report

# Development
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run linter
npm test          # Run tests (once configured)
```

## 📁 Project Structure

```
william-ai-scribe/
├── src/                    # Application source code
│   ├── pages/             # Main application pages
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Business logic & utilities
│   └── integrations/     # External service integrations
├── supabase/              # Backend services
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database migrations
├── specs/                 # 📋 SPECIFICATIONS (Start Here!)
│   ├── specification.md  # Product requirements
│   ├── plan.md          # Technical implementation
│   ├── context/         # Development guidelines
│   ├── tasks/           # Implementation tasks
│   └── validations/     # Quality checklists
├── docs/                  # Documentation
│   └── analysis/        # Project analysis
├── scripts/              # Automation scripts
│   └── spec_manager.py  # Task management tool
└── .claude/              # AI agent instructions
    └── workflow.md      # AI implementation guide
```

## 🚀 Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account for backend services
- API keys for Groq, ElevenLabs, OpenAI (in Supabase dashboard)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd william-ai-scribe

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

Create `.env.local` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Configure Edge Function secrets in Supabase dashboard:
- `GROQ_API_KEY`
- `ELEVENLABS_API_KEY`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `SLACK_WEBHOOK_URL`

## 💡 Core Features

### Voice Chat System
- Real-time voice conversations with AI
- Speech-to-text and text-to-speech
- Barge-in support (interrupt AI mid-speech)
- Multiple AI personalities

### Lead Scoring Engine
- Automatic lead qualification (0-100 score)
- Intent and entity extraction
- Slack notifications for high-value leads
- Detailed scoring reasons

### AI Personalities
- **Entrepreneur**: Strategic business focus
- **Professional**: Technical deep dives
- **Casual**: Friendly conversation
- **Pirate**: Adventure-themed interaction
- **Coach**: Mentoring and guidance

### Admin Dashboard
- Real-time conversation monitoring
- Lead score visualization
- Export functionality
- Analytics and insights

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime)
- **AI Services**: Groq (LLM & STT), ElevenLabs (TTS), OpenAI (Embeddings)
- **State Management**: React Query, Custom Hooks

## 📋 Development Workflow

### Working on a Task

1. **Find a task**:
   ```bash
   python scripts/spec_manager.py list --status backlog
   ```

2. **View task details**:
   ```bash
   python scripts/spec_manager.py show TASK-001
   ```

3. **Start work**:
   ```bash
   python scripts/spec_manager.py move TASK-001 in-progress
   ```

4. **Implement** following the task specification

5. **Validate** your implementation against acceptance criteria

6. **Complete**:
   ```bash
   python scripts/spec_manager.py move TASK-001 completed
   ```

### AI Agent Usage

For AI agents (Claude Code, GitHub Copilot):
```bash
# Generate implementation prompt for a task
python scripts/spec_manager.py prompt TASK-001

# The AI should then:
# 1. Read the task specification
# 2. Review context files
# 3. Implement following guidelines
# 4. Validate implementation
```

## 🧪 Testing

Testing framework setup is the first priority task (TASK-001):

```bash
# Once configured:
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Generate coverage report
```

Current coverage: 0% → Target: 80%

## 📈 Migration Status

The project is transitioning to spec-driven development:

- ✅ **Phase 1**: Foundation (Complete)
  - Specifications extracted
  - Task system created
  - AI workflows defined
  
- 🚧 **Phase 2**: Implementation (In Progress)
  - Testing framework setup
  - Initial test coverage
  - Error boundaries
  
- 📅 **Phase 3**: Scale (Upcoming)
  - Expand test coverage
  - TypeScript improvements
  - Performance optimization

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for details.

## 📚 Documentation

- **Specifications**: [`specs/specification.md`](./specs/specification.md)
- **Technical Plan**: [`specs/plan.md`](./specs/plan.md)
- **AI Instructions**: [`CLAUDE.md`](./CLAUDE.md)
- **Migration Plan**: [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md)
- **Task List**: [`specs/tasks/README.md`](./specs/tasks/README.md)

## 🤝 Contributing

1. **Pick a task** from the backlog
2. **Follow specifications** exactly
3. **Write tests** for your code
4. **Update documentation** as needed
5. **Submit PR** with task reference

See [`.claude/workflow.md`](./.claude/workflow.md) for AI agent guidelines.

## 🚢 Deployment

### Development Build
```bash
npm run build:dev
```

### Production Build
```bash
npm run build
```

### Using Lovable Platform
Simply open [Lovable](https://lovable.dev/projects/2e10a6c0-0b90-4a50-8d27-471a5969124f) and click on Share -> Publish.

### Custom Domain
To connect a domain, navigate to Project > Settings > Domains in Lovable.

## 📊 Project Info

- **Lovable URL**: https://lovable.dev/projects/2e10a6c0-0b90-4a50-8d27-471a5969124f
- **Origin**: Created with Lovable.dev for rapid AI-assisted development
- **Status**: Active development with spec-driven approach

## 🔒 Security

- API keys stored securely in Supabase
- Session-based authentication
- Input validation on all endpoints
- No sensitive data in client code

## 📝 License

Private project - See LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check the specifications in `/specs/`
2. Review existing tasks in `/specs/tasks/`
3. Consult the technical plan in `/specs/plan.md`
4. Create an issue with clear description

---

**Built with AI-Assisted Spec-Driven Development** 🤖