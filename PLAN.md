# Hireable — Full Implementation Plan

## What We're Building
A mobile app (demoed via iOS Simulator on MacBook) that:
1. Takes a user's CV (PDF upload)
2. Searches the web for real job descriptions matching their target role
3. Does a skills gap analysis between their CV and the job requirements
4. Generates a gamified learning roadmap (topics → subtopics → lessons) to close those gaps
5. Each lesson has 3 tabs: **Learn** (YouTube + articles), **Flashcards** (AI-generated), **Quiz** (AI-generated multiple choice)
6. Full XP/level/progress gamification system

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | Expo SDK 52 + TypeScript + Expo Router | Runs in iOS Simulator on macOS, file-based routing, React syntax |
| Styling | NativeWind v4 (Tailwind CSS for React Native) | Zero design decisions, fast to write, pairs with Expo perfectly |
| Animations | react-native-reanimated + react-native-gesture-handler | Both bundled with Expo SDK |
| State management | Zustand | Minimal boilerplate, no provider hell |
| Backend | FastAPI + Python (managed with `uv`) | Async, perfect for LLM/AI pipelines |
| Database | SQLite + SQLAlchemy | No cloud setup needed, works fully offline |
| LLM API | OpenRouter | User specified — single API for multiple models |
| Web search | Tavily API | Job description search + lesson resource search |
| PDF parsing | pypdf (pure Python) | Handles text-based PDFs, no heavy deps |

### OpenRouter model assignments
- CV parsing, job search aggregation, gap analysis → `google/gemini-flash-1.5` (fast + cheap)
- Roadmap generation (needs quality structured output) → `anthropic/claude-3-5-haiku-20241022`
- Flashcard + quiz generation (called live) → `google/gemini-flash-1.5`

### Node/JS runtime
Node is broken on this machine (llhttp dylib issue). Use **Bun** (`bun` is installed at 1.3.13) for all frontend JS operations instead of npm/npx/yarn.

---

## Folder Structure

```
hireable/
├── PLAN.md                      ← this file
├── README.md
├── .gitignore
│
├── apps/
│   └── mobile/                  ← Expo React Native app
│       ├── app.json
│       ├── tsconfig.json
│       ├── package.json
│       ├── babel.config.js      ← must include NativeWind preset
│       ├── tailwind.config.js   ← NativeWind v4 config
│       ├── metro.config.js      ← must include NativeWind CSS support
│       ├── assets/
│       │   ├── fonts/
│       │   └── images/
│       └── src/
│           ├── app/             ← Expo Router (file = route)
│           │   ├── _layout.tsx          ← root Stack navigator
│           │   ├── index.tsx            ← Upload screen (first screen)
│           │   ├── analyzing.tsx        ← Pipeline progress screen
│           │   ├── roadmap/
│           │   │   ├── _layout.tsx
│           │   │   ├── index.tsx        ← Roadmap home (topics grid)
│           │   │   └── [topicId]/
│           │   │       ├── index.tsx           ← Topic detail (subtopic list)
│           │   │       └── [lessonId]/
│           │   │           └── index.tsx       ← Lesson screen (3 tabs)
│           │   └── profile.tsx          ← XP / level / progress stats
│           ├── components/
│           │   ├── ui/                  ← Button, Card, Badge, etc.
│           │   ├── cv/
│           │   │   └── UploadCard.tsx
│           │   ├── roadmap/
│           │   │   ├── TopicCard.tsx
│           │   │   ├── SubtopicRow.tsx
│           │   │   └── ProgressRing.tsx
│           │   ├── lesson/
│           │   │   ├── FlashCard.tsx
│           │   │   ├── QuizCard.tsx
│           │   │   └── ResourceLink.tsx
│           │   └── gamification/
│           │       ├── XPBar.tsx
│           │       ├── LevelBadge.tsx
│           │       └── XPPopup.tsx      ← floating +XP animation
│           ├── hooks/
│           │   ├── useUpload.ts
│           │   ├── useRoadmap.ts
│           │   ├── useLesson.ts
│           │   └── useProgress.ts
│           ├── stores/
│           │   └── useAppStore.ts       ← Zustand global store
│           ├── api/
│           │   └── client.ts            ← typed fetch wrappers for all endpoints
│           ├── types/
│           │   └── index.ts             ← shared TypeScript interfaces
│           └── utils/
│               ├── xp.ts               ← level formula: floor(xp/100)+1
│               └── format.ts
│
└── backend/
    ├── pyproject.toml           ← uv-managed Python project
    ├── .python-version          ← pin to 3.14
    ├── .env                     ← OPENROUTER_API_KEY, TAVILY_API_KEY (gitignored)
    ├── .env.example             ← template committed to repo
    ├── main.py                  ← FastAPI app, CORS config, router registration
    ├── hireable.db              ← SQLite DB file (gitignored)
    └── hireable/
        ├── __init__.py
        ├── config.py            ← pydantic-settings (reads .env)
        ├── database.py          ← SQLAlchemy engine, session factory, Base
        ├── models/
        │   ├── __init__.py
        │   ├── db.py            ← all SQLAlchemy ORM models
        │   └── schemas.py       ← all Pydantic request/response models
        ├── routers/
        │   ├── __init__.py
        │   ├── cv.py            ← /api/cv/*
        │   ├── roadmap.py       ← /api/roadmap/*
        │   ├── lessons.py       ← /api/lessons/*
        │   └── progress.py      ← /api/progress/*
        ├── agents/
        │   ├── __init__.py
        │   ├── pipeline.py      ← orchestrates all stages as BackgroundTask
        │   ├── cv_parser.py     ← Stage 1: PDF → CVData JSON
        │   ├── job_searcher.py  ← Stage 2: Tavily → JobRequirements JSON
        │   ├── gap_analyzer.py  ← Stage 3: CVData + JobReqs → GapAnalysis JSON
        │   ├── roadmap_builder.py ← Stage 4: GapAnalysis → full Roadmap tree
        │   └── content_generator.py ← Stage 5 (lazy): flashcards, quiz, resources
        └── services/
            ├── openrouter.py    ← generic chat_completion(messages, model) → str
            └── tavily.py        ← generic search(query, num_results) → list[dict]
```

---

## Agentic Pipeline (Backend)

Triggered as a FastAPI `BackgroundTask` on CV upload. Frontend polls `GET /api/cv/{id}/status` every 2 seconds.

```
POST /api/cv/upload (PDF + optional job_title)
    │
    ▼ Stage 1 — cv_parser.py  [progress: 10 → 30]
    pypdf extracts text from PDF
    → OpenRouter (gemini-flash-1.5): structured extraction
    → Returns CVData: { name, email, skills[], experience[], education[], certifications[] }

    ▼ Stage 2 — job_searcher.py  [progress: 30 → 55]
    Tavily search: "{target_role} job requirements 2024 skills" (5 results)
    Tavily search: "{target_role} required qualifications" (5 results)
    → OpenRouter (gemini-flash-1.5): aggregate into unified requirements
    → Returns JobRequirements: { required_skills[], nice_to_have[], tools[], experience_years }

    ▼ Stage 3 — gap_analyzer.py  [progress: 55 → 70]
    → OpenRouter (gemini-flash-1.5): compare CVData vs JobRequirements
    → Returns GapAnalysis: { skills_present[], skills_missing[], skills_partial[], gap_score: 0-100 }

    ▼ Stage 4 — roadmap_builder.py  [progress: 70 → 95]
    → OpenRouter (claude-3-5-haiku): generate full learning tree
    → Returns: 3-5 topics, each with 3-5 subtopics, each with 2-3 lessons
    → Persists entire tree to SQLite
    → Returns roadmap_id

    ▼ Done  [progress: 100]
    → session.roadmap_id set, frontend navigates to /roadmap
```

### Stage 5 — content_generator.py (LAZY — called on demand)
Only runs when user opens a specific lesson tab. Results cached in SQLite.

- **Learn tab**: `Tavily.search("{lesson_title} tutorial beginner 2024")` → extract YouTube links + article URLs
- **Flashcards tab**: OpenRouter (gemini-flash-1.5) → `[{ front: "term", back: "2-3 sentence explanation" }]` × 5-8 cards
- **Quiz tab**: OpenRouter (gemini-flash-1.5) → `[{ question, options: [A,B,C,D], correct: "B", explanation }]` × 5 questions

---

## Data Models (SQLite via SQLAlchemy)

### sessions
```
id: UUID (PK)
cv_filename: str
target_role: str
status: str  — "parsing" | "searching" | "analyzing" | "building" | "done" | "error"
progress: int  — 0 to 100
message: str  — human-readable status e.g. "Found 47 job postings..."
roadmap_id: UUID (FK, nullable)
created_at: datetime
```

### roadmaps
```
id: UUID (PK)
session_id: UUID (FK)
title: str  — e.g. "ML Engineer Roadmap"
target_role: str
gap_score: int  — 0-100 (100 = perfect fit)
cv_data: str  — JSON blob of CVData
job_requirements: str  — JSON blob of JobRequirements
gap_analysis: str  — JSON blob of GapAnalysis
created_at: datetime
```

### topics
```
id: UUID (PK)
roadmap_id: UUID (FK)
title: str  — e.g. "Deep Learning Fundamentals"
description: str
order_index: int
icon: str  — emoji assigned by LLM (e.g. "🧠")
color: str  — hex color for card gradient, assigned by LLM (e.g. "#6C63FF")
xp_total: int  — sum of all lesson xp_rewards under this topic
```

### subtopics
```
id: UUID (PK)
topic_id: UUID (FK)
title: str
order_index: int
```

### lessons
```
id: UUID (PK)
subtopic_id: UUID (FK)
title: str
description: str
estimated_minutes: int
xp_reward: int  — 10 (easy) / 25 (intermediate) / 50 (advanced)
order_index: int
is_locked: bool  — true if prerequisite not completed
prerequisite_lesson_id: UUID (nullable FK)
resources: str  — JSON: [{ type: "youtube"|"article", title, url }] — null until generated
flashcards: str  — JSON: [{ front, back }] — null until generated
quiz: str  — JSON: [{ question, options[], correct, explanation }] — null until generated
```

### progress
```
id: UUID (PK)
session_id: UUID (FK)
lesson_id: UUID (FK)
completed_at: datetime
quiz_score: int (nullable)  — 0-100
xp_earned: int
```

---

## API Endpoints

```
POST /api/cv/upload
  Body: multipart/form-data { file: PDF, job_title?: string }
  Response: { session_id: string, status: "processing" }

GET /api/cv/{session_id}/status
  Response: { status, progress: 0-100, message, roadmap_id?: string }

GET /api/roadmap/{roadmap_id}
  Response: full nested tree (roadmap → topics → subtopics → lessons)

GET /api/roadmap/{roadmap_id}/summary
  Response: { title, target_role, gap_score, total_lessons, completed_lessons, xp_earned, level }

GET /api/lessons/{lesson_id}
  Response: lesson detail — triggers lazy content generation if not yet done

POST /api/lessons/{lesson_id}/generate-content
  Body: { content_type: "flashcards" | "quiz" | "resources" }
  Response: { flashcards?: [...], quiz?: [...], resources?: [...] }

POST /api/lessons/{lesson_id}/complete
  Body: { quiz_score?: number }
  Response: { xp_earned, new_level?: number, total_xp, level_up: bool }

GET /api/progress/{session_id}
  Response: { xp, level, completed_lessons: [], streak, completion_percentage }
```

---

## UI/UX — Wow Factor

### Color System
- Background: `#0A0A0F` (near-black, premium dark feel)
- Primary: `#6C63FF` (purple)
- Accent: `#00D2FF` (electric blue)
- Success: `#00C896` (green)
- Error: `#FF4D6D` (red-pink)
- Topic card colors: hex codes assigned by the LLM per topic

### Screen-by-screen

**Upload Screen (`/`)**
- Animated pulsing dashed border around the PDF drop zone
- File icon animates in on selection
- Gradient "Analyze My CV →" button
- Job title field with AI suggestion chip below it

**Analyzing Screen (`/analyzing`) — THE DEMO SHOWSTOPPER**
- Full-screen dark gradient background (purple → blue)
- 4 pipeline stage steps with animated checkmarks that appear as each stage completes:
  - "Parsing your CV..." → "Searching job market..." → "Analyzing skill gaps..." → "Building your roadmap..."
- Pulsing AI orb/ring animation in center
- Live type-writer status messages: "Found 47 job postings for ML Engineer..."
- Large progress ring that fills from 0% to 100%

**Roadmap Screen (`/roadmap`)**
- XP bar at very top that animates fill on load
- Level badge with glow effect: "Level 3 • Junior Developer"
- Topic cards in a 2-column grid, each with:
  - Gradient background (unique color per topic)
  - Emoji icon (large, top-left)
  - Topic title + lesson count
  - Circular progress ring (bottom-right)

**Topic Detail (`/roadmap/[topicId]`)**
- Hero header with topic color gradient
- Subtopic sections, each listing lessons as rows
- Locked lessons show lock icon + reduced opacity
- Each lesson row shows: title, estimated time, XP reward badge, completion checkmark

**Lesson Screen (`/roadmap/[topicId]/[lessonId]`)**
- react-native-tab-view with 3 sliding tabs: Learn | Flashcards | Quiz
- **Learn tab**: YouTube card with thumbnail + article link list
- **Flashcards tab**:
  - Card stack (front card on top, others peeking behind)
  - Tap to flip (3D Y-axis rotate animation)
  - Swipe right = "Got it!" (green), swipe left = "Review again" (orange)
  - Progress counter: "3 / 8"
- **Quiz tab**:
  - Question card at top
  - 4 option cards below — tap to select
  - On submit: selected card animates to green (correct) or red (wrong), correct answer highlighted
  - Haptic feedback on selection
  - End screen: animated score ring + "+25 XP" burst animation
  - `react-native-confetti-cannon` fires if score ≥ 80%

**XP Reward Flow (any lesson completion)**
- Floating "+25 XP" text that flies upward and fades (Reanimated `withSpring` + `withTiming`)
- XP bar in header re-animates to new value
- If level-up: full-screen brief flash + confetti

---

## Build Order (Hackathon Priority)

### Phase 1 — Backend Core (Hours 1-3)
1. `cd backend && uv init --python 3.14`
2. `uv add fastapi uvicorn sqlalchemy pypdf httpx pydantic-settings python-multipart aiofiles`
3. Create `config.py`, `database.py`, all models in `models/db.py` and `models/schemas.py`
4. Implement `services/openrouter.py` — `async def chat_completion(messages, model, json_mode=True)`
5. Implement `services/tavily.py` — `async def search(query, num_results=5)`
6. Implement all 4 agents: `cv_parser.py`, `job_searcher.py`, `gap_analyzer.py`, `roadmap_builder.py`
7. Wire up `agents/pipeline.py` orchestrator
8. Implement `routers/cv.py` with upload + status endpoints
9. Test: `curl -X POST localhost:8000/api/cv/upload -F "file=@test.pdf" -F "job_title=ML Engineer"`

✅ **Checkpoint**: Upload CV → pipeline runs → roadmap in SQLite

### Phase 2 — Frontend Shell + Roadmap Display (Hours 3-6)
1. `bun create expo apps/mobile --template blank-typescript`
2. Set up NativeWind v4 (edit `babel.config.js`, `metro.config.js`, `tailwind.config.js`)
3. Create `api/client.ts` with typed wrappers for all endpoints
4. Create Zustand store (`stores/useAppStore.ts`): session_id, roadmap_id, xp, level
5. Build Upload Screen with file picker (`expo-document-picker`) + job title input
6. Build Analyzing Screen with polling loop (setInterval every 2s) + progress animations
7. Build Roadmap Screen with topic card grid
8. Build Topic Detail Screen with subtopic/lesson list

✅ **Checkpoint**: Full onboarding flow → roadmap displayed correctly in simulator

### Phase 3 — Lesson Experience (Hours 6-9)
1. Implement `agents/content_generator.py` (flashcards, quiz, resources)
2. Implement `routers/lessons.py` with generate-content + complete endpoints
3. Build Lesson Screen with react-native-tab-view (3 tabs)
4. Build FlashCard component with flip animation (Reanimated) + gesture swipe
5. Build QuizCard with option selection + color feedback + score screen
6. Wire up XP: `POST /api/lessons/{id}/complete` → Zustand XP update → float animation

✅ **Checkpoint**: Complete lesson flow end-to-end (learn → flashcards → quiz → XP)

### Phase 4 — Gamification Polish (Hours 9-11)
1. Animated XP bar fill in header
2. "+XP" float animation component (Reanimated)
3. Confetti on level-up (`react-native-confetti-cannon`)
4. Progress rings on topic cards update dynamically
5. Locked/unlocked lesson state (lock icon, opacity)
6. Profile screen: XP history, level, completion % per topic

### Phase 5 — Demo Polish (Hours 11-12)
1. Pre-generate 1-2 sessions for demo reliability (seed script or hardcoded fixture)
2. Add loading skeletons everywhere (shimmer animation placeholder)
3. Fix iOS Simulator layout issues (safe area insets with `expo-safe-area-context`)
4. Check keyboard avoidance on Upload Screen
5. Final spacing, font, and color pass

---

## Environment Variables

Create `backend/.env`:
```
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
DATABASE_URL=sqlite:///./hireable.db
```

Create `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## Key Implementation Notes

- **PDF parsing**: `pypdf` only works on text-based PDFs. If a CV is scanned/image, show a user-friendly error. Don't add OCR for a hackathon.
- **OpenRouter JSON mode**: Always use `response_format: { "type": "json_object" }` and include "Return valid JSON only." in every structured extraction prompt. Wrap JSON parsing in try/except with one retry.
- **BackgroundTask vs Celery**: Use FastAPI's built-in `BackgroundTasks` — the pipeline is I/O-bound (LLM + web calls) so asyncio is fine. No need for Celery/Redis.
- **Session ID**: Store in Zustand on the frontend after CV upload. Pass it to every relevant API call. No auth needed for the demo.
- **CORS**: Open CORS in FastAPI (`allow_origins=["*"]`) for local iOS Simulator access.
- **Expo run**: Use `bunx expo run:ios` (not `npx`) since Node is broken. This builds a dev client and launches iOS Simulator.
- **API base URL**: `http://localhost:8000` hardcoded in `apps/mobile/.env` as `EXPO_PUBLIC_API_URL`. iOS Simulator can reach macOS localhost directly.
- **NativeWind v4 gotcha**: v4 setup is different from v2. The `nativewind/babel` preset and `withNativeWind` metro wrapper are both required. Follow v4 docs exactly.

---

## Demo Script (3 minutes)

1. Show Upload screen → drop in a prepared PDF → type "ML Engineer" → tap Analyze
2. Analyzing screen animates through all 4 stages → wow moment
3. Roadmap appears → scroll through colored topic cards
4. Tap a topic → see subtopics and lessons
5. Tap a lesson → Learn tab (YouTube card + articles)
6. Flip to Flashcards → swipe through a few with the flip animation
7. Flip to Quiz → answer 3 questions → score screen → "+25 XP" animation
8. Show XP bar fill up → level badge increment
9. Back to roadmap → progress ring on topic card has updated
