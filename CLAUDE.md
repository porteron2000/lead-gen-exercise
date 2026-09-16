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
   a. Delegate to the `icp-research-agent` subagent to produce
      `output/<id>-profile.md` for that lead.
   b. Delegate to the `email-draft-agent` subagent to produce
      `output/<id>-email.md` for that lead, using the profile from step (a).
3. After all `"new"` leads have been processed, print a short summary
   mapping each processed lead's `id` to its email subject line, e.g.:

   ```
   lead-001 -> "Cutting truck-rolls with predictive network diagnostics"
   lead-002 -> "A faster path through your digital transformation roadmap"
   ```

Do not modify `leads.json` or change lead `status` values as part of this
flow.
