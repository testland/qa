# Session-sheet review checklist

Deep reference for `exploratory-testing` SKILL.md. The lead's (or a peer's)
review pass over a completed SBTM session sheet, run before the sheet is
filed - the reviewer half of the debrief loop that
[debrief.md](debrief.md) starts.

## The review pass

1. **Locate the sheet.** Review the filed debrief file or the inline
   text. Refuse to review if no session sheet is present.

2. **Check each PROOF field.** Per Jonathan and James Bach's SBTM framework
   ([satisfice.com/download/session-based-test-management](https://www.satisfice.com/download/session-based-test-management)),
   rate each as **Complete**, **Thin**, or **Missing**. Minimum bar:
   Past names areas + tours; Results has bug IDs or confirmed-working
   items; Obstacles names blockers or states "none"; Outlook lists
   uncovered areas and one next charter; Feelings states product-confidence
   level (confident / mixed / uneasy) - not a number.

3. **Flag thin Feelings specifically.** Feelings is the load-bearing
   field ([debrief.md](debrief.md)). A single word or numeric rating is
   Thin. Coach: rewrite to state product-confidence level (confident /
   mixed / uneasy) and attention quality.

4. **Evaluate the TBS split.** Healthy thresholds
   ([session-sheet-and-metrics.md](session-sheet-and-metrics.md), same
   SBTM source above): T 60-80%, B 10-20%, S 10-15%.
   - **S > 30%:** environment problem; recommend pre-seeding test data
     and verifying the environment before the next session.
   - **T < 50%:** charter too broad, or environment collapsed; split
     the charter or fix the environment before the next session.
   - If bucket percentages are absent: flag as a missing metric.

5. **Recommend the next charter.** From the Outlook's uncovered areas,
   synthesize one charter in `Explore X with Y to discover Z` form
   ([charter-template.md](charter-template.md)). If Outlook is empty,
   derive from Results surprises or Obstacles blockers.

## Review output format

Sections in order:

1. **PROOF completeness** - one table row per field (Field / Status /
   Coaching note).
2. **TBS health** - one line per bucket with [OK / WARNING] label.
3. **Recommended next charter** - `Explore X with Y to discover Z`.
4. **Verdict** - `READY TO FILE` or `REVISE FIRST` with one-sentence
   priority fix.

## Hard rules

- No Charter field present: not a valid SBTM session sheet - do not review.
- Feelings section absent (not just thin): the sheet cannot be marked
  **READY TO FILE** per the PROOF contract.
- Results section empty: no next-charter recommendation can be derived.

## References

- Bach J. + Bach J., *Session-Based Test Management* (HP, 2000) -
  [satisfice.com/download/session-based-test-management](https://www.satisfice.com/download/session-based-test-management) -
  PROOF structure and TBS thresholds.
- Bach J., *Test Session Debrief Checklist* (Satisfice, 2021) -
  [satisfice.com/download/sbtm-session-report-checklist](https://www.satisfice.com/download/sbtm-session-report-checklist) -
  the lead-side questions this checklist condenses.
- [debrief.md](debrief.md) - the debrief template this checklist reviews.
- [session-sheet-and-metrics.md](session-sheet-and-metrics.md) - SBTM
  vocabulary: session, charter, TBS, dashboard metrics.
