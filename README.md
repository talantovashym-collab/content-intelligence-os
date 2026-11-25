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
| AI Providers | OpenAI, Anthropic, Google Gemini, ElevenLabs |
| Media Processing | FFmpeg, Whisper, OpenCV, scenedetect, MoviePy |
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

## AI Opportunity Discovery Engine

The engine performs:
1. **Trend Research** - Finds trending keywords across platforms
2. **Creator Analysis** - Identifies successful creators in niche
3. **Competitor Analysis** - Analyzes competing content performance
4. **Reference Discovery** - Finds high-quality reference videos
5. **Opportunity Generation** - Creates ranked content opportunities
6. **Multi-dimensional Ranking** - 7 ranking dimensions with weights

### Ranking Dimensions
- Market Interest (20%)
- Trend Momentum (15%)
- Audience Relevance (20%)
- Content Saturation (15%) - inverse
- Reference Quality (10%)
- Creative Potential (10%)
- Production Feasibility (10%)

## Background Jobs (Celery)

| Task | Schedule | Description |
|------|----------|-------------|
| `daily-opportunity-discovery` | 24h | Auto-discover for active projects |
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
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_AI_API_KEY` - Google Gemini API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- Social media API keys for publishing

## Next Steps (Roadmap)

- [ ] Reference Discovery & Capture (Modules 2-3)
- [ ] Reverse Media Engineering Pipeline (Module 4)
- [ ] Multi-Reference Intelligence (Module 5)
- [ ] Creative Strategy & Production Studio (Modules 6-7)
- [ ] Testing & Validation Lab (Module 8)
- [ ] Publishing Orchestration (Module 9)
- [ ] Performance Intelligence & Continuous Learning (Modules 10-11)
- [ ] Unified Project Workspace UI
- [ ] Integration tests, security hardening, deployment config

## License

MIT License - see LICENSE file for details.