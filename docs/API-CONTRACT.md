# API Contract Guide — Awgu StepForward

**Version:** 0.1  
**Status:** Contract conventions; endpoint schemas are generated from FastAPI OpenAPI  
**API prefix:** `/api/v1`

## 1. Contract ownership

FastAPI Pydantic request/response models and generated OpenAPI are the executable contract. The TypeScript client is generated from or validated against that contract. This guide defines conventions and operation families, not a second source of field-level truth. Do not invent payloads that contradict backend schemas or the product requirements.

## 2. Common conventions

- Use HTTPS and JSON for ordinary API operations; multipart or signed object-storage transfers only for file content.
- Use UUIDs or the repository’s consistent opaque public IDs. IDs are identifiers, never authorization controls.
- Store timestamps in UTC using ISO 8601; return timezone-aware values. Clients display deadlines in WAT.
- Use consistent pagination and bounded filters. Prefer cursor/keyset pagination for large or frequently changing result sets; document order stability.
- Return machine-readable error type/code plus plain field-level messages. Never return stack traces, SQL details, secrets, or private tenant-existence information.
- Keep list response sizes bounded. Do not return provider-only/private applicant fields on public listing routes.
- All writes that may be retried (application submission, report creation, upload completion, status changes where applicable) need idempotency or duplicate-safe semantics.
- Use optimistic concurrency/versioning for editable offline drafts where needed; return a conflict response that lets clients resolve rather than silently overwrite.
- Every endpoint specifies authentication, role, tenant scope, age/consent condition, rate limit, request schema, response schema, status codes, and audit behavior.

## 3. Error/status expectations

| Status | Use |
|---|---|
| 400 | Malformed request or invalid operation not represented as field validation |
| 401 | Authentication required or expired |
| 403 | Authenticated but not permitted; avoid revealing protected object details |
| 404 | Public/not-found or tenant-safe missing object response |
| 409 | State conflict, duplicate/idempotency conflict, deadline/status race |
| 413 | Upload exceeds configured size limit |
| 415 | Unsupported file/content type |
| 422 | Field/schema validation failure |
| 429 | Rate limit or verification cooldown, include retry guidance when safe |
| 5xx | Unexpected service failure with request correlation ID; no internals exposed |

Exact error envelope must be established in FastAPI and reflected in generated TypeScript types.

## 4. Endpoint families

Final routes may vary if the OpenAPI contract remains coherent and equivalent product operations exist.

### Public discovery

- `GET /opportunities`: active, approved public listings with bounded filters, sort, pagination, and Awgu priority support.
- `GET /opportunities/{opportunity_id}`: public details with verification/freshness and safe work/scholarship fields.
- `GET /providers/{provider_id}`: approved provider profile fields only.
- `GET /application-support-sessions`: approved upcoming sessions.
- `GET /application-support-sessions/{session_id}`: public session details.
- `POST /reports`: submit a report subject to abuse limits and privacy rules.

### Authentication and identity

- Initiate/verify phone or email code; resend/recovery subject to expiry, attempt, and rate limits.
- Applicant profile get/update/export/deletion request.
- Guardian link/consent status, approval, and revocation operations using the approved safeguarding protocol.
- Notification preference get/update.
- Optional user preference endpoints only if theme preference becomes account-synchronized; MVP preference is device-local.

### Applicant and applications

- Saved opportunities list/add/remove.
- Retrieve application-form version for an eligible opportunity.
- Create/update draft; initialize/finalize authorized file upload; preview/share summary; submit idempotently; view status history; withdraw where allowed.
- Record external-application start and applicant-reported status.
- Register/cancel for an approved session and view own registration.
- Submit applicant-reported outcome only with clear consent/source labeling.

### Provider

- Create/update provider access request and verification evidence metadata.
- View provider verification state and membership.
- Create/edit/submit listing drafts; retrieve review notes; publish only after staff approval; request changes/expiry where allowed.
- Manage application form versions.
- View applications submitted to that provider and record allowed status updates.
- Propose/manage approved support sessions.
- Optional AI listing assistance is a suggestion-only endpoint with explicit human acceptance; it cannot change review state.

### Staff and operations

- Provider/listing/session review queues and decisions.
- Report queue, assignment, priority, moderation event, suspension/restoration, and escalation.
- Role/member management restricted to super-admin workflows.
- Privacy-safe aggregate metrics and audit search; all privileged access audited.
- Health/readiness endpoints expose only service health, never configuration/secrets/PII.

## 5. Authorization and tenant scope

For each operation, define an authorization matrix from `../spec.md`. Important rules:

- Public reads include only approved/current public fields.
- Provider access is scoped by provider membership on every request, not by frontend route.
- Applicant applications/files are visible to the applicant and the specifically chosen provider only after authorized submission/consent.
- Minor application/session operations require the approved guardian safeguard and age eligibility.
- Staff permissions are granular and audited. Super-admin role management is separate from ordinary moderation.
- Signed file URL issuance checks role, object, application, consent, scan status, and retention at the time of issuance.

## 6. OpenAPI and client generation workflow

1. Define FastAPI schemas, examples, response codes, and security metadata.
2. Generate the OpenAPI artifact from the app in CI or a controlled script.
3. Generate TypeScript client/types into the shared package; do not hand-edit generated output.
4. Run schema-drift and client type checks in CI.
5. Add contract/integration tests for role boundaries, validation, idempotency, and state transitions.
6. Publish API docs only in a protected/non-production environment unless production exposure is explicitly approved.

