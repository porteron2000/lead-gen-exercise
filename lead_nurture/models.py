from dataclasses import dataclass, field


@dataclass
class Lead:
    name: str
    email: str
    company: str
    role: str
    source: str
    notes: str = ""

    score: int | None = None
    tags: list[str] = field(default_factory=list)
    draft_email: str | None = None
    next_touch_days: int | None = None
