"""Default in-platform application form.

Week-1 scope ships a single platform-defined form (provider-authored question
schemas are deferred). Field types are limited to the safe set allowed by
spec R24.
"""

from __future__ import annotations

FORM_VERSION = "v1"

FIELD_TYPES = (
    "short_text",
    "long_text",
    "single_select",
    "multi_select",
    "yes_no",
    "date",
)

FORM_QUESTIONS: tuple[dict, ...] = (
    {
        "key": "why_interested",
        "label": "Why are you interested in this opportunity?",
        "type": "long_text",
        "required": True,
    },
    {
        "key": "relevant_experience",
        "label": "Relevant experience or skills (optional)",
        "type": "long_text",
        "required": False,
    },
    {
        "key": "availability",
        "label": "When are you available to start?",
        "type": "short_text",
        "required": True,
    },
    {
        # The web form answers this with its consent checkbox (apply-flow.tsx)
        # instead of showing it as a separate question.
        "key": "confirm_accuracy",
        "label": "I confirm the information I provide is accurate.",
        "type": "yes_no",
        "required": True,
    },
)

REQUIRED_KEYS = tuple(q["key"] for q in FORM_QUESTIONS if q["required"])
KNOWN_KEYS = tuple(q["key"] for q in FORM_QUESTIONS)
