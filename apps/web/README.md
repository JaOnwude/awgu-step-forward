# Awgu StepForward — web

Next.js App Router web/PWA client for Awgu StepForward. Product rules live in `../../spec.md` and frontend rules in `../../frontend-spec.md`.

## Develop

Start Postgres and the FastAPI backend first (see the root `README.md`), then:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` if you need to point at a different API URL.

## Checks

```bash
bun run lint
bun run typecheck
bun run build
```

## Layout

- `src/app/` — routes, layouts and `loading.tsx` boundaries
- `src/features/` — domain UI (discovery, account, provider, admin)
- `src/components/shared/` — shared UI such as the header, footer and status badges
- `src/lib/api/` — typed API clients and error mapping
- `src/theme/` — System/Light/Dark theme provider and toggle
