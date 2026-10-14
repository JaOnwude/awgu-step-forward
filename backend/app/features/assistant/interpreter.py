"""Turn a plain-language request into ordinary directory filters.

This is the week-1 assistant engine (DECISIONS D6): deterministic keyword
rules, no external model. It only ever produces filters for the normal
search, so it cannot invent listings, judge eligibility or rank people
(spec R46). A model-backed interpreter can replace it behind the same
`interpret()` signature after a data-processing review.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

MODEL_NAME = "rule-based-interpreter-v1"

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
# Phone numbers and long ID-like numbers (e.g. 11-digit NIN/BVN).
_LONG_NUMBER = re.compile(r"\+?\d[\d\s-]{6,}\d")


def redact(text: str) -> tuple[str, bool]:
    """Remove contact and identity details before any processing (R48)."""
    cleaned = _EMAIL.sub("[removed]", text)
    cleaned = _LONG_NUMBER.sub("[removed]", cleaned)
    return cleaned, cleaned != text


_CATEGORY_WORDS: list[tuple[str, tuple[str, ...]]] = [
    (
        "local_work",
        (
            "day work",
            "daily work",
            "labour",
            "labor",
            "construction",
            "building site",
            "paid work",
            "gig",
            "casual work",
        ),
    ),
    ("apprenticeship", ("apprentice", "learn a trade", "trade")),
    ("scholarship", ("scholarship", "bursary", "tuition", "school fees", "grant")),
    ("training", ("training", "course", "class", "skills", "learn", "computer")),
    ("employment", ("job", "vacancy", "employment", "shop assistant", "salary")),
    ("contract", ("contract",)),
]

_CATEGORY_LABELS = {
    "local_work": "Local paid work",
    "apprenticeship": "Apprenticeships",
    "scholarship": "Scholarships",
    "training": "Training",
    "employment": "Jobs",
    "contract": "Contracts",
}

#: Towns and LGAs in Enugu State, Awgu LGA communities first.
_PLACES = (
    "Awgu",
    "Mgbowo",
    "Nenwe",
    "Ihe",
    "Owelli",
    "Mmaku",
    "Ugbo",
    "Obeagu",
    "Ituku",
    "Agbudu",
    "Ogugu",
    "Agbogugu",
    "Amoli",
    "Enugu",
    "Nsukka",
    "Udi",
    "Oji River",
    "Aninri",
    "Ezeagu",
    "Nkanu",
    "Agbani",
    "Isi-Uzo",
    "Udenu",
    "Igbo-Etiti",
)

_DELIVERY = [
    ("remote", ("online", "remote", "from home", "virtual")),
    ("onsite", ("in person", "on site", "onsite", "near me")),
]

_DELIVERY_LABELS = {"remote": "Online", "onsite": "In person"}

_STOPWORDS = {
    "i",
    "im",
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "in",
    "on",
    "at",
    "to",
    "of",
    "with",
    "me",
    "my",
    "want",
    "need",
    "looking",
    "find",
    "show",
    "any",
    "some",
    "something",
    "near",
    "around",
    "please",
    "help",
    "can",
    "get",
    "that",
    "this",
    "is",
    "are",
    "be",
    "who",
    "what",
    "where",
    "which",
    "free",
    "paid",
    "work",
    "opportunity",
    "opportunities",
    "removed",
    "state",
    "lga",
    "close",
    "closer",
    "home",
    "young",
    "people",
    "person",
}


@dataclass
class Interpretation:
    category: str | None = None
    location: str | None = None
    delivery_mode: str | None = None
    q: str | None = None
    explanation: list[str] = field(default_factory=list)

    def filters(self) -> dict[str, str]:
        return {
            key: value
            for key, value in {
                "category": self.category,
                "location": self.location,
                "delivery_mode": self.delivery_mode,
                "q": self.q,
            }.items()
            if value
        }


def interpret(text: str) -> Interpretation:
    lowered = f" {text.lower()} "
    result = Interpretation()
    used: list[str] = []

    for category, words in _CATEGORY_WORDS:
        hit = next((w for w in words if re.search(rf"\b{re.escape(w)}", lowered)), None)
        if hit:
            result.category = category
            result.explanation.append(
                f"Category “{_CATEGORY_LABELS[category]}” — you wrote “{hit}”."
            )
            used.extend(hit.split())
            break

    for place in _PLACES:
        if re.search(rf"\b{re.escape(place.lower())}\b", lowered):
            result.location = place
            result.explanation.append(f"Location “{place}”.")
            used.extend(place.lower().split())
            break

    for mode, words in _DELIVERY:
        hit = next((w for w in words if w in lowered), None)
        if hit:
            result.delivery_mode = mode
            result.explanation.append(
                f"Delivery “{_DELIVERY_LABELS[mode]}” — you wrote “{hit}”."
            )
            used.extend(hit.split())
            break

    leftovers = [
        word
        for word in re.findall(r"[a-z]+", lowered)
        if len(word) >= 4 and word not in _STOPWORDS and word not in used
    ]
    if leftovers:
        result.q = leftovers[0]
        result.explanation.append(f"Keyword “{result.q}”.")

    return result
