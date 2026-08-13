# qa-serverless

Serverless platform testing: AWS SAM Local (with .NET Lambda test tools in
its references), Azure Functions Core Tools + Azurite, Cloudflare Workers
Miniflare, a combined cold-start + timeout budget reference, and a
serverless integration-test builder. Covers Lambda / Workers / Edge
runtimes which have specific testing patterns (cold-start budgets, timeout
testing, local emulators, edge-runtime divergence) absent from generic
web-server test plugins.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [aws-sam-local-testing](skills/aws-sam-local-testing/SKILL.md) | AWS SAM Local CLI: `sam local invoke` / `start-api` for Lambda; .NET handler-direct testing in references/dotnet.md. |
| Skill | [cloudflare-workers-miniflare](skills/cloudflare-workers-miniflare/SKILL.md) | Miniflare 3 + Wrangler dev for testing Cloudflare Workers locally. |
| Skill | [azure-functions-tests](skills/azure-functions-tests/SKILL.md) | Test Azure Functions locally: Core Tools func start, Azurite, isolated worker, triggers/bindings. |
| Skill | [cold-start-budget-reference](skills/cold-start-budget-reference/SKILL.md) | Pure reference: cold-start budgets across serverless runtimes; Lambda timeout + billing budgets in references/timeout-budgets.md. |
| Skill | [serverless-integration-test-builder](skills/serverless-integration-test-builder/SKILL.md) | Build-an-X integration suite from a SAM / serverless.yml / Wrangler definition. |
| Agent | [serverless-cold-start-critic](agents/serverless-cold-start-critic.md) | Adversarial critic: detects cold-start anti-patterns (client init inside handler, heavy top-level imports, missing /tmp cache, missing SnapStart on JVM, oversized bundles) and emits BLOCK or PASS. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-serverless@testland-qa
```
