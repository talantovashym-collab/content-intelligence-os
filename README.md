# Content Intelligence OS

AI Content Intelligence & Autonomous Media Production Operating System

Manages the complete lifecycle of content creation:
**OPPORTUNITY DISCOVERY → IDEA RESEARCH → REFERENCE COLLECTION → REVERSE MEDIA ENGINEERING → CREATIVE STRATEGY → MEDIA PRODUCTION → TESTING → PUBLISHING → PERFORMANCE ANALYSIS → CONTINUOUS IMPROVEMENT**

## Architecture

```
content-intelligence-os/
├── apps/
│   ├── frontend/          # Next.js 14 + React 18 + TypeScript + Tailwind
│   └── backend/           # FastAPI + Python 3.11 + SQLAlchemy 2.0
├── packages/
│   └── shared/            # Shared TypeScript types & Zod schemas
├── docker-compose.yml     # Local development stack
└── .env.example           # Environment configuration template
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI, TanStack Query |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2.0, Pydantic v2, Celery, Redis |
| Database | PostgreSQL 16 + pgvector, SQLAlchemy models, Alembic migrations |
| AI Providers | Any one of OpenAI, Anthropic, Google Gemini, Mistral, Groq, DeepSeek, OpenRouter or local Ollama |
| Video Research | yt-dlp (YouTube search, metadata and captions without API keys), FFmpeg |
| Infrastructure | Docker Compose, Prometheus, Sentry |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)

### 1. Clone and Configure

```bash
cd content-intelligence-os
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 2. Start Development Stack

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432 (with pgvector)
- **Redis** on port 6379
- **Backend API** on port 8000
- **Celery Worker** for background jobs
- **Celery Beat** for scheduled tasks
- **Frontend** on port 3000

### 3. Initialize Database

The backend owns the database schema through **Alembic** migrations
(`apps/backend/alembic/`). They run automatically when the API starts, so
`docker-compose up` is enough. To run them by hand:

```bash
cd apps/backend
python -m app.db.migrate    # upgrade to head (stamps pre-Alembic dev DBs first)
```

To change the schema, edit the SQLAlchemy models in `apps/backend/app/models/`,
then generate a migration with `alembic revision --autogenerate -m "..."`
and review it before committing.

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/v1/docs

## Project Structure

### Backend (`apps/backend/app/`)

```
app/
├── api/v1/
│   ├── endpoints/          # REST API endpoints
│   │   ├── auth.py         # JWT authentication
│   │   ├── projects.py     # Project CRUD
│   │   ├── opportunities.py
│   │   ├── references.py
│   │   ├── investigations.py
│   │   ├── strategies.py
│   │   ├── productions.py
│   │   ├── tests.py
│   │   ├── publications.py
│   │   ├── analytics.py
│   │   ├── knowledge.py
│   │   └── opportunity_discovery.py  # AI Discovery Engine
│   └── router.py
├── core/
│   └── config.py           # Pydantic Settings
├── db/
│   └── session.py          # SQLAlchemy async session
├── models/                 # SQLAlchemy models (18 models)
├── services/
│   └── opportunity_discovery/
│       ├── engine.py       # Discovery engine
│       └── schemas.py      # Pydantic schemas
├── workers/
│   ├── celery_app.py       # Celery configuration
│   └── tasks/
│       ├── discovery.py    # Scheduled discovery tasks
│       ├── media_processing.py
│       ├── publishing.py
│       └── analytics.py
└── main.py                 # FastAPI app factory
```

### Frontend (`apps/frontend/src/`)

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Landing page
│   └── providers.tsx       # TanStack Query provider
├── components/
│   └── ui/                 # Reusable UI components (Button, Card, Input, etc.)
├── lib/
│   └── utils.ts            # Utility functions (cn)
└── styles/
    └── globals.css         # Tailwind + CSS variables
```

### Database Models (18 models)

- **Auth**: User, Session, ApiKey, UserPreferences
- **Core**: Project (11 stages), Opportunity, Reference
- **Analysis**: Investigation (28 analysis types), MultiReferenceAnalysis
- **Production**: CreativeStrategy, Production (8 formats), Test (10 test types)
- **Publishing**: Publication (6 platforms, 6 statuses)
- **Analytics**: Analytics (15+ metrics)
- **Learning**: KnowledgeEntry
- **System**: SystemLog

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (OAuth2 password flow)
- `GET /api/v1/auth/me` - Get current user

### Projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects (paginated)
- `GET /api/v1/projects/{id}` - Get project with relations
- `PATCH /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Opportunity Discovery (AI Engine)
- `POST /api/v1/projects/{id}/discover` - Start AI discovery
- `GET /api/v1/projects/{id}/discover/status` - Get discovery status

### Opportunities
- `POST /api/v1/projects/{id}/opportunities` - Create opportunity
- `GET /api/v1/projects/{id}/opportunities` - List opportunities
- `GET /api/v1/projects/{id}/opportunities/{oid}` - Get opportunity
- `PATCH /api/v1/projects/{id}/opportunities/{oid}` - Update opportunity

### References
- `POST /api/v1/projects/{id}/references` - Add reference
- `GET /api/v1/projects/{id}/references` - List references
- `GET /api/v1/projects/{id}/references/{rid}` - Get reference

### Investigations
- `POST /api/v1/projects/{id}/investigations` - Create investigation
- `GET /api/v1/projects/{id}/investigations` - List investigations

### Creative Strategies
- `POST /api/v1/projects/{id}/strategies` - Create strategy
- `GET /api/v1/projects/{id}/strategies` - List strategies

### Productions
- `POST /api/v1/projects/{id}/productions` - Create production
- `GET /api/v1/projects/{id}/productions` - List productions

### Tests
- `POST /api/v1/projects/{id}/tests` - Create test
- `GET /api/v1/projects/{id}/tests` - List tests

### Publications
- `POST /api/v1/projects/{id}/publications` - Schedule publication
- `GET /api/v1/projects/{id}/publications` - List publications

### Analytics
- `POST /api/v1/projects/{id}/analytics` - Record analytics
- `GET /api/v1/projects/{id}/analytics` - List analytics

### Knowledge Base
- `POST /api/v1/projects/{id}/knowledge` - Add knowledge entry
- `GET /api/v1/projects/{id}/knowledge` - List knowledge entries

## AI Providers

Every AI feature goes through one client (`apps/backend/app/services/llm.py`). Set the
API key for **any one** provider in `.env` and restart the backend
(`docker compose up -d backend celery-worker`):

| Provider | Variable | Default model |
|----------|----------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-5-5 |
| Google Gemini | `GEMINI_API_KEY` | gemini-2.5-flash |
| Mistral | `MISTRAL_API_KEY` | mistral-large-latest |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat |
| OpenRouter | `OPENROUTER_API_KEY` | openrouter/auto |
| Ollama (local) | `OLLAMA_BASE_URL` | llama3.1 |

`LLM_MODEL` overrides the model, `LLM_PROVIDER` picks one when several keys are set.
Settings → AI provider shows which one is active and has a **Test connection** button.
Without any key every module still works and produces template output built from the
real data (search results, transcripts, stats).

## How the modules fit together

1. **Discover / My Ideas**: YouTube search (via yt-dlp) for the niche or idea; the AI ranks
   gaps and angles. Reference videos are always real search results.
2. **Reference Research / Library**: search YouTube or paste any video URL; the library stores
   real stats and the caption transcript.
3. **Investigation Studio**: hooks, structure, pacing, CTAs, curiosity loops... from the
   timestamped transcript, with links to the exact second in the video.
4. **Multi-Reference Intelligence**: compares 2–10 references into "creative DNA", saved to the
   Knowledge Base.
5. **Creative Strategy → Production Studio**: strategies read the Knowledge Base; approved
   strategies become production packages.
6. **Testing Lab**: generated A/B variants with a predicted winner; record the real winner.
7. **Publishing Center**: platform-optimised titles, descriptions and hashtags. Posting to the
   platforms is manual for now (needs each platform's app credentials).
8. **Performance Analytics**: pulls public views/likes/comments from the live video URL,
   diagnoses performance and saves learnings to the Knowledge Base.

### Opportunity ranking

Market interest 22%, audience relevance 20%, creative potential 18%, trend momentum 15%,
content saturation 13% (inverse), production feasibility 12%.

## Background Jobs (Celery)

| Task | Schedule | Description |
|------|----------|-------------|
| `daily-opportunity-discovery` | 24h | Auto-discover for early-stage projects (off unless `AUTO_DISCOVERY_ENABLED=true`; each run calls the paid LLM per project) |
| `hourly-analytics-sync` | 1h | Sync platform analytics |
| `daily-publishing-queue` | 1h | Process scheduled publications |

## Development Commands

```bash
# Frontend
cd apps/frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Jest tests

# Backend
cd apps/backend
uv sync              # Install dependencies
uv run uvicorn app.main:app --reload  # Dev server
uv run pytest        # Run tests
uv run ruff check .  # Lint

# Database (Alembic, from apps/backend)
alembic upgrade head                          # Apply migrations
alembic revision --autogenerate -m "message"  # New migration from model changes
alembic check                                 # Fail if models and migrations differ

# Docker
docker-compose up -d           # Start all services
docker-compose logs -f backend # View backend logs
docker-compose down            # Stop all services
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT signing key (generate with `openssl rand -base64 32`)
- One LLM provider key (see [AI Providers](#ai-providers)), plus optional `LLM_PROVIDER` / `LLM_MODEL`
- `AUTO_DISCOVERY_ENABLED` - daily background discovery (default `false`)
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- Social media API keys for publishing

## Next Steps (Roadmap)

- [x] Discovery, reference research and capture, investigation, multi-reference intelligence
- [x] Creative strategy, production studio, testing lab, publishing center, analytics, knowledge base
- [x] Unified project workspace UI
- [ ] Frame-level visual analysis (download the video + a vision model)
- [ ] Direct publishing and private analytics via platform APIs (YouTube, TikTok, Instagram OAuth)
- [ ] Integration tests, security hardening, deployment config

## License

MIT License - see LICENSE file for details.