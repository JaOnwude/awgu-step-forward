# Software Requirements Specification — Awgu StepForward

**Version:** 0.1  
**Status:** Draft for implementation  
**Product:** Verified opportunity directory and application tracker for Enugu State, prioritizing Awgu LGA

## 1. Purpose

This SRS states what Awgu StepForward must do and the quality constraints that govern it. It is a concise requirements companion to [`../spec.md`](../spec.md), which remains the full product source of truth. It is written for product owners, developers, testers, deployment operators, and implementation agents.

## 2. Product scope

The system helps users discover verified scholarships, education/training, apprenticeships, employment, SME vacancies, and paid local work; apply through an in-platform form or an external provider route; track application progress; and find application-support workshops. Providers submit listings for staff approval. The service supports Enugu State opportunities and prioritizes Awgu discovery and outreach.

The product is not a social network, hiring agency, placement guarantee, credential issuer, payment processor, or automated eligibility/hiring decision system. It must not add public applicant profiles, open messaging, follower/friend features, or pay-to-apply flows.

## 3. Stakeholders and user classes

| User class | Primary goals | Key restrictions |
|---|---|---|
| Visitor | Browse and assess public listings; report suspicious content | Public data only |
| Applicant, under 18 | Discover age-suitable opportunities; save/apply; track progress | Guardian and safeguarding controls before protected workflows; no public contact/profile |
| Applicant, 18+ | Discover, save, apply, track, manage privacy | Shares data with provider only through explicit application flow |
| Guardian | Complete and manage approved linked-minor safeguards | Access limited to linked child and defined consent scope |
| Provider member | Maintain provider profile/listings; review applications for own provider | Must be verified/approved; tenant-scoped access |
| Session organizer/mentor | Propose sessions and manage approved attendance | Minimal registration data only; no unrestricted applicant profile access |
| Administrator | Verify providers/listings; moderate reports; support users | Least privilege and audit trail |
| Super-administrator | Manage staff access and escalations; oversee queues | Strong authentication; privileged actions audited |

## 4. Operating environment and assumptions

- Web/PWA: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query; deployed on Vercel.
- Android: React Native, Expo, Expo Router; distributed as an Android app.
- Backend: FastAPI feature-based modular monolith; deployed on Render.
- Database: PostgreSQL on Neon.
- JavaScript tooling uses Bun; Python dependency/workspace management uses uv.
- Users may have low-end Android devices, intermittent power/connectivity, shared phones, and limited data. English is the pilot language; text must be localizable.
- The service provides coordination and information, not emergency response or continuous clinical/employment monitoring.
- Guardian consent, age assurance, Nigerian data/labor/safeguarding obligations, retention, and provider evidence rules require qualified review before affected live flows launch.

## 5. Functional requirements

The following groups trace to functional requirements in `../spec.md`.

### 5.1 Discovery and opportunity information (R1–R7)

- The system shall provide public, paginated opportunity search without requiring an account.
- Opportunity types shall include scholarships/funding, training, apprenticeship, formal/entry-level work, SME vacancies, and local paid gigs/day work.
- Users shall filter by category, Enugu LGA/community, age/education eligibility, deadline, delivery mode, cost/funding/pay, and sort order.
- Listing detail shall show provider verification/freshness, eligibility, deadlines in WAT, location, costs/pay, requirements, route, and safety terms where relevant.
- Expired listings shall be labeled and excluded from default active results while retained as necessary for application history/audit.
- Users may save, share, or print listing information; synchronized public listings/saved data can be viewed offline.

### 5.2 Identity, age safeguards, and privacy (R8–R15)

- Public browsing shall work without registration. Account verification shall support phone or email.
- The system shall apply configurable age bands and enforce safeguards on the server.
- Minor access to profile, applications, and session registrations shall follow the approved guardian-consent process. Do not use government ID as a default.
- Applicant profile data shall remain private unless the applicant explicitly submits it to a provider after reviewing the data-sharing summary.
- The user shall be able to review/update profile, notification, consent, export, and deletion-request controls.

### 5.3 Provider verification and moderation (R16–R23)

- Organizations, SMEs, independent employers, and household project owners may request provider access using a provider-appropriate verification process.
- Only authorized staff may verify a provider or approve a new/materially edited listing.
- Moderators shall be able to request changes, approve, reject, suspend, restore, and expire records with reason and audit history.
- Listings shall disclose costs/pay, age/eligibility, dates, application route, and relevant safety information. No application fee or misleading guarantee may be listed.
- Construction-site labor follows the adults-only initial policy; all age and safety restrictions are server-enforced.
- Reports shall support routine and urgent safety/fraud triage; targets and staffed coverage must be visible to operators.

### 5.4 Applications and outcomes (R24–R32)

- Providers may configure supported, versioned application questions and optional uploads.
- Applicants shall see answers/files to be shared before submission. Only required/requested documents may be uploaded.
- Submission shall be idempotent and return a receipt/reference. Duplicate retries shall not create duplicate applications.
- Application status and history shall identify the source (applicant, provider, staff). External application progress is explicitly applicant-reported.
- Application progress shall remain distinct from outcomes such as scholarship awarded, training completed, or work started/completed.
- Provider access shall be restricted to applications for that provider; bulk applicant document export is excluded from MVP.

### 5.5 Support sessions and notifications (R33–R38)

- Approved organizers may publish application-support workshops/help desks; applicants may register/cancel and opt into reminders.
- Session access and attendance views shall disclose only the minimum necessary applicant information.
- In-app, email, and SMS notifications shall follow verified destination, user preference, consent, and neutral-message rules. Failed notification delivery cannot block core workflows.

### 5.6 Offline, UX states, and AI (R39–R59)

- PWA and Android shall support approved public listing cache, saved listings, and offline drafts with visible sync state and conflict resolution.
- Skeleton loading, empty, error, offline, permission-denied, stale, and success states must be distinguishable. Skeletons reserve layout space, are reusable, accessible, and respect reduced motion.
- System/Light/Dark appearance is available on web and Android, persisted locally, and uses accessible semantic tokens.
- AI is opt-in, grounded in approved listings, cites the relevant listing/fields, and cannot decide eligibility, rank applicants, approve listings, or receive applicant PII/files in MVP. Deterministic search remains available.
- API endpoints and realistic user flows shall have repeatable load tests. The initial benchmark ladder is 100/250/500/1,000 virtual users plus independent RPS ramps; this is a test plan, not a guaranteed capacity statement.
- Initial candidate service thresholds: read p95 <700 ms, critical write p95 <1 s, failures <1% at target load, excluding file transfer and external-provider latency. Record p50/p95/p99 and infrastructure/resource conditions.
- A managed load balancer/reverse proxy shall route to stateless FastAPI instances with health/readiness checks. Database connection pools and background queues must be bounded and observable.

## 6. External interface requirements

### 6.1 User interfaces

The web/PWA and Android clients must share product terminology, status meaning, semantic brand tokens, and user-facing safety rules while following platform-appropriate controls. Frontend screen inventory and implementation rules are in [`../frontend-spec.md`](../frontend-spec.md); page-level visual prompts are in [`../ui-generation-prompt.md`](../ui-generation-prompt.md).

### 6.2 Software interfaces

- FastAPI exposes versioned REST endpoints and OpenAPI; clients consume typed request/response contracts.
- PostgreSQL stores authoritative application/provider/listing and consent state.
- Object storage holds private documents; short-lived authorized upload/download URLs and malware scanning are required.
- Replaceable adapters are used for SMS, email, background jobs, file scanning, and optional AI.
- Web frontend is deployed on Vercel, API/workers on Render, and PostgreSQL on Neon. Secrets and credentials are configured in the relevant managed environment, never committed.

### 6.3 Communications

All production client-to-service traffic uses HTTPS. CORS is restricted to explicit production/staging origins. Notification content must avoid sensitive details on shared devices. Dates are stored in UTC and displayed in WAT; money is displayed in Naira using `en-NG` conventions.

## 7. Non-functional requirements

- **Performance:** Meet the candidate response thresholds in section 5.6 under a documented workload. Public directory page usability target remains 3 seconds at p75 on a representative mobile connection, subject to measurement.
- **Availability/recovery:** Pilot API availability objective is 99.5% monthly excluding planned maintenance. Daily encrypted database backup and a documented restore exercise are required before pilot.
- **Security:** HTTPS, managed secrets, least privilege, server-side authorization, input validation, rate limiting, CSRF protection for cookie-authenticated web requests, private scanned file storage, audit logging, and dependency scanning.
- **Privacy:** Data minimization, purpose/visibility/retention for personal fields, PII-redacted logs, access/correction/export/deletion paths, and incident response.
- **Accessibility:** Target WCAG 2.2 AA for web, platform accessibility for Android, keyboard/screen-reader use, contrast in both themes, scalable type, and reduced motion.
- **Reliability:** Idempotent writes, bounded timeouts/retries, visible sync outcomes, observable queues, and graceful handling of optional integration failures.
- **Maintainability:** Feature-based FastAPI package organization, typed contracts, migrations, automated checks, environment separation, runbooks, and updated documents.

## 8. Acceptance overview

The pilot is acceptable when the acceptance criteria A1–A11 in `../spec.md` pass, with these additional project-level checks:

1. The same approved API contract supports web/PWA and Android without client-specific authorization rules.
2. Provider/user records cannot be accessed across tenant/role boundaries by changing identifiers.
3. All critical workflows have loading, empty, error, and offline behavior; no sensitive document is publicly cacheable.
4. Load-test reports state the tested configuration and measured sustainable load; no unmeasured capacity promise is made.
5. Vercel/Render/Neon staging and production environments use separate secrets and database credentials.

## 9. Open decisions and launch gates

- Qualified Nigerian privacy/legal/safeguarding review of minors, guardian consent, labor policy, retention, and provider agreements.
- Confirm operational staff rota and whether 48 hours means calendar time or two business days.
- Confirm initial provider verification evidence, document retention, and appeal/suspension policy.
- Select object storage, SMS vendor, email provider, malware scanner, AI provider, and background queue implementation after cost/privacy review.
- Confirm Vercel, Render, and Neon plan limits, region/network placement, pooling setup, backups, and staging/production separation.
- Measure capacity and revise candidate targets only with recorded evidence and rationale.

