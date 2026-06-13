# Hireable

A mobile app that turns your CV into a gamified learning roadmap to close skill gaps for your target role.

## Stack

- **Mobile:** Expo SDK 52 + TypeScript + Expo Router + NativeWind v4 + Zustand
- **Backend:** FastAPI + SQLite + SQLAlchemy + OpenRouter (`google/gemini-2.5-flash`)
- **Package managers:** Bun (frontend), uv (backend)

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Seed a demo session (optional):

```bash
cd backend
uv run python seed_demo.py
```

### Mobile

```bash
cd apps/mobile
# EXPO_PUBLIC_API_URL=http://localhost:8000 is in .env
bun install
bun run ios
```

## Demo flow

1. Upload a text-based PDF CV and enter a target role
2. Watch the analyzing screen poll the pipeline
3. Explore the roadmap, topics, and lessons
4. Complete a lesson quiz to earn XP

## API

- `POST /api/cv/upload` — upload PDF + job title
- `GET /api/cv/{session_id}/status` — pipeline progress
- `GET /api/roadmap/{roadmap_id}?session_id=` — full roadmap tree
- `POST /api/lessons/{lesson_id}/generate-content` — lazy flashcards/quiz/resources
- `POST /api/lessons/{lesson_id}/complete?session_id=` — earn XP
