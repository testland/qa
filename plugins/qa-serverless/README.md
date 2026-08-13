# qa-serverless

Serverless platform testing: AWS SAM Local, .NET Lambda Test Tools, Cloudflare Workers Miniflare, Vercel Edge Runtime, Netlify Functions, Serverless Framework, plus cold-start + timeout budget references and a serverless integration-test builder. Covers Lambda / Workers / Edge runtimes which have specific testing patterns (cold-start budgets, timeout testing, local emulators, edge-runtime divergence) absent from generic web-server test plugins.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [aws-sam-local-testing](skills/aws-sam-local-testing/SKILL.md) | AWS SAM Local CLI: `sam local invoke` / `start-api` for Lambda. |
| Skill | [cloudflare-workers-miniflare](skills/cloudflare-workers-miniflare/SKILL.md) | Miniflare 3 + Wrangler dev for testing Cloudflare Workers locally. |
| Skill | [lambda-test-tools-net](skills/lambda-test-tools-net/SKILL.md) | `Amazon.Lambda.TestTool` for invoking .NET Lambda handlers locally. |
| Skill | [cold-start-budget-reference](skills/cold-start-budget-reference/SKILL.md) | Pure reference: cold-start budgets across serverless runtimes. |
| Skill | [lambda-timeout-budget-reference](skills/lambda-timeout-budget-reference/SKILL.md) | Pure reference: AWS Lambda timeout and billing semantics. |
| Skill | [serverless-integration-test-builder](skills/serverless-integration-test-builder/SKILL.md) | Build-an-X integration suite from a SAM / serverless.yml / Wrangler definition. |
| Agent | [serverless-cold-start-critic](agents/serverless-cold-start-critic.md) | Adversarial critic: detects cold-start anti-patterns (client init inside handler, heavy top-level imports, missing /tmp cache, missing SnapStart on JVM, oversized bundles) and emits BLOCK or PASS. |
| Skill | [azure-functions-tests](skills/azure-functions-tests/SKILL.md) | Test Azure Functions locally: Core Tools func start, Azurite, isolated worker, triggers/bindings. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-serverless@testland-qa
```
