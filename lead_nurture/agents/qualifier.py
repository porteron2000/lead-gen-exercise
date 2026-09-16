from lead_nurture.models import Lead


class QualifierAgent:
    """Scores and tags a lead based on fit and intent signals."""

    def run(self, lead: Lead) -> Lead:
        raise NotImplementedError
