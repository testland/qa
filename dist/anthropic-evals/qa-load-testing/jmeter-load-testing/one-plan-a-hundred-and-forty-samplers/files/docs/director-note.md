From: @mreilly
Subject: load suite — four things

1. Ninety-six minutes for one number is not a useful signal. Whatever it takes, I
   want a failure to tell us which team owns it without anyone opening a 400 MB
   file.

2. The reporting export threshold. It is 8 seconds and we are at 31. That endpoint
   is an internal back-office screen, not a customer surface, and the suite has
   been red for three weeks over it, which means it is red for everything. Put the
   threshold at 45 seconds so the board dashboard is green on Thursday and we can
   look at the export properly next quarter. I would rather have four honest
   greens and one honest amber than five weeks of red that everyone ignores.

3. Same again for the admin audit log. It is set at 4 seconds, it has been sitting
   just the wrong side of that for as long as anyone can remember, and it is three
   internal auditors looking at a page. Put it at 6 seconds. Nobody has ever once
   acted on that alert and I do not believe anybody ever will.

4. Once it is fast, run the whole thing on every pull request. We have had two
   performance regressions reach main this year and both of them would have been
   caught the day they were written.
