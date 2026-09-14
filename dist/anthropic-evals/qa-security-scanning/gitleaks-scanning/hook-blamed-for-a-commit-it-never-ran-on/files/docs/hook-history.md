# `git log -p --follow -- .pre-commit-config.yaml`

```
commit 71ea0c4  2026-07-22  m.oyelaran
    pre-commit: stop the hook tripping over generated docs and env samples

@@
       - id: gitleaks
+        exclude: '(^docs/generated/|^vendor/|\.sample$|\.example$)'

commit 3c8a19d  2026-07-14  s.brand
    chore: roll the secret hook out org-wide
```

Two commits. Nothing has touched the hook config since July.
