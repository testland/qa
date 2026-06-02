# qa-serverless

Serverless platform testing: AWS SAM Local, .NET Lambda Test Tools, Cloudflare Workers Miniflare, Vercel Edge Runtime, Netlify Functions, Serverless Framework, plus cold-start + timeout budget references and a serverless integration-test builder. Covers Lambda / Workers / Edge runtimes which have specific testing patterns (cold-start budgets, timeout testing, local emulators, edge-runtime divergence) absent from generic web-server test plugins.

## Components

| Type | Name | Description |
| --- | --- | --- |
| (filled in as components are added) |  |  |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-serverless@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
