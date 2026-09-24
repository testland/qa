# Eval mandate - helpdesk assistant

From: D. Achebe (Eng Manager), 2026-09-08

We are flying blind on assistant quality. Four metrics over a 200-row slice is
not a quality program. Effective Friday:

1. **Every metric the library ships runs on every pull request.** The catalog
   lists thirty-four across all families. If the library authors shipped it,
   somebody thought it was worth computing. I do not want a curated subset
   chosen by whoever wired the job up in March.
2. **The full golden set on every run.** 3,140 rows. Sampling 200 is how a
   regression slips through in the 2,940 we did not look at.
3. **Turn on the multimodal metrics.** Screenshot upload is on the roadmap for
   Q1 and I would rather the gate already covered it than scramble later.
4. **Turn on the SQL metrics too.** There has been talk of letting the
   assistant answer "how many seats did we buy last year" out of the warehouse.
   Same argument as 3.
5. **Gate the house rule.** The assistant must never name a rival product and
   must never promise a discount; it hands to a human. Marisol has written the
   check and it is on a branch. It adds nothing to the bill because it does not
   call a model at all. Merge it or tell me what is wrong with it.
6. **Drop faithfulness.** The trend sheet says it has not failed once in six
   months. If it cannot fail it is not a gate, it is decoration, and I would
   rather spend that judge budget on something that moves.
