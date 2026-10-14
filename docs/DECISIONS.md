# Decisions — Awgu StepForward (week-1 demo)

**Updated:** 2026-10-14
**Purpose:** Records the week-1 defaults and every place the build deviates from `../spec.md`, `../frontend-spec.md` or the docs in this folder (required by `../IMPLEMENTATION_PLAN.md` §7). A decision here does not override `spec.md`; it explains a temporary, reversible choice for the demo. Change a decision by editing its status and adding the reason.

Status values: **Adopted** (in force), **Deferred** (spec requirement postponed past week 1), **Proposed** (needs owner confirmation).

## Week-1 defaults (from `IMPLEMENTATION_PLAN.md` §2)

| # | Decision | Status | Where it stands |
|---|---|---|---|
| D1 | Web auth is an HttpOnly, SameSite session cookie (`awgu_session`) plus a CSRF cookie and `X-CSRF-Token` header. No tokens in localStorage. | Adopted | Built (Day 1/4). |
| D2 | One-time codes in dev/test mode: logged on the server and returned in a dev-only `dev_code` field. No live SMS. | Adopted | Built (Day 4). |
| D3 | Email goes through an `EmailAdapter`; `ConsoleEmailAdapter` by default, Brevo stubbed behind config. | Adopted | Planned for Day 6. |
| D4 | SMS goes through an `SmsAdapter`; `ConsoleSmsAdapter` only. Termii not wired. | Adopted | Planned for Day 6. |
| D5 | Files go through a `FileStorage` interface backed by a local private directory. No S3 provider chosen. | Adopted | No uploads in week 1. |
| D6 | AI behind `AI_ENABLED=false`; the assistant returns the same results as ordinary filters. | Adopted | Planned for Day 6. |
| D7 | Minor accounts disabled. Age band is captured, and under-18s cannot create a profile, apply or register. No guardian flow. | Adopted | Enforced server-side in `applicant` and `applications` services. |
| D8 | Android is limited to a scaffold and a shared tokens/API-client plan. | Adopted | See D13. |
| D9 | "48 hours" is shown as an initial response target only; no SLA computation. | Adopted | — |
| D10 | Synthetic data only. No real applicant data, documents or PII. | Adopted | Seeds in `backend/app/scripts/`. |

## Deviations and later decisions

### D11 — shadcn/ui and TanStack Query deferred for week 1
**Status:** Proposed (owner to confirm or reverse)
**Spec says:** the web client uses shadcn/ui primitives and TanStack Query for server state (`spec.md` Web and PWA; `frontend-spec.md` §3).
**Built:** Tailwind CSS v4 with hand-built components, Server Components for public reads, and small typed fetch clients in `apps/web/src/lib/api/`.
**Why:** Days 1–4 shipped without them. Retrofitting every page mid-sprint would put the Day 5–7 slices at risk, and the demo does not need client-side caching to meet the week-1 exit checks.
**Revisit:** straight after the week-1 demo, before offline/PWA work (R39/R40), where TanStack Query's caching earns its place. If the owner wants spec compliance first, add both in a Day 7 slice instead.

### D12 — No generated OpenAPI client or shared packages yet
**Status:** Deferred
**Spec says:** generate TypeScript clients from FastAPI OpenAPI into `packages/api-client`; share `packages/domain` and `packages/design-tokens` (`spec.md` API; `docs/API-CONTRACT.md` §6).
**Built:** hand-written clients in `apps/web/src/lib/api/`. `packages/` is empty.
**Risk:** front-end and back-end shapes can drift. Mitigation until then: keep types in `src/lib/api/` next to the endpoint they call and change both sides in the same slice.
**Revisit:** with the Android scaffold (D13), which is the first real second consumer.

### D13 — Android scaffold not created yet
**Status:** Deferred
**Plan says:** `apps/mobile/` Expo scaffold in week 1.
**Built:** nothing yet. The root `package.json` already has `dev:mobile` and `typecheck:mobile` scripts so they work once `apps/mobile` exists.
**Revisit:** Day 7 if time allows; otherwise the follow-on Android release.

### D14 — Account recovery is "request a new code"
**Status:** Adopted (2026-10-14)
**Context:** the owner asked about a forgotten-password flow. Sign-in uses one-time codes sent to a verified phone or email, so there is no password to reset.
**Decision:** recovery is requesting a new code to the same destination, under the existing resend cooldown and attempt limits. No password field or reset flow is added in week 1. Recovery when the user has lost access to their phone or email is a later support workflow (spec Milestone 2, "account recovery").

### D15 — Adults-only rule for work listings
**Status:** Adopted (2026-10-14)
**Spec says:** construction-site labor is restricted to verified adults (R22a), and age rules are enforced by the API (R22b).
**Built:** `local_work` and `contract` listings, and any listing whose work terms set `adult_only_construction`, are adults-only. On create or edit, a missing `min_age` is set to 18, and a `min_age` below 18 is rejected (422). At apply time the API uses the higher of the listing's `min_age` and 18 for these listings. Becoming adults-only on an approved listing is a material change and sends it back to review. Code: `backend/app/features/opportunities/service.py` (`requires_adult`, `effective_min_age`).
**Note:** treating `contract` as work is a policy reading of R1 ("short-term labor contracts"). Narrow it if contracts turn out to be professional engagements.

### D16 — Single server-side session instead of access/refresh tokens
**Status:** Adopted for week 1
**Spec says:** short-lived access tokens with rotating refresh tokens (`spec.md` Authentication).
**Built:** one opaque server-side session per sign-in (D1). This is simpler and revocable, and meets the TRD baseline for web. Revisit when the Android client needs platform-stored credentials.

### D17 — Spec "Must" items scheduled into the remaining days
**Status:** Adopted (2026-10-14)
These spec requirements were not in the original week-1 plan and were not listed as deferred. They are now scheduled in `IMPLEMENTATION_PLAN.md` §4:
- External application tracking (journey 5, R28): Day 6.
- `POST /reports` and a basic staff report queue (R21): Day 6.
- Moderation restore and expire actions (R20): Day 7.

### D18 — Backend tests run on SQLite in memory
**Status:** Adopted for week 1
Tests use `sqlite+aiosqlite` for speed. Production and local dev use PostgreSQL, so Postgres-specific behaviour (constraints, timezone handling) is checked by running the app locally against Docker Postgres. Add a Postgres CI job before pilot.
