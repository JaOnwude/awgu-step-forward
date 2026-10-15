# PROJECT_STATUS.md — Awgu StepForward

**Last updated:** 2026-10-15
**Purpose:** Handoff/status document so another coding agent (e.g. Claude) can pick up mid-project without re-planning.

---

## 1. What this project is

Awgu StepForward is a **non-sensitive web/PWA demo** built in a 7-day sprint: a verified opportunity directory + application tracker for **Awgu / Enugu State, Nigeria**. Adults only. Synthetic data only. **Not production.**

**Authority order (do not override):**
`spec.md` (product source of truth) > `frontend-spec.md` > `docs/*` (SRS/TRD/API-CONTRACT/ERD) > `IMPLEMENTATION_PLAN.md` (day plan & locked week-1 decisions).

Read `IMPLEMENTATION_PLAN.md` before doing anything — it holds the locked scope, locked defaults, day plan, and "rules for continuing agents". Read `docs/DECISIONS.md` for every week-1 default and every deviation from the specs.

---

## 2. Current status at a glance

| Area | State |
|---|---|
| Day 1 — Foundation & auth slice | Done, merged to `main` (mobile scaffold deferred — `DECISIONS.md` D13) |
| Day 2 — Provider + moderation | Done, merged to `main` |
| Day 3 — Public discovery | Done, merged to `main` |
| Day 4 — Applicant workflows | Done, merged to `main`, **pushed** (external-application tracking moved to Day 6) |
| Day 5 — Local work + support sessions | Done, merged to `main` (PR #2) |
| Redesign (D21) | Done, merged to `main` (PR #3) |
| Day 6 — Notifications + AI slice | Done, merged to `main` (PR #3, D22) |
| Visuals (D23) | Done, merged to `main` (PR #4): illustrations, motion, stories carousel, single theme button |
| Day 7 — Stabilize & demo | Done on `day-7-demo` (D24): restore/expire, provider suspend/restore, instant-navigation fix, axe pass, deploy proxy, `docs/RUNBOOK.md`. **Deploy is run by the owner** (RUNBOOK §7). |
| Backend tests | `62 passed` (`uv run pytest -q`) |
| Backend lint | `uv run ruff check .` — All checks passed |
| Web lint / typecheck / build | `bun run lint`, `bun run typecheck` and `bun run build` pass (2026-10-15) |
| Accessibility | axe (WCAG 2.1 A/AA + best practice) clean on all main routes (2026-10-15) |

**Branches:**
- `main` — includes Days 1–6, the redesign and the visuals (PRs #2–#4). Pushed to `origin`.
- `day-7-demo` — Day 7, ready for its PR.

**Workflow the owner has locked in (IMPORTANT — respect it):**
- One commit per file.
- The **owner runs `git add`, commit and push.** The agent does not stage, commit or push; it hands over small one-file `git add && git commit` command blocks plus the push command, and a PR title/description when asked.
- One branch per day, hyphens only: `day-1-auth`, `day-2-provider-moderation`, `day-3-discovery`, `day-4-applicant`, `day-5-local-work`, `day-6-notify-ai`, `day-7-demo`.
- Each day merged back to `main` with `git merge --no-ff`.

---

## 3. What is already built

### Backend (`backend/` — FastAPI modular monolith, `/api/v1`, Postgres + Alembic)
Feature modules present under `backend/app/features/`:
- `identity/` — one-time-code auth (no passwords). Session cookie `awgu_session` (HttpOnly), CSRF cookie `awgu_csrf` + `X-CSRF-Token` header. `OtpChallenge` model with resend cooldown and attempt limit.
- `providers/` — provider org, membership, verification case.
- `opportunities/` — listing catalog, `WorkTerms` (Day 5), adults-only rule for work listings, discovery queries (`search_public`, `get_opportunity`), expiry job.
- `moderation/` — admin approve / reject-with-reason / request-changes / suspend / restore / expire for listings, and suspend / restore for providers (suspending a provider suspends its live listings and sessions); audit event per transition. `GET /admin/moderation/catalog` lists live and suspended items (D24).
- `applicant/` — private profile (under-18 blocked), saved opportunities.
- `applications/` — in-platform application workflow, idempotent submit, receipt + status history, min-age check. Has `form.py`.
- `sessions/` — application-support sessions and registrations (Day 5, D20).
- `audit/` — audit events.
- `app/core/` — settings, security, errors, logging (now configured at startup in `main.py`).
- `app/bootstrap.py` — dev-only auto migrate + seed when `environment == "development"` and `dev_bootstrap`.
- `app/scripts/seed_demo.py` — synthetic demo seed.

**Alembic revisions (in order):**
`dc78e8d0fb51` (initial) → `83a952599a9d` (provider/verification/listings) → `111120522cba` (applicant + applications) → `4127bd0e7216` (work_terms — Day 5) → `b49cd38b41aa` (support sessions — Day 5).

**Tests:** `backend/tests/{test_health,test_auth,test_provider_moderation,test_discovery,test_applicant,test_work_terms,test_sessions}.py` — 38 tests.

### 3a. Day 5 fixes made on 2026-10-14 (on `day-5-local-work`)
- **Work terms were not actually saved or returned.** The service passed the raw `work_terms` dict into the `Opportunity` model (which crashes when work terms are sent), and the detail endpoint never returned them. The routers also had a `try/except` that fell back to `model_validate(opp.__dict__)`, hiding errors. Fixed: work terms are built as `WorkTerms` rows on create/update, eager-loaded in `repository.get_opportunity` (`selectinload`), returned on `OpportunityDetail`, and the router fallback is removed.
- **Adults-only enforcement** (`DECISIONS.md` D15): `local_work`/`contract` listings and construction work terms default to `min_age` 18, reject `min_age` < 18 (422), and use an effective minimum of 18 at apply time. Becoming adults-only sends an approved listing back to review.
- `configure_logging()` is now called in `app/main.py` (it was imported but never called).
- New tests: `backend/tests/test_work_terms.py` (5 tests).

### Web (`apps/web/` — Next 16.4.0, App Router, Cache Components, Tailwind v4, shadcn/ui, TanStack Query)
- Routes: `/` (home), `/opportunities` (directory), `/opportunities/[id]` (detail, now with work terms, safety/PPE and the adults-only notice), `/opportunities/[id]/apply` (now with a full answer review before submit), `/account`, `/account/applications/[id]`, `/admin`, `/providers` (listing form now collects work terms).
- Feature UI under `src/features/{discovery,account,admin,provider,demo}`; account query hooks in `src/features/account/queries.ts`.
- shadcn/ui primitives in `src/components/ui/` (`components.json`); shared loading/error/offline states in `src/components/shared/query-states.tsx` (`DECISIONS.md` D11).
- TanStack Query provider and keys in `src/lib/query/`.
- API/data clients under `src/lib/api/{client,auth,discovery,opportunities,applicant,applications,moderation,providers,errors}.ts` (hand-written — `DECISIONS.md` D12).
- Theme provider `src/theme/` (System/Light/Dark, persisted in localStorage).
- The API URL must use `localhost`, not `127.0.0.1` (D19). If you have an old `apps/web/.env.local`, update it.

**Not present:** `apps/mobile/` (no Expo scaffold yet — D13) and anything under `packages/` (D12). The root `package.json` mobile scripts will work once `apps/mobile` exists.

---

## 4. What is LEFT (the actual remaining work)

### 4a. Finish Day 5 on `day-5-local-work`

`IMPLEMENTATION_PLAN.md` §4 Day 5 defines four things:

1. Done — `WorkTerms` fields + migration + schemas, saved and returned correctly.
2. Done — **Adults-only enforcement in the API** for work listings (D15).
3. Done — **Work detail page** shows work terms, safety/PPE and an adults-only notice; providers can enter work terms.
4. Done — **Support sessions** (D20): verified providers propose, staff approve before listing, capacity enforced with a row lock, adults-only registration, register/cancel, minimal roster (preferred name + attendance, audited). Pages: `/sessions`, `/sessions/[id]`, account "Your support sessions", provider organizer panel, staff review queue. Reminder opt-in is stored; sending comes with Day 6 notifications.

**Exit for Day 5:** met — under-18 cannot reach work apply; session capacity enforced (`A5` partial: reminders pending Day 6).

Then: one commit per file, `git merge --no-ff day-5-local-work` into `main`.

### 4b. Day 6 — Done (2026-10-14, `docs/DECISIONS.md` D22)
- **Reports** (`features/reports/`): `POST /reports` (anonymous or signed in with CSRF, 5/hour per hashed fingerprint), staff queue in `/admin/moderation/queue` (urgent first, age, overdue), resolve / dismiss / suspend target, all audited. UI: "Report this listing/session" dialog; Reports card in the staff workspace.
- **External tracking** (`features/applications/`): `POST /applications/tracked`, `PATCH /applications/{id}/tracking`; statuses always applicant-reported; private note. UI: provider-site / in-person apply buttons start tracking; tracking card on the application page; "Reported by you" labels.
- **Notifications** (`features/notifications/`, `integrations/messaging.py`, `jobs/reminders.py`): preferences (channel needs a verified address), in-app inbox, console email/SMS adapters (log only, masked), deduplicated deadline + session reminders, failures recorded not raised. Run the job with `uv run python -m app.jobs.reminders` or the staff "Run reminder job" button. UI: header bell, inbox and reminder settings on the account page.
- **Assistant** (`features/assistant/`): `GET /opportunity-assistant/status`, `POST /opportunity-assistant/search`; off unless `AI_ENABLED=true`; rule-based interpreter, no external model; redacts contacts/IDs; logs `AIUsageEvent` without the query. UI: panel above the directory, hidden when off.
- **Exit met:** disabling AI leaves ordinary search fully usable (tested); external statuses are applicant-reported; a visitor can report a listing and staff see it.

### 4c. Day 7 — Done (2026-10-15, `docs/DECISIONS.md` D24)
- Restore + expire for listings and suspend + restore for providers (`R20`), audited, with a "Published listings & providers" staff card; 5 new tests.
- Lint / typecheck / 62 tests / production build pass. Detail pages read params and data inside `<Suspense>` (dev "1 issue" warning gone). Phone header overflow fixed. axe clean on all main routes; contrast checked for every token pair in both themes.
- Demo seed reviewed (3 providers, 6 listings across all categories, 2 sessions). `docs/RUNBOOK.md` covers run, demo script, checks, jobs, reset, deploy and **known limits**.
- `next.config.ts` proxies `/api` to `API_ORIGIN` so deployed sign-in cookies are first-party (verified locally).
- **Remaining:** the owner deploys (RUNBOOK §7) and checks the live demo end to end.

### 4d. Decisions taken / still open
- **Forgotten password:** decided 2026-10-14 — recovery is requesting a new one-time code (D14). Do not build a password flow.
- **shadcn/ui + TanStack Query:** adopted 2026-10-14 (D11).

### 4e. Explicitly DEFERRED (do NOT build)
See `IMPLEMENTATION_PLAN.md` §5: released mobile app, minor/guardian flows, live SMS, real email sends, real object storage, full offline sync, live AI provider, load testing, multi-instance topology, Igbo localization, security pen-test.

---

## 5. Environment & how to run

**Stack:** Bun `1.3.14` workspace, Node `v24.14.0`, uv-managed Python backend, Docker Postgres `postgres:16-alpine` (container `awgu-db`, `awgu/awgu/awgu`, port 5432).

**Run (owner uses Git Bash; commands below are bash):**
```bash
# repo root
docker compose up -d              # Postgres only
# backend/
uv run uvicorn app.main:app --reload   # http://127.0.0.1:8000  (Swagger at /docs)
# apps/web/
bun run dev                       # http://localhost:3000
```
Open **`http://localhost:3000`** (not `127.0.0.1`, for CORS). Allow ~20–30s for dev migrations + seed.

**Checks:**
```bash
# backend/
uv run pytest -q
uv run ruff check .               # run from backend/ only
uv run ruff format --check .
# apps/web/
bun run lint
bun run typecheck
bun run build
```

---

## 6. Conventions & gotchas (learned the hard way)

- **Shell mismatch:** owner's terminal is Git Bash; the agent tool shell may be **Windows PowerShell**. In PowerShell: no `tail`/`head`/`grep`/`wc`/`find`/`rm -f`, and **no heredocs (`<<`)**. Use `Select-Object -First/-Last`, `findstr`, `Remove-Item -LiteralPath`, or full-path Git tools (`C:\Program Files\Git\usr\bin\grep.exe`). Prefer the dedicated read/write/edit/search tools over shell text munging. `python` is not on PATH; use `uv run python`.
- **`uv` is not on PATH in PowerShell** — call `C:\Users\Dell\.local\bin\uv.exe`. `uv run …` works in the owner's login shell.
- **Bash scripts must use LF endings.** `bun run` scripts print a spurious PowerShell `RemoteException` banner but do run.
- **Backend lint config:** `select=["E","F","I","B","UP"]`, `ignore=["B008"]`, line-length 88, `extend-exclude=["alembic/versions"]`. Do NOT add `src=["app"]`.
- **Errors envelope:** `{"error":{"code","message","fields"?}}`. CORS default `["http://localhost:3000"]`.
- **SQLAlchemy greenlet pitfall:** response models or code that touch a **lazily-loaded relationship** throw `sqlalchemy.exc.MissingGreenlet`. Always `selectinload(...)` the relationship on the returning query (as `opportunities.repository.get_opportunity` does for `work_terms`), or keep it out of broadly-used response schemas (`work_terms` is on `OpportunityDetail` only, not `OpportunityOut`). Never paper over it with `try/except`.
- **Web:** `eslint-config-next` core-web-vitals enforced; `react-hooks/set-state-in-effect` enforced; internal links use `next/link`. Cache Components (Next 16): runtime data in a route must sit inside `<Suspense>` or have a `loading.tsx`.
- **Roles:** visitor, applicant (18+), provider member, admin (`admin`), super-admin (`super_admin`). Staff = `{admin, super_admin}`. Enforce authorization **server-side**.
- **Opportunity enums:** types `("training","apprenticeship","scholarship","employment","local_work","contract")`; adults-only types `("local_work","contract")`; `DELIVERY_MODES=("onsite","hybrid","remote")`; `APPLICATION_ROUTES=("platform","external","in_person")`; statuses `("draft","pending_review","changes_requested","approved","rejected","suspended","expired")`. `MATERIAL_FIELDS` require re-review on change.
- **Discovery semantics:** public surface = `approved` (detail also `expired`); default list excludes non-approved and past-deadline; naive datetimes normalized via `_as_aware`.
- **Ask, don't assume.** Stop at external credentials/legal approvals; never fake a production integration.

---

## 7. Where the important things live

- Product truth: `spec.md` (Day 5 L252, Day 6/7 L253–254; modules L277–278; data model L330–346; A5/R33–R38; R48/R59).
- Plan & locked decisions: `IMPLEMENTATION_PLAN.md` (§1 scope, §2 defaults, §4 day plan, §5 deferred, §8 agent rules).
- Decisions and deviations: `docs/DECISIONS.md`.
- Frontend truth: `frontend-spec.md`.
- Docs: `docs/{SRS,TRD,API-CONTRACT,ERD}.md`.
- Backend entry: `backend/app/main.py`; routes mounted in `backend/app/api/v1.py`.
- Day 5 work: `backend/app/features/opportunities/{models,schemas,router,repository,service}.py`, `backend/app/features/applications/service.py`, `backend/alembic/versions/4127bd0e7216_add_work_terms.py`, `backend/tests/test_work_terms.py`; sessions in `backend/app/features/sessions/`, `backend/alembic/versions/b49cd38b41aa_add_support_sessions.py`, `backend/tests/test_sessions.py`, `apps/web/src/features/sessions/`, `apps/web/src/app/sessions/`.

---

## 8. Suggested next action for the picking-up agent

1. Read `IMPLEMENTATION_PLAN.md`, `docs/DECISIONS.md`, and the `spec.md` sections cited above.
2. Owner merges `day-7-demo` into `main` and deploys from `docs/RUNBOOK.md` §7.
3. One commit per file; hand the owner the `git add`/commit commands (agent does not stage, commit or push).
4. After the demo: the follow-ups in RUNBOOK "Known limits" (real sign-in codes, scheduled jobs, session restore, mobile scaffold).
