# Lead Nurture Flow — Orchestrator Instructions

This repo is a sandboxed, educational Claude Code exercise for practicing a
small multi-agent pipeline. `leads.xlsx` contains fictional leads at
fictional telecom/CSP companies — there is no real company or personal data
here.

## Data source

`leads.xlsx` is the **source of truth** for leads. `leads.json` is a
**generated intermediate file**, not tracked in git — regenerate it from
`leads.xlsx` at the start of every run rather than hand-editing it or
trusting a stale copy. Columns in `leads.xlsx` (sheet "Leads"): `id`,
`name`, `title`, `company`, `company_size`, `email`, `status`.

## "Process the leads"

When asked to **process the leads**, do the following:

1. Convert `leads.xlsx` to `leads.json`: read the "Leads" sheet and write
   its rows as a JSON array of objects with the same field names, in the
   same row order. Do this yourself (main context) — the subagents below
   only have Read/Write and cannot parse `.xlsx`.
2. For each lead whose `status` is `"new"`, process it **one lead at a
   time, in sequence** (do not parallelize across leads):
   a. Delegate to the `lead-scoring-agent` subagent to produce
      `output/<id>-score.md` for that lead.
   b. If the score result is **DOES NOT PASS**, skip the rest of the steps
      for this lead — do not research or draft an email for it.
   c. If the score result is **PASS**, delegate to the `icp-research-agent`
      subagent to produce `output/<id>-profile.md` for that lead.
   d. Delegate to the `email-draft-agent` subagent to produce
      `output/<id>-email.eml` for that lead — a real .eml file (From/To/
      Subject headers + body), openable directly in Outlook — using the
      profile from step (c).
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

Do not modify `leads.xlsx` or `leads.json`, or change lead `status`
values, as part of this flow.
