# Entity-Relationship Diagram — Awgu StepForward

**Version:** 0.1  
**Status:** Conceptual model for review  
**Database target:** PostgreSQL on Neon

## 1. Modeling notes

This is a normalized starting point derived from the product specification. It is not a substitute for privacy/legal review or production migrations. Use UUID identifiers, UTC timestamps, foreign keys, and explicit status history. Apply retention/deletion policy to personal and uploaded data. Do not store government ID by default. Never expose an object-storage key as a public file URL.

Use separate diagrams by domain for readability. `provider_entities` represents an organization, SME, school, NGO, independent employer, or household project owner; an individual employer does not need organization-registration fields that do not apply.

## 2. Identity, providers, and opportunities

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    USERS ||--o| APPLICANT_PROFILES : owns
    USERS ||--o{ GUARDIAN_LINKS : minor_side
    USERS ||--o{ GUARDIAN_LINKS : guardian_side
    USERS ||--o{ PROVIDER_MEMBERSHIPS : participates
    PROVIDER_ENTITIES ||--o{ PROVIDER_MEMBERSHIPS : includes
    PROVIDER_ENTITIES ||--o{ VERIFICATION_CASES : reviewed_by_staff
    USERS ||--o{ VERIFICATION_CASES : reviewer
    PROVIDER_ENTITIES ||--o{ OPPORTUNITIES : publishes
    USERS ||--o{ OPPORTUNITIES : created_by
    OPPORTUNITIES ||--o| WORK_TERMS : may_define
    OPPORTUNITIES ||--o{ LISTING_REVISIONS : versioned_as
    USERS ||--o{ LISTING_REVISIONS : actor
    USERS ||--o{ SAVED_OPPORTUNITIES : saves
    OPPORTUNITIES ||--o{ SAVED_OPPORTUNITIES : saved

    USERS {
      uuid id PK
      string email nullable
      string phone nullable
      string account_status
      datetime email_verified_at nullable
      datetime phone_verified_at nullable
      datetime created_at
      datetime updated_at
    }
    USER_ROLES {
      uuid id PK
      uuid user_id FK
      string role
      datetime granted_at
      uuid granted_by FK nullable
      datetime revoked_at nullable
    }
    APPLICANT_PROFILES {
      uuid id PK
      uuid user_id FK
      string preferred_name
      string age_band
      date birth_date nullable
      string lga
      string community nullable
      string education_level nullable
      json interests
      json skills nullable
      datetime updated_at
    }
    GUARDIAN_LINKS {
      uuid id PK
      uuid minor_user_id FK
      uuid guardian_user_id FK nullable
      string guardian_contact_encrypted
      string status
      string consent_scope_version
      datetime verified_at nullable
      datetime revoked_at nullable
      datetime created_at
    }
    PROVIDER_ENTITIES {
      uuid id PK
      string provider_kind
      string display_name
      string legal_name nullable
      string public_contact
      string operating_area
      string verification_status
      datetime verified_at nullable
      datetime recheck_at nullable
      datetime created_at
    }
    PROVIDER_MEMBERSHIPS {
      uuid id PK
      uuid provider_id FK
      uuid user_id FK
      string member_role
      string status
      datetime created_at
    }
    VERIFICATION_CASES {
      uuid id PK
      uuid provider_id FK
      uuid reviewer_user_id FK nullable
      string status
      json evidence_refs
      string evidence_summary_redacted
      string decision_reason nullable
      datetime decided_at nullable
      datetime recheck_at nullable
    }
    OPPORTUNITIES {
      uuid id PK
      uuid provider_id FK
      uuid created_by_user_id FK
      string opportunity_type
      string title
      text description
      string lga
      string community nullable
      string delivery_mode
      json eligibility
      json requirements
      numeric cost_amount nullable
      numeric pay_amount nullable
      string currency
      datetime opens_at nullable
      datetime deadline_at nullable
      string application_route
      string external_url nullable
      string status
      datetime approved_at nullable
      datetime updated_at
    }
    WORK_TERMS {
      uuid id PK
      uuid opportunity_id FK
      text task_scope
      numeric pay_amount nullable
      string payment_timing nullable
      datetime work_starts_at nullable
      datetime work_ends_at nullable
      string work_area
      string supervisor_contact_private
      json safety_requirements
      int minimum_age
    }
    LISTING_REVISIONS {
      uuid id PK
      uuid opportunity_id FK
      uuid actor_user_id FK
      int revision_number
      json snapshot
      string review_status
      datetime created_at
    }
    SAVED_OPPORTUNITIES {
      uuid user_id PK, FK
      uuid opportunity_id PK, FK
      datetime saved_at
      datetime synced_at nullable
    }
```

## 3. Applications, files, and outcomes

```mermaid
erDiagram
    USERS ||--o{ APPLICATIONS : submits
    OPPORTUNITIES ||--o| APPLICATION_FORMS : has
    APPLICATION_FORMS ||--o{ FORM_VERSIONS : versions
    APPLICATIONS ||--o{ APPLICATION_ANSWERS : contains
    FORM_VERSIONS ||--o{ APPLICATION_ANSWERS : defines
    APPLICATIONS ||--o{ APPLICATION_STATUS_EVENTS : history
    USERS ||--o{ APPLICATION_STATUS_EVENTS : actor
    APPLICATIONS ||--o{ FILE_ASSETS : attaches
    USERS ||--o{ FILE_ASSETS : owns
    APPLICATIONS ||--o{ OUTCOMES : may_report
    USERS ||--o{ OUTCOMES : reports

    APPLICATIONS {
      uuid id PK
      uuid applicant_user_id FK
      uuid opportunity_id FK
      string route
      string status
      string status_source
      string idempotency_key
      datetime submitted_at nullable
      datetime withdrawn_at nullable
      datetime created_at
    }
    APPLICATION_FORMS {
      uuid id PK
      uuid opportunity_id FK
      string status
      datetime created_at
    }
    FORM_VERSIONS {
      uuid id PK
      uuid form_id FK
      int version
      json schema
      datetime published_at nullable
    }
    APPLICATION_ANSWERS {
      uuid id PK
      uuid application_id FK
      uuid form_version_id FK
      string question_key
      json value
      string classification
      datetime created_at
    }
    APPLICATION_STATUS_EVENTS {
      uuid id PK
      uuid application_id FK
      uuid actor_user_id FK nullable
      string status
      string source
      text applicant_visible_note nullable
      datetime created_at
    }
    FILE_ASSETS {
      uuid id PK
      uuid owner_user_id FK
      uuid application_id FK nullable
      string private_storage_key
      string original_filename_encrypted
      string mime_type
      bigint size_bytes
      string checksum
      string scan_status
      datetime expires_at nullable
      datetime deleted_at nullable
      datetime created_at
    }
    OUTCOMES {
      uuid id PK
      uuid application_id FK
      uuid reporter_user_id FK nullable
      string outcome_type
      string source
      boolean consent_recorded
      datetime occurred_at nullable
      datetime confirmed_at nullable
    }
```

## 4. Support sessions, notifications, moderation, and audit

```mermaid
erDiagram
    PROVIDER_ENTITIES ||--o{ SUPPORT_SESSIONS : organizes
    USERS ||--o{ SUPPORT_SESSIONS : creates
    SUPPORT_SESSIONS ||--o{ SESSION_REGISTRATIONS : receives
    USERS ||--o{ SESSION_REGISTRATIONS : registers
    USERS ||--o{ NOTIFICATION_PREFERENCES : configures
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ REPORTS : submits
    REPORTS ||--o{ MODERATION_EVENTS : history
    USERS ||--o{ MODERATION_EVENTS : acts
    USERS ||--o{ AUDIT_EVENTS : performs

    SUPPORT_SESSIONS {
      uuid id PK
      uuid provider_id FK
      uuid organizer_user_id FK
      string topic
      datetime starts_at
      string mode
      string location_or_join_instructions_private
      int capacity
      string age_suitability
      json accessibility_notes
      string approval_status
    }
    SESSION_REGISTRATIONS {
      uuid id PK
      uuid session_id FK
      uuid applicant_user_id FK
      string status
      string attendance_status
      datetime registered_at
    }
    NOTIFICATION_PREFERENCES {
      uuid id PK
      uuid user_id FK
      string purpose
      string channel
      boolean enabled
      datetime updated_at
    }
    NOTIFICATIONS {
      uuid id PK
      uuid recipient_user_id FK
      string purpose
      string channel
      string template_version
      string delivery_status
      string provider_message_id nullable
      datetime scheduled_at nullable
      datetime sent_at nullable
    }
    REPORTS {
      uuid id PK
      uuid reporter_user_id FK nullable
      string target_type
      uuid target_id
      string category
      string priority
      string status
      datetime created_at
    }
    MODERATION_EVENTS {
      uuid id PK
      uuid report_id FK nullable
      uuid actor_user_id FK
      string action
      text reason
      datetime created_at
    }
    AUDIT_EVENTS {
      uuid id PK
      uuid actor_user_id FK nullable
      string action
      string target_type
      uuid target_id
      string request_id
      json redacted_metadata
      datetime created_at
    }
```

## 5. Relationship summary

- One user may have one applicant profile, many roles, saved listings, applications, reports, notifications, and audit/status events.
- A guardian link joins a minor account to a guardian account/contact and records scoped consent and revocation history. A minor may have more than one historical link, but only policy-approved active links are effective.
- A provider entity has many members, verification cases, opportunities, and support sessions.
- An opportunity has zero or one work-terms record and zero or one application form; each form may have multiple immutable versions.
- An applicant can submit at most one active application per opportunity unless product policy explicitly permits resubmission. Enforce the final rule with a database uniqueness strategy and service validation.
- Application answers reference the exact form version used at submission. Status and outcome history are separate.
- Files belong to a user and may be attached to a particular application. Access is always checked against current authorization and purpose.
- Reports can point to different target types. Because a standard SQL foreign key cannot target multiple tables, validate target existence in the service layer and retain moderation/audit history; consider separate nullable FKs if strong referential integrity is required for the final supported target set.

## 6. Recommended constraints and indexes

Finalize after actual query patterns and migrations are reviewed:

- Unique normalized email and phone when present; at least one verified channel for accounts that require login.
- Unique `(provider_id, user_id)` membership; index provider membership by `(user_id, status)` for authorization lookups.
- Index opportunities by status/deadline, provider/status, type/status, and location/type/status as supported by search. Use partial indexes for active listings only when query plans justify them.
- Index applications by `(applicant_user_id, created_at)`, `(opportunity_id, status)`, and provider scope through opportunity/provider joins.
- Unique `(applicant_user_id, opportunity_id)` where resubmission is prohibited; unique idempotency key in its defined scope.
- Unique `(user_id, opportunity_id)` saved opportunity; unique `(session_id, applicant_user_id)` session registration.
- Index audit/status history by target and timestamp; retain append-only semantics for privileged actions.
- Check positive capacities and file sizes; enforce valid deadline ordering, age thresholds, and money precision with appropriate types/constraints.
- Avoid storing unnecessary DOB, guardian evidence, documents, and raw prompts. Encrypt high-risk contact fields where justified and separate keys from database backups.

## 7. Privacy and retention mapping

Before schema freeze, each field needs a recorded purpose, access role, lawful basis, retention period, and deletion/anonymization behavior. In particular:

- Keep DOB optional/minimized if an approved age-band process suffices. Providers see eligibility result, not DOB.
- Guardian contact and consent artifacts are highly restricted and encrypted; do not request government ID by default.
- Listing verification evidence should be references to private file objects plus minimized reviewer notes; not publicly accessible.
- Application answers/files are disclosed only to the provider chosen by the applicant and retained under the approved policy.
- Audit metadata must be useful without copying request bodies or sensitive values.
- Notification delivery logs retain channel and delivery status; avoid storing unnecessary message body or personal data.
- AI usage events keep model/feature/version, latency, listing IDs, and safety result; never store raw applicant prompt data.

## 8. Implementation questions

1. Confirm whether applications can be resubmitted after withdrawal/rejection and the uniqueness rule for each route.
2. Confirm whether one applicant can link multiple guardians and how guardians authenticate/manage links.
3. Define which listing fields are searchable/filterable and whether full-text search requires PostgreSQL search or a separate service later.
4. Confirm storage provider, file limits, scanning provider, retention/deletion periods, and evidence categories.
5. Confirm report target types, anonymous report policy, and exact moderation audit retention.

