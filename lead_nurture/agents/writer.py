from lead_nurture.models import Lead


class WriterAgent:
    """Drafts a personalized nurture email for a qualified lead."""

    def run(self, lead: Lead) -> Lead:
        raise NotImplementedError
