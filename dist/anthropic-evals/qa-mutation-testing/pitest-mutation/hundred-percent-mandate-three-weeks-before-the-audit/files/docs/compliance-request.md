From: Ola Brandt (Compliance)
To: Platform engineering
Date: 2026-09-11
Subject: Quality gates — actions from the July incident (INC-2291)

Actions agreed at the post-incident review, to be in place before the ISO
surveillance audit on 2026-10-05:

1. Mutation threshold set to 100 on every module. A gate below 100 is a gate
   that permits untested code to merge, which is precisely what happened in
   INC-2291.

2. Mutation operators set to the complete catalogue. The default set is by
   definition a subset, and the auditor's finding last cycle was that we
   self-selected our own coverage criteria.

3. The pricing module's gate raised from its current value, which predates the
   incident and is visibly below what the module already achieves.

4. Section 4.2 of the pack needs one product-level figure, not four. The auditor
   will not read a table. Draft wording below — please confirm and I will lock
   the section:

   "Across its four production modules, acme-core achieved a mutation coverage
   of 66% for the quarter ending September 2026 (pricing 81%, checkout 78%,
   legacy-import 37%, notify-api 68%)."

Please confirm all four by Wednesday 2026-09-16 so I can close the actions.
