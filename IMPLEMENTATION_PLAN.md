# IMPLEMENTATION_PLAN.md — Awgu StepForward (Week-1 Locked Scope)

**Status:** Approved and in progress (Days 1–5 done; Day 5 awaiting merge). Live status: `PROJECT_STATUS.md`. Deviations: `docs/DECISIONS.md`.
**Target:** 7 days, one developer + one coding agent, active daily decisions
**Companion authority:** `spec.md` (product source of truth) > `frontend-spec.md` > `docs/*`. This plan does not override them.
**Success definition:** A deployed, non-sensitive **demo** of the web/PWA core loop. Not production. Not Android. No real applicant data.

---

## 1. Locked scope — what we build in week 1

One end-to-end loop, adults-only, synthetic data only:

> Provider submits listing → staff approves it → visitor discovers it in the public directory → visitor (adult) registers, saves it, and submits one in-platform application → receipt + status history are visible.

Plus, at reduced depth: local paid-work listing (adults-only), application-support session listing, and a feature-flagged no-PII opportunity assistant.

Everything below this line is out of scope for the week and listed in §5.

### In scope (by demo completeness)

| Area | Week-1 deliverable |
|---|---|
| Monorepo | Bun workspace (`apps/web`, `apps/mobile` stub, `packages/*`) + `backend/` managed by uv |
| Backend | FastAPI modular monolith, `/api/v1`, Postgres + Alembic, seeded synthetic listings |
| Roles | Visitor, applicant (18+), provider member, admin — enforced server-side |
| Provider slice | Provider access request (admin-verified), listing draft, submit-for-review |
| Moderation slice | Admin approve / reject-with-reason / request-changes, audit event per transition |
| Discovery | Responsive directory, filters, Awgu-first default ranking, detail page, expired handling |
| Applicant slice | Phone/email OTP (test mode), private profile, save listing, one in-platform form + idempotent submit + receipt |
| Local work | WorkTerms fields (task, pay, timing, dates, worksite, supervisor, PPE, min age) + adults-only badge |
| Sessions | Support-session list + register/cancel (basic) |
| Notifications | Email adapter (test mode) + mocked SMS adapter; preferences UI; no live sends to users |
| AI | `POST /opportunity-assistant/search`, feature-flagged OFF by default, deterministic search is the real path, no PII sent |
| UX states | Loading skeletons, empty, error, offline, permission-denied on data-backed screens; System/Light/Dark |
| Deploy | Non-sensitive demo env on Vercel + Render + Neon |

---

## 2. Locked decisions (defaults if owner stays silent)

These close open items in `SRS.md:134-141` for the week only. Reversible; record real changes as ADRs.

1. **Web auth:** HttpOnly + SameSite cookie session with CSRF token. No localStorage tokens.
2. **OTP delivery:** dev/test mode — code logged to server console + returned in a dev-only response field. No live SMS.
3. **Email:** `EmailAdapter` interface; `ConsoleEmailAdapter` default, Brevo adapter stubbed behind config.
4. **SMS:** `SmsAdapter` interface; `ConsoleSmsAdapter` only. Termii not wired.
5. **Object storage:** `FileStorage` interface; local private dir for week 1. No S3 provider selected yet.
6. **AI:** feature flag `AI_ENABLED=false`. Assistant returns the same result set as standard filters.
7. **Minor accounts:** disabled. Age band captured but under-18 cannot create profile/apply/register. No guardian flow coded.
8. **Android:** scaffold + shared tokens/API-client plan only.
9. **"48 hours":** displayed as "initial response target" text only; no SLA computation.
10. **Data:** synthetic only. No real applicant data, documents, or PII.

---

## 3. Repository layout (target)

```text
backend/
  pyproject.toml, uv.lock
  app/
    main.py                 # composition only
    core/                   # settings, security, errors, logging
    db/                     # engine, session, base
    features/
      identity/ providers/ verification/ opportunities/
      applications/ sessions/ notifications/ moderation/ files/ ai/ audit/
    integrations/           # email, sms, storage, ai adapters
    jobs/                   # listing expiry, reminder stubs
  tests/
  alembic/
apps/
  web/   src/app, src/features, src/components, src/lib, src/theme
  mobile/                 # Expo scaffold only
packages/
  api-client/ domain/ design-tokens/
```

Feature modules own `router.py`, `schemas.py`, `service.py`, `models.py`, `repository.py`. Route files stay thin; authorization lives in services.

---

## 4. Day plan (one vertical slice per day)

Each day ends deployable and with its own acceptance check ("Exit").

Progress: Days 1–5 ✅ done (Day 5 awaiting merge). Days 6–7 ⬜ not started.

**Day 1 — Foundation & vertical slice zero** ✅ (mobile scaffold deferred, see `docs/DECISIONS.md` D13)
- Scaffold Bun workspace + uv backend, Postgres + Alembic, `core/` config/security/errors.
- User/role tables, session auth, current-actor dependency, audit-event table.
- Web shell with routing, theme provider, semantic tokens, layout.
- Exit: `bun run dev:web` + `uv run ...` server start; a logged-in synthetic admin can hit one authenticated endpoint.

**Day 2 — Provider + moderation slice** ✅
- Provider entity, membership, verification case; listing draft + `LISTING_REVISIONS`.
- Admin queue: approve / reject(reason) / request-changes; audit event per action; verification/status badges.
- Exit: verified provider's draft stays private until an admin approves; every transition is audited (`A3`).

**Day 3 — Public discovery** ✅
- `GET /opportunities` (+ detail) with bounded filters, sort, pagination, Awgu-first ranking; expiry job.
- Responsive directory, filter chips/drawer, detail page with verification + deadline (WAT) + cost/pay, expired labels.
- Exit: visitor browses without account; expired listings drop from default results (`A1`).

**Day 4 — Applicant workflows** ✅ (external-application tracking moved to Day 6)
- OTP (test mode), adult profile (private), save listing, one in-platform form with idempotent submit + receipt + status history.
- Apply/share summary before submit; 401/403/404/409/422 mapping in a typed error adapter.
- Exit: adult submits once despite retries, gets a receipt, sees history (`A4` partial).

**Day 5 — Local work + support sessions** ✅
- ✅ WorkTerms fields + adults-only enforcement in API (`docs/DECISIONS.md` D15). ✅ Work detail page with safety/PPE.
- ✅ Support-session list + register/cancel; minimal organizer view; staff approval (`docs/DECISIONS.md` D20). Reminders are stored as an opt-in and sent from Day 6.
- Exit: under-18 cannot reach work apply; session capacity enforced (`A5` partial).

**Day 6 — Notifications + AI slice**
- Notification preferences (in-app + email), `ConsoleEmailAdapter`, deadline-reminder job stub.
- Feature-flagged opportunity assistant grounded in approved listings; deterministic fallback always visible; no PII.
- External application tracking: record "external application started", let the applicant mark progress, label it applicant-reported (journey 5, `R28`).
- `POST /reports` (rate-limited, anonymous allowed) plus a basic staff report queue with category and age (`R21`).
- Exit: disabling AI leaves ordinary search fully usable (`A9` partial); external statuses show as applicant-reported; a visitor can report a listing and staff can see it.

**Day 7 — Stabilize & demo**
- Moderation `restore` and `expire` actions, audited like the others (`R20`).
- Run lint/typecheck/tests/build; fix top defects; keyboard + mobile-width pass; a11y (axe) on core routes.
- Seed a coherent demo; write `docs/DECISIONS.md` + `docs/RUNBOOK.md`; deploy non-sensitive demo.
- Exit: documented known limits; demo link works end to end (`A10` partial, `A11` deferred).

---

## 5. Explicitly DEFERRED (do not build in week 1)

- Any released/distributed Android app (scaffold only).
- Minor accounts, guardian consent/link, child-safeguarding flows.
- Live SMS to users (Termii), and real provider/real-user email sends.
- Real object storage, malware scanning, signed-URL lifecycle, document uploads in production.
- Full offline conflict resolution; only basic caching + visible stale/offline states.
- Live AI provider; AI stays feature-flagged and PII-free.
- Load-test/capacity program (k6), 100→1,000 VU ramps, SLA computation.
- Multi-instance topology, load balancer, DB pool tuning, read replicas, caching.
- Bulk export, cross-device sync, Igbo localization, printable rosters/summaries (unless trivial).
- Security penetration review, privacy impact assessment sign-off.
- Anything requiring Nigerian legal/privacy/safeguarding approval (`spec.md:369`, `449`).

---

## 6. Preconditions the owner must provide (blockers)

1. Repo access + a clean branch; confirm Bun and uv installed locally.
2. Accounts/credentials for Neon, Render, Vercel (and later Brevo/Termii/storage) — or explicit "local-only demo" decision.
3. Confirmation of the §2 locked defaults (or replacements).
4. Synthetic seed content: LGAs, communities, sample providers/listings. No real names/documents.
5. A decision on whether the demo is public (non-sensitive) or internal-only.

---

## 7. Definition of done (week-1)

- [ ] The §1 loop works end to end on the demo deploy.
- [ ] Authorization (role, tenant scope, age) enforced in backend services, not just hidden in UI.
- [ ] Idempotent submission verified; duplicate retries create one application.
- [ ] Loading/empty/error/offline/permission states present on data-backed screens.
- [ ] System/Light/Dark works and persists across restart.
- [ ] Lint, typecheck, unit tests, and production build pass; axe clean on core web routes.
- [ ] `docs/DECISIONS.md` records every week-1 default and deviation; `docs/RUNBOOK.md` covers start/deploy/seed.
- [ ] Known-limits section lists everything in §5 as not done.

---

## 8. Rules for continuing agents

- Inspect the repo before editing; preserve working features; do not re-plan the project each turn.
- Implement one vertical slice at a time; keep product rules server-side.
- Never weaken safeguarding, authorization, privacy, or accessibility to hit a date.
- Stop at external credentials or legal approvals; never fake a production integration.
- Report per slice: files changed, behavior done, checks run + results, limitations, next step.
