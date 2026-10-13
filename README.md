# Awgu StepForward

A verified opportunity directory and application-tracking service for Enugu State, prioritizing Awgu LGA.

## Project status

The project starts from reviewed planning documents. Application code has not been scaffolded yet. Read `docs/README.md` for the document map and source-of-truth order.

## Technology and deployment baseline

- Web/PWA: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query; deploy on Vercel.
- Android: React Native with Expo and Expo Router.
- API: FastAPI modular monolith with feature-based folders; deploy on Render.
- Database: PostgreSQL on Neon.
- JavaScript tooling: Bun. Python tooling: uv.

## First implementation step

Inspect the docs and agree on repository layout and MVP vertical slice, then scaffold the backend, web client, mobile shell, generated API contract, and local development setup. Keep safeguarding and privacy gates in scope from the start.
