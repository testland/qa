# French release 2026-08-28 - escaped l10n defects

| # | Report                                                              | Surface |
|---|---------------------------------------------------------------------|---------|
| 1 | "Enregistrer le brouillon" arrives as "Enregistrer l..."              | toolbar |
| 2 | "Annuler les modifications" arrives as "Annuler les mod..."           | toolbar |
| 3 | Trial banner is cut off mid-word for French accounts                  | banner  |
| 4 | One toolbar control is not translated at all in the French build      | toolbar |

Job history: `test/smoke.test.js` merged 2026-07-16, 42 runs, 42 green, 0
failures. Green on the release commit `9c1f4ab`.

QA walkthrough, staging, 2026-08-21, accented locale chosen in the environment
switcher:

> Walked the editor toolbar and the trial banner end to end. Nothing clipped,
> nothing overlapping, no boxes or garbled characters anywhere on the page.
> Signed off.

The French strings came back from the vendor on 2026-08-19 and were spot-checked
by a native speaker; the translations are fine, it is the console that is not.

Support ticket volume for the four reports: 61 in the first 24 hours, all from
the French cohort, which is 3% of accounts.
