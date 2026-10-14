from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.features.opportunities.models import Opportunity, WorkTerms
from app.features.opportunities.service import effective_min_age, requires_adult

CSRF = "X-CSRF-Token"

PROVIDER_PAYLOAD = {
    "name": "Awgu Builders Co-op",
    "provider_type": "sme",
    "public_contact": "jobs@awgubuilders.test",
    "operating_area": "Awgu LGA",
}

WORK_TERMS = {
    "task_scope": "Carry blocks and mix mortar for a market stall.",
    "pay_rate": "NGN 6,000 per day",
    "payment_timing": "Daily, end of shift",
    "hours_expected": "8am - 4pm",
    "work_dates": "Mon - Fri, two weeks",
    "worksite": "Awgu main market",
    "supervisor_contact": "Site foreman via provider contact",
    "safety_ppe": "Hard hat, gloves and boots provided.",
    "hazards_reviewed": True,
    "adult_only_construction": True,
}


def _listing(**overrides) -> dict:
    payload = {
        "opportunity_type": "local_work",
        "title": "Market stall construction - day work",
        "description": "Paid day work building market stalls in Awgu.",
        "location": "Awgu",
        "application_route": "platform",
        "deadline_at": (datetime.now(UTC) + timedelta(days=20)).isoformat(),
    }
    payload.update(overrides)
    return payload


async def _login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def _verified_provider(client, admin_email: str) -> str:
    """Create and verify a provider; return the provider member's CSRF token."""
    csrf = await _login(client, "builder@test.local")
    org = await client.post(
        "/api/v1/providers", headers={CSRF: csrf}, json=PROVIDER_PAYLOAD
    )
    assert org.status_code == 201, org.text

    admin_csrf = await _login(client, admin_email)
    verdict = await client.post(
        f"/api/v1/admin/moderation/providers/{org.json()['id']}/verification",
        headers={CSRF: admin_csrf},
        json={"decision": "approve", "rationale": "Identity and contact checked."},
    )
    assert verdict.status_code == 200, verdict.text
    return await _login(client, "builder@test.local")


def test_work_types_and_construction_require_adults():
    assert requires_adult(Opportunity(opportunity_type="local_work"))
    assert requires_adult(Opportunity(opportunity_type="contract"))
    assert not requires_adult(Opportunity(opportunity_type="training"))

    construction = Opportunity(opportunity_type="training", min_age=16)
    construction.work_terms = WorkTerms(adult_only_construction=True)
    assert requires_adult(construction)
    # Even a stale under-18 min_age is lifted to 18 at apply time.
    assert effective_min_age(construction) == 18
    assert effective_min_age(Opportunity(opportunity_type="training")) is None


async def test_local_work_defaults_to_adults_and_returns_work_terms(
    client, seeded_admin
):
    csrf = await _verified_provider(client, seeded_admin)
    created = await client.post(
        "/api/v1/opportunities",
        headers={CSRF: csrf},
        json=_listing(work_terms=WORK_TERMS),
    )
    assert created.status_code == 201, created.text
    assert created.json()["min_age"] == 18

    detail = await client.get(f"/api/v1/opportunities/{created.json()['id']}")
    assert detail.status_code == 200, detail.text
    terms = detail.json()["work_terms"]
    assert terms["safety_ppe"] == WORK_TERMS["safety_ppe"]
    assert terms["adult_only_construction"] is True


async def test_work_listing_cannot_target_under_18(client, seeded_admin):
    csrf = await _verified_provider(client, seeded_admin)
    response = await client.post(
        "/api/v1/opportunities",
        headers={CSRF: csrf},
        json=_listing(min_age=16),
    )
    assert response.status_code == 422, response.text


async def test_construction_terms_cannot_target_under_18(client, seeded_admin):
    csrf = await _verified_provider(client, seeded_admin)
    response = await client.post(
        "/api/v1/opportunities",
        headers={CSRF: csrf},
        json=_listing(opportunity_type="training", min_age=16, work_terms=WORK_TERMS),
    )
    assert response.status_code == 422, response.text


async def test_switching_approved_listing_to_work_returns_it_to_review(
    client, seeded_admin
):
    csrf = await _verified_provider(client, seeded_admin)
    created = await client.post(
        "/api/v1/opportunities",
        headers={CSRF: csrf},
        json=_listing(opportunity_type="training"),
    )
    assert created.status_code == 201, created.text
    opp_id = created.json()["id"]
    assert created.json()["min_age"] is None

    submitted = await client.post(
        f"/api/v1/opportunities/{opp_id}/submit", headers={CSRF: csrf}
    )
    assert submitted.status_code == 200, submitted.text
    admin_csrf = await _login(client, seeded_admin)
    approved = await client.post(
        f"/api/v1/admin/moderation/listings/{opp_id}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert approved.status_code == 200, approved.text

    csrf = await _login(client, "builder@test.local")
    updated = await client.patch(
        f"/api/v1/opportunities/{opp_id}",
        headers={CSRF: csrf},
        json={"opportunity_type": "local_work", "work_terms": WORK_TERMS},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["min_age"] == 18
    assert updated.json()["status"] == "pending_review"

    # The provider can still see its own pending listing with the new terms.
    detail = await client.get(f"/api/v1/opportunities/{opp_id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["work_terms"]["worksite"] == WORK_TERMS["worksite"]
