$ git log --oneline --graph --decorate main...HEAD

*   9b41c07 (HEAD -> feat/button-radius) Merge branch 'feat/email-header-refresh'
|\
| * 41ea88d refresh transactional email header padding and dark variant
| * 2c70d19 move email header markup into a partial
* | e0a9d61 chore(visual): baselines from job 8841
* | 77bc3f2 tokens: button radius 4px -> 8px
|/
* 6d52aa1 (main) ci: add firefox and webkit projects to the visual job
* 1f0ee54 (main) deps: playwright 1.47.2 -> 1.48.0
* a03ccb4 (main) fix(cart): keep promo row height stable when coupon rejected

$ git log --oneline -1 --date=short --format='%h %ad %s' 6d52aa1
6d52aa1 2026-09-02 ci: add firefox and webkit projects to the visual job
