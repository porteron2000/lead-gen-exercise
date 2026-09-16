# Lead Nurture Flow — Orchestrator Instructions

This repo is a sandboxed, educational Claude Code exercise for practicing a
small multi-agent pipeline. `leads.json` contains fictional leads at
fictional telecom/CSP companies — there is no real company or personal data
here.

## "Process the leads"

When asked to **process the leads**, do the following:

1. Read `leads.json`.
2. For each lead whose `status` is `"new"`, process it **one lead at a
   time, in sequence** (do not parallelize across leads):
   a. Delegate to the `lead-scoring-agent` subagent to produce
      `output/<id>-score.md` for that lead.
   b. If the score result is **DOES NOT PASS**, skip the rest of the steps
      for this lead — do not research or draft an email for it.
   c. If the score result is **PASS**, delegate to the `icp-research-agent`
      subagent to produce `output/<id>-profile.md` for that lead.
   d. Delegate to the `email-draft-agent` subagent to produce
      `output/<id>-email.md` for that lead, using the profile from step (c).
3. After all `"new"` leads have been processed, print a short summary line
   per lead:
   - Passed leads: `id`, score, and email subject line.
   - Skipped leads: `id`, score, and "skipped (below threshold)".

   Example:

   ```
   lead-001 -> 8/10 -> "Cutting truck-rolls with predictive network diagnostics"
   lead-002 -> 7/10 -> "A faster path through your digital transformation roadmap"
   lead-004 -> 3/10 -> skipped (below threshold)
   ```

Do not modify `leads.json` or change lead `status` values as part of this
flow.
