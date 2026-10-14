# Awgu StepForward

A verified opportunity directory and application-tracking service for Enugu State, prioritizing Awgu LGA.

## Project status

Week-1 demo build in progress (web/PWA + FastAPI). Days 1–4 are merged to `main`; Day 5 is on `day-5-local-work`. See `PROJECT_STATUS.md` for current state and `IMPLEMENTATION_PLAN.md` for the day plan. Read `docs/README.md` for the document map and source-of-truth order, and `docs/DECISIONS.md` for week-1 defaults and deviations.

This is a non-sensitive demo with synthetic data only. It is not production-ready.

## Technology and deployment baseline

- Web/PWA: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query; deploy on Vercel.
- Android: React Native with Expo and Expo Router (follow-on release; not yet scaffolded).
- API: FastAPI modular monolith with feature-based folders; deploy on Render.
- Database: PostgreSQL on Neon (Docker Postgres locally).
- JavaScript tooling: Bun. Python tooling: uv.

## Run locally

```bash
docker compose up -d                                   # Postgres
cd backend && uv run uvicorn app.main:app --reload     # API on http://127.0.0.1:8000
cd apps/web && bun run dev                             # web on http://localhost:3000
```

Open `http://localhost:3000` (not `127.0.0.1`, for CORS). The first backend start runs migrations and seeds demo data.

## Checks

```bash
cd backend && uv run pytest -q && uv run ruff check .
cd apps/web && bun run lint && bun run typecheck && bun run build
```
