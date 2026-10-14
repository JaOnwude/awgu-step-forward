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

### D11 — shadcn/ui and TanStack Query adopted
**Status:** Adopted (2026-10-14, owner decision — replaces the earlier proposal to defer them)
**Spec says:** the web client uses shadcn/ui primitives and TanStack Query for server state (`spec.md` Web and PWA; `frontend-spec.md` §3).
**Built:**
- shadcn/ui (new-york style) in `apps/web/src/components/ui/`, configured by `apps/web/components.json`. shadcn token names (`card`, `muted`, `accent`, `destructive`, `input`…) are aliases of the existing brand tokens in `globals.css`, so Light/Dark and contrast are unchanged. Because shadcn uses `accent` for hover backgrounds, the brand orange is now `highlight`.
- A `NativeSelect` primitive is used instead of the Radix `Select` for ordinary choices: it is lighter on low-end phones and uses the platform picker.
- TanStack Query owns all browser-side server state. The provider is `src/lib/query/provider.tsx` (one client per browser, a fresh one per server request; 4xx errors are not retried; writes are never auto-retried). Keys live in `src/lib/query/keys.ts`; account hooks in `src/features/account/queries.ts`. Sign-in and sign-out reset every private query so one user's data never shows for another.
- Shared loading, error, offline and permission states are in `src/components/shared/query-states.tsx` (spec R49–R51).
- Public pages stay as Server Components that fetch directly; the directory filter stays a plain GET form, so it works without JavaScript.

### D19 — Web app must call the API on `localhost`, not `127.0.0.1`
**Status:** Adopted (2026-10-14)
**Found:** the web app defaulted to `http://127.0.0.1:8000` while it runs on `http://localhost:3000`. Browsers treat these as different sites, so the `SameSite=Lax` session cookie was not sent and the page could not read the CSRF cookie. Sign-in appeared to succeed but did not stick.
**Fix:** the default API URL and `.env.example` now use `http://localhost:8000`. For deployment, the web and API must share a site (for example `app.example.ng` and `api.example.ng`), or the cookie settings need an ADR.

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

### D20 — How application-support sessions work in week 1
**Status:** Adopted (2026-10-14)
**Spec says:** approved organizers submit sessions, staff approve before public listing, capacity is enforced, reminders follow channel preferences, and the organizer roster omits unneeded applicant data (R33–R38, A5).
**Built** (`backend/app/features/sessions/`):
- **Organizers are members of verified providers.** There is no separate mentor role yet; a provider member proposes sessions for their organisation.
- **Approval:** new sessions are `pending_review` and appear only to the organisation and staff until approved. Staff can approve, reject (with reason) or suspend, and every decision is audited.
- **Capacity:** registration locks the session row (`SELECT … FOR UPDATE` on PostgreSQL) and counts active registrations before inserting, so two people cannot take the last place. The database also enforces `capacity > 0`.
- **Who can register:** adults with an applicant profile only (D7). Registering twice returns the same registration. Registration and cancelling close when the session starts.
- **Roster (R38):** shows the preferred name, registration status and attendance only — no contact details, date of birth or profile. Viewing a roster and recording attendance are audited (R44).
- **Reminders (R34):** the applicant's opt-in is stored on the registration; sending is part of the Day 6 notifications slice.
- **Not built yet:** printable roster, sessions for minors (needs the guardian flow), editing a session after submission, and organizer follow-up resources.

### D21 — Brand and visual design system (redesign)
**Status:** Adopted (2026-10-14, owner request to overhaul the UI)
**Spec says:** an original, warm, editorial, locally grounded brand with documented tokens; the design brief is `ui-generation-prompt.md` (`frontend-spec.md` §5).
**Decided:**
- **Typography:** Fraunces (display/headlines) + Plus Jakarta Sans (UI/body), both SIL OFL, loaded via `next/font`. These replace Geist.
- **Logo:** three rising steps toward a sun, with an "AWGU / StepForward" stacked wordmark. This replaces the placeholder "A" square.
- **Palette:** forest green primary, laterite highlight, sun accent, ink on cream paper, plus semantic verified/success/warning/danger roles, all with dark-mode values. Token values live in `design/mockups/styles.css`.
- **Mockups:** a high-fidelity HTML board at `design/mockups/index.html`, covering brand, foundations, components, 6 web screens and 4 mobile screens. See `design/README.md`.
- **DaisyUI is not used.** The spec forbids layering a second component library on shadcn/ui ("adapt them consistently instead of layering a second component library"), and DaisyUI would duplicate buttons, cards and badges and add CSS weight for low-end phones. The owner confirmed shadcn only.
- **Figma:** a Figma file was created, but the Starter plan's AI tool-call limit blocked the build. The owner chose the HTML board instead; it can be imported into Figma later.
**Implemented** in `apps/web` (2026-10-14): tokens and fonts in `globals.css`/`layout.tsx`, the `Logo` component and `app/icon.svg`, restyled shadcn primitives and status badges, a new header (active links, icon theme switch, account avatar), a phone bottom tab bar and an ink footer, and every screen rebuilt to the mockups. The Day-1 "admin check" demo panel was removed from the home page. The mobile mockups remain the reference for the Expo app.
