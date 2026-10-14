# Awgu StepForward project docs

**Status:** Implementation handoff draft  
**Updated:** 2026-10-14

This folder contains the technical and requirements documents for the Awgu StepForward build. For Claude Project knowledge, add the files in this folder **and** the companion files `../spec.md`, `../frontend-spec.md`, and `../ui-generation-prompt.md`. Then use [the Claude project starter prompt](AGENT_STARTER_PROMPT.md) as the first project message.

## Document map

| Document | Purpose | Authority |
|---|---|---|
| [SRS](SRS.md) | User roles, product scope, functional and quality requirements, acceptance conditions | Product behavior summary; defer to `../spec.md` for full requirements |
| [TRD](TRD.md) | System architecture, implementation stack, deployment topology, security, scaling, operations | Technical baseline; record material changes as decisions |
| [ERD](ERD.md) | Conceptual relational data model, key fields, relationships, constraints, and privacy notes | Starting model; migration/schema implementation must be reviewed against product rules |
| [API contract guide](API-CONTRACT.md) | API conventions and endpoint families for frontend/backend coordination | FastAPI OpenAPI schema is the executable contract once generated |
| [Decisions](DECISIONS.md) | Week-1 defaults, deviations from the specs, and owner decisions | Records how conflicts were resolved; does not override `../spec.md` |

## Source-of-truth order

1. `../spec.md` — primary product specification and decisions.
2. `../frontend-spec.md` — frontend architecture, route inventory, and UI behavior.
3. Documents in this folder — engineering handoff detail consistent with the first two.
4. `../ui-generation-prompt.md` — visual direction and Figma prompt pack.

If documents conflict, do not silently choose. Follow the higher-ranked document and record the discrepancy in an ADR or implementation note. Keep the documents updated when product decisions or code change.

## Current deployment baseline

- Web/PWA: Vercel.
- FastAPI API and background worker process: Render.
- PostgreSQL: Neon.
- Object storage, SMS, email, and AI vendors: adapters; select and configure during deployment/security review.

The deployment baseline is user-selected. It is not a promise of any specific capacity or availability; benchmark the actual deployed plan and configuration.

## Suggested additional project files

Create these as the implementation becomes real, rather than filling them with hypothetical values now:

- `../AGENTS.md` or `../CLAUDE.md`: short repository-specific agent rules.
- `../.env.example`: names and safe local defaults only; never secrets.
- `../docs/decisions/`: accepted architecture/product decision records.
- `../docs/runbooks/`: deployment, backup/restore, incident, and provider-verification procedures.
- FastAPI-generated OpenAPI JSON and typed frontend API client.

