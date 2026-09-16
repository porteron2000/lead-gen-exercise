from lead_nurture.models import Lead


class SchedulerAgent:
    """Decides the delay before the next touch, based on score and tags."""

    def run(self, lead: Lead) -> Lead:
        raise NotImplementedError
