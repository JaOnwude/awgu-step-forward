# Awgu StepForward — Frontend Implementation Specification

**Status:** Draft for implementation planning  
**Product:** Awgu StepForward  
**Scope:** Next.js web/PWA and React Native Android client  
**Companion documents:** [Product specification](spec.md), [Figma/UI generation prompt pack](ui-generation-prompt.md)

## 1. Purpose and source of truth

This document turns the product requirements into frontend implementation guidance for an AI coding agent. It is intended to be added to the Awgu StepForward project context in Claude Code or another coding agent. It covers the web/PWA and Android client experience, frontend architecture, screens, shared states, accessibility, quality checks, and delivery order. It does not replace the backend contract or the product specification.

Use these sources in this order when details conflict:

1. `outputs/spec.md` defines product behavior, roles, permissions, safety rules, data handling, and acceptance criteria.
2. This document defines frontend architecture and implementation constraints.
3. `outputs/ui-generation-prompt.md` guides visual design and Figma generation; it must not override product or accessibility requirements.
4. The attached HelpVerified frontend rebuild prompt is an inspiration for the level of specificity and organization only. Do not copy its product rules, text, brand, colors, assets, route structure, stack choices, or code.

Before implementation, inspect the actual repository, existing `AGENTS.md`/`CLAUDE.md`, package scripts, API OpenAPI schema, and current design assets. Preserve working project conventions unless they conflict with this spec or the product spec. Do not assume an empty repository.

## 2. Product and frontend boundaries

Awgu StepForward is a verified opportunity directory and application-management service for Enugu State, prioritizing Awgu. It is not a social network. The frontend must not add public applicant profiles, feeds, follower counts, likes, unrestricted direct messages, or opaque applicant scoring.

Frontend clients may improve clarity and guide users through safe flows, but the server is authoritative for authorization, eligibility, provider verification, listing approval, application state, guardian controls, and all sensitive decisions. A disabled button or hidden menu is not an authorization control. The UI must display server-confirmed states as such and label applicant-reported information accordingly.

### User-facing clients

- **Web/PWA:** public marketing and opportunity discovery, authentication, applicant workflows, provider workspace, and staff/admin workspace.
- **Android:** React Native with Expo and Expo Router. Applicant-focused for the pilot; include provider/admin native access only if the product owner explicitly adds it later.
- **Responsive design:** web must work from small mobile screens through large desktops. Android uses native interaction patterns and shared brand tokens, not web DOM components.

## 3. Technology and workspace rules

### Web

- Next.js App Router and TypeScript strict mode.
- Tailwind CSS and shadcn/ui primitives, adapted to the product’s semantic tokens.
- TanStack Query for remote/server state. It is not a general global state store.
- React Hook Form and Zod (or repository-standard equivalent) for forms; backend validation remains authoritative.
- Generate or derive typed API clients from the FastAPI OpenAPI schema where practical. Never maintain duplicate hand-written API contracts when generation is available.
- Use Server Components for suitable public/SEO routes and initial reads; use Client Components only for interaction, browser APIs, and client state.

### Android

- React Native, Expo, Expo Router, and TypeScript.
- Use native components and platform accessibility patterns. Do not reuse Next.js/shadcn DOM components in React Native.
- TanStack Query for API-backed state. Use shared API types, domain schemas where compatible, localization strings, and semantic design-token values from shared packages.

### Tooling

- Use **Bun** for JavaScript/TypeScript installation, scripts, and workspace management. Keep and update `bun.lock`. Do not create npm/pnpm setup commands or lockfiles.
- Use **uv** for Python/backend workflows. Do not create pip-based installation instructions.
- Keep frontend and backend dependency management independently reproducible in a Bun workspace plus the backend’s uv project configuration.
- Respect existing version choices in the repository; when scaffolding new packages, use compatible current stable releases and commit lockfiles instead of pinning this spec to temporary version numbers.

## 4. Architecture and source boundaries

Prefer a workspace layout similar to the following, adapting to the actual repository:

```text
apps/
  web/
  mobile/
backend/
packages/
  api-client/       # generated API types/client where practical
  domain/           # shared non-UI schemas, enums, and safe domain helpers
  design-tokens/    # semantic source tokens plus platform adapters
```

Suggested web layout:

```text
apps/web/src/
  app/              # route composition, layouts, loading/error/not-found boundaries
  features/         # opportunities, applications, profile, providers, sessions, moderation
  components/ui/    # shadcn primitives customized to the design system
  components/shared/# navigation, feedback, status, skeletons, forms
  lib/              # API client, auth/session helpers, formatting, query client
  theme/            # semantic tokens and theme provider
  content/          # localized, reviewable static copy
```

Suggested mobile layout:

```text
apps/mobile/src/
  app/              # Expo Router route files and layouts
  features/         # applicant product features and native screens
  components/       # native reusable UI and feedback components
  lib/              # API, auth, storage, sync, formatting
```

Architecture rules:

- Route files stay thin: parse route params, attach metadata/layouts, and compose a feature screen. Keep product logic in feature modules.
- Keep API calls in a typed API/data-access layer. UI components do not call `fetch` directly.
- Keep TanStack Query as the source of truth for remote server data; use local component state for transient interaction. Add another global store only for a demonstrated cross-route client-state need.
- Use shared design tokens, not copied CSS values or duplicated theme maps. Do not import web UI into mobile.
- Keep feature-to-feature dependencies explicit and shallow. Avoid giant barrel exports that pull screen/client code into unrelated routes.
- Do not add an MSW mock backend that becomes a second implementation of business rules. Use MSW or fixtures for isolated frontend development/tests only where the actual API is unavailable; keep authorization and state transitions in the real FastAPI backend.
- Handle API errors through a typed adapter that maps validation, authorization, rate-limit, offline, and server errors to plain-language messages. Never show raw stack traces, SQL errors, or internal error codes.
- All route paths, labels, and role navigation should come from one route/navigation configuration per client rather than scattered string literals.

## 5. Visual system and references

Create an original Awgu StepForward visual identity. Do not reuse HelpVerified’s navy/blue palette, typography, gradients, logo, page copy, or exact components. Do not copy source code, images, icons, or proprietary assets from any reference site.

Use the companion UI generation prompt as the source for the proposed design direction and reference roles. Adapt all references to the local opportunity service, low-bandwidth context, safeguarding needs, and the product’s actual brand assets. Improve or omit a reference pattern when it harms clarity, accessibility, performance, or mobile usability.

Centralize and document semantic design tokens for:

- Brand and semantic colors, including light and dark values.
- Typography families, weights, type scale, and line heights.
- Spacing, layout/container widths, breakpoints, and responsive behavior.
- Radii, borders, shadows, focus rings, and elevation.
- Buttons and status variants.
- Motion durations/easing and reduced-motion behavior.

Components consume semantic roles such as background, surface, text, muted text, border, primary, success, warning, danger, verified, and focus. Avoid raw hex values inside page/component markup. Status meaning must not rely on color alone.

### Dark mode

- Provide **System**, **Light**, and **Dark** appearance choices on web/PWA and Android.
- System follows the operating system/browser preference. An explicit selection is persisted locally on that device and applied across routes after restart.
- Initialize the web theme early enough to avoid a visible flash of the wrong mode where the framework permits it.
- Keep the same information hierarchy and affordances in both modes; do not make dark mode a color inversion.
- Check text, controls, focus indicators, charts, status badges, skeletons, illustrations, and overlays for adequate contrast in each mode.
- No theme preference changes authorization or data visibility. Cross-device account sync is not required for the pilot.

## 6. Shared interaction and feedback patterns

Build reusable primitives for buttons, inputs, selects, search, cards, filter chips, pagination, status badges, provider verification, deadline/cost/pay summaries, upload controls, confirmation dialogs, toasts, offline banners, empty states, error states, skeletons, and form feedback.

Each interactive component must have a clear focus state, accessible name, disabled/busy state, keyboard/touch operation, and appropriate error feedback. Dangerous actions (withdrawal, deletion, suspension, rejection) require clear confirmation and a reason where the product spec requires one.

### Loading skeletons

- Add App Router `loading.tsx` for route-level waits and nested Suspense/loading boundaries for independently loading sections.
- Build content-shaped reusable skeletons for opportunity cards, detail pages, dashboard sections, lists/tables, and forms. Reserve expected dimensions to avoid layout shift.
- Keep stable navigation and shell visible where possible. Do not show invented names, opportunities, statistics, or values as skeleton content.
- Distinguish skeleton loading from empty, error, offline, permission-denied, and expired states. A failed request must resolve to an error/retry state rather than an endless placeholder.
- Avoid skeleton flash for very fast requests and keep safe stale data visible during background refresh.
- Expose a concise accessible loading status; hide decorative skeleton shapes from assistive technology. Respect reduced-motion preferences; static skeletons are acceptable.

### Dark mode and low-bandwidth presentation

- The appearance control is available from account/settings and an appropriate shared navigation location. Do not make it dominate the primary task flow.
- Use CSS/system theme support and local persistence on web; use platform storage/preferences on Android. Avoid a flash or reset on app restart.
- Prefer responsive/compressed imagery, avoid autoplay video and heavy background effects, and defer non-critical images/animations.
- Show offline and last-synced status where cached data is displayed. Make stale data visibly stale and offer a retry/sync action.

## 7. Routes and screen inventory

Use the master product specification’s role matrix and journeys as authoritative. Route names below are suggested route groups; inspect repository conventions before choosing exact URLs. Public browsing must not require authentication.

### Public and marketing

- Landing/home page: product value, Enugu/Awgu context, opportunity categories, verification explanation, support sessions, provider/SME entry point, safety and privacy links.
- Opportunity directory: search, filters, sort, result count, Awgu prioritization, statewide selection, pagination, stale/expired labels, offline/last-updated information.
- Opportunity detail: provider verification and freshness, eligibility/age, deadline in WAT, location, cost/funding/pay, required documents, application route, work safety details, report/save/share/print actions.
- Application-support session directory and detail.
- Provider information/onboarding entry point.
- Privacy, terms, accessibility, contact/support, report content pages.

### Authentication and applicant

- Sign in/create account with phone or email verification and recovery/resend/error states.
- Age-aware onboarding and guardian-consent states, following master-spec launch gating.
- Applicant home/dashboard, private profile, preferences, saved listings, and offline sync status.
- In-platform application form, requested-file upload, review/share confirmation, submission receipt, status history, and withdrawal where permitted.
- External-application handoff and applicant-reported tracker.
- Support-session registration/cancellation and reminder preference.
- Privacy controls: notification preferences, export/deletion requests, consent review/revocation.

### Provider

- Organization/employer request and verification progress.
- Opportunity creation/edit, preview, submit-for-review, requested changes, approved/expired/suspended states.
- Provider-scoped application list/detail and status update; no cross-organization data.
- Support-session proposal and management.
- Optional AI listing assistance must present suggestions for human review and never approve/publish.

### Staff and super-admin

- Provider verification queue and case details.
- Listing review queue and listing preview.
- Reports/moderation queue, with urgent safeguarding/fraud work visually separate from routine work.
- Support-session review.
- Role/permission administration, escalations, audit search, and privacy-safe aggregate reporting.
- Show queue owner, age, priority, overdue state, and service target. Limit visible personal data to the task’s need.

For every route, define and implement: initial/loading state, success state, empty state, validation state, server error, offline/stale state, permission-denied state, and relevant expired/suspended state. Do not make a static landing page the only completed experience.

## 8. Forms, permissions, and sensitive UI

- Validate input on the client for usability and on the server for enforcement. Present field errors adjacent to fields and preserve safe form input after retryable failures.
- Before application submission, show exactly which profile fields and files will be shared with the named provider.
- Upload only files requested by that opportunity. Show upload progress, scan/pending state, retry, invalid type/size, and removal controls. Never expose a private file through a public URL.
- Do not put sensitive data into route query strings, analytics events, toast text, browser logs, or screenshots used as default fixtures.
- Minor flows must use approved guardian safeguards and must not expose a minor’s phone number, home location, or documents to a provider before an authorized application/consent step.
- Construction labor screens are adults-only under the current product policy; the client can explain/hide ineligible listings, while the API remains the enforcement point.
- Provider/staff records are scoped by organization/role on the server. The UI must handle 403/404 without leaking whether another tenant’s object exists.

## 9. Offline, PWA, and synchronization

- Cache static application assets and approved public opportunity data. Store only user-owned drafts/saved data in client storage according to the master privacy/security rules.
- Never put CVs, application documents, guardian evidence, or private provider files in a shared service-worker cache.
- Offline drafts survive app/browser restart and clearly show local/syncing/synced/failed/conflict states with the last successful sync time.
- Final application submission, moderation, verification, and provider status changes require an explicit server acknowledgement.
- Queue retryable sync operations safely and idempotently. Present conflicts for user resolution; do not silently overwrite edits.
- Do not claim continuous background sync or notifications where the browser/OS cannot guarantee them.

## 10. Accessibility and localization

- Follow WCAG 2.2 AA as the target for web content and controls; use equivalent platform accessibility practices on Android.
- Include semantic headings/landmarks, keyboard navigation, visible focus, accessible dialogs, appropriate labels, screen-reader status announcements, and reduced-motion support.
- Meet or exceed 44 CSS px web and 48 dp Android touch targets where practical. Support zoom/text scaling without clipping core tasks.
- Test contrast in Light and Dark themes. Never use color as the only indication of status or eligibility.
- Use plain English at pilot; externalize copy and notification strings for reviewed Igbo localization later.
- Format Naira with `en-NG` conventions and show deadlines in West Africa Time (WAT); retain UTC instants in API/storage.

## 11. SEO, rendering, and performance

- Public opportunity and marketing routes should have meaningful titles, descriptions, canonical URLs where appropriate, and crawlable content. Authenticated/private routes should not be indexed.
- Use server rendering/static generation where appropriate for public, non-sensitive content. Do not put private applicant data in public HTML or shared caches.
- Keep client bundles focused; lazy-load non-critical staff/admin and optional AI interfaces as appropriate.
- Use image dimensions/aspect ratios to prevent layout shift; compress and serve responsive assets. Do not load large assets solely for decoration.
- Preserve the product spec’s user-facing performance goals. Add frontend measurements for Core Web Vitals on representative mobile devices/connections; do not claim passing results without measurement.

## 12. Testing and quality gates

Use repository-compatible tools; recommended baseline:

- Unit/component: Vitest and Testing Library for shared components, forms, theme selection, and loading/error/empty/offline states.
- Accessibility: axe checks on core web routes plus manual keyboard/screen-reader spot checks and Android accessibility inspection.
- End-to-end: Playwright for web; Expo/React Native-compatible e2e approach only if feasible for the pilot. Cover directory → detail → application → receipt/tracker, authentication/age gates, provider submission/review, and moderation/report flows.
- Contract: validate API client request/response types against FastAPI OpenAPI; test permission/error mapping.
- Performance: k6/API capacity tests are defined in the product spec. Add frontend page-load/Lighthouse checks for representative public and authenticated routes. Never use a mock-only API test as proof of backend capacity.
- Theme: verify System/Light/Dark persistence, no startup flash where applicable, and representative contrast in both themes.
- Loading: use delayed/interrupted network fixtures to verify skeleton geometry, state transitions, error recovery, and no indefinite loading.

Before declaring frontend work complete, run the repository’s documented Bun scripts for lint, typecheck, unit tests, production build, and relevant e2e/accessibility checks. Report actual command results and known gaps. Do not add a test framework or broad tooling without checking whether the repo already has an equivalent.

## 13. Implementation workflow for coding agents

1. Inspect repository structure, current dependencies, docs, design assets, and FastAPI OpenAPI endpoints. Summarize what exists and any contract gaps before changing files.
2. Create or update a route/screen inventory and map each screen to the main spec requirements and API operation(s).
3. Establish the token foundation, theme provider, typography, layouts, accessible primitives, and shared feedback/skeleton components before styling feature screens.
4. Implement complete vertical slices in this order: public directory/detail; authentication and applicant onboarding; applications/tracker; provider workflows; staff/moderation; PWA/offline polish; Android applicant workflows.
5. Use real API contracts as available. If a backend endpoint is not ready, isolate a clearly labeled fixture/adapter, document the missing contract, and keep the frontend integration seam replaceable.
6. Run relevant checks after each vertical slice. Continue through the agreed scope without stopping for routine sign-off after each phase. Record assumptions and unresolved product decisions in a short `docs/decisions/` note; pause only for a true blocker or a decision with material safety/privacy/payment consequences.
7. Finish with a route-by-route implementation report, tests/build results, accessibility and responsive gaps, API dependencies, and a list of incomplete requirements. Do not claim complete screens when only a visual mock exists.

The project targets a rapid pilot, so prioritize functional and safe vertical slices over adding libraries, elaborate animations, generalized abstractions, or infrastructure not justified by this scope. Do not weaken safeguarding, authorization, privacy, accessibility, or API correctness to meet a calendar estimate.

## 14. Frontend completion checklist

- [ ] All required public, applicant, provider, and staff web routes are implemented or explicitly listed as deferred with an owner/rationale.
- [ ] Android applicant flows have native layouts and navigation rather than web screenshots embedded in an app shell.
- [ ] API contracts are typed and server authorization remains authoritative.
- [ ] System/Light/Dark appearance works on web and Android and is persisted locally.
- [ ] Skeletons, empty, error, offline, stale, and permission-denied states are implemented for data-backed screens.
- [ ] Offline draft/sync behavior follows the privacy and acknowledgement rules.
- [ ] Accessibility checks cover keyboard, screen reader, contrast, reduced motion, and text scaling.
- [ ] Core user journeys pass automated end-to-end checks where supported.
- [ ] Production build, lint, typecheck, and unit/component tests pass.
- [ ] No HelpVerified proprietary branding, copy, image assets, code, or business rules were copied.
- [ ] Figma/UI prompts remain separate and consistent with the product and frontend specifications.

