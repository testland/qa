---
name: azure-functions-tests
description: "Runs Azure Functions locally using Azure Functions Core Tools v4 (`func start`), Azurite storage emulation, and framework-native unit tests for handler code (.NET isolated worker model, Node.js v4, Python v2). Covers HTTP, queue, and timer trigger testing, admin-endpoint invocation for non-HTTP triggers, and binding verification via local.settings.json. Use when testing Azure Functions before deployment, reproducing trigger behaviour without live Azure services, or gating function handler logic in CI."
metadata:
  keywords: "azure-functions, func-start, azurite, isolated-worker, http-trigger, queue-trigger, timer-trigger, serverless, local-testing"
---

# azure-functions-tests

## Overview

Azure Functions Core Tools v4 (`func.exe`) provides a local runtime that
mirrors the Functions host on Azure. Per
[learn.microsoft.com/azure/azure-functions/functions-run-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local),
`func start` starts all triggers in the project directory and outputs the
URL of every HTTP-triggered function. Azurite emulates Blob, Queue, and
Table Storage locally so queue and timer triggers can be exercised without
a live storage account.

Nearest neighbours and how this skill differs:

- `aws-sam-local-testing` wraps SAM Local for Lambda/API Gateway
  (its references/dotnet.md covers the .NET Lambda test runner). This
  skill is Azure-only and covers `func start`, Azurite, the .NET
  isolated worker model (`Microsoft.Azure.Functions.Worker`), and
  admin-endpoint invocation.
- `serverless-integration-test-builder` builds multi-function integration
  harnesses. This skill covers the per-function local invocation workflow.

## When to use

- Local unit + integration tests for Azure Function handlers before deploy.
- Reproducing HTTP, queue, or timer trigger behaviour without deploying.
- CI gating on function handler logic in .NET, Node.js, or Python.
- Verifying binding configuration with Azurite instead of live Azure Storage.

## How to use

1. Install Core Tools v4 (`func --version` shows 4.x) and Azurite, then
   scaffold with `func init` and add triggers with `func new` - commands in
   [references/local-setup.md](references/local-setup.md).
2. Set `AzureWebJobsStorage` to `UseDevelopmentStorage=true` in
   `local.settings.json` so queue and timer triggers route to Azurite; keep
   the file git-ignored.
3. Start Azurite, then run `func start` from the project root and note the
   printed HTTP trigger URLs.
4. Exercise HTTP triggers with `curl`; fire non-HTTP (queue/timer) triggers
   through the `/admin/functions/<name>` endpoint - see
   [references/triggering-functions.md](references/triggering-functions.md).
5. Unit-test handler logic directly (no running host) with the per-language
   patterns in [references/unit-testing-handlers.md](references/unit-testing-handlers.md).
6. Wire Core Tools + Azurite + `dotnet test` / `pytest` / `npm test` into CI
   using the workflow in [references/triggering-functions.md](references/triggering-functions.md).
7. Confirm binding config against Azurite; verify Managed Identity / RBAC in a
   staging environment (see Limitations).

## Reference files

- Install, project init, `local.settings.json`, Azurite, and `func start`:
  [references/local-setup.md](references/local-setup.md).
- Firing HTTP / queue / timer triggers and the CI workflow:
  [references/triggering-functions.md](references/triggering-functions.md).
- Unit-testing handlers in .NET isolated, Node.js v4, and Python v2:
  [references/unit-testing-handlers.md](references/unit-testing-handlers.md).

## Worked example

A `.NET` isolated function `OrderProcessor` is triggered by the `orders`
queue. To gate it locally before deploy:

1. `func init OrderApp --worker-runtime dotnet-isolated`, then
   `func new --template "Azure Queue Storage Trigger" --name OrderProcessor`.
2. In `local.settings.json`, set
   `"AzureWebJobsStorage": "UseDevelopmentStorage=true"`.
3. Run `azurite --silent --location ./azurite-data` in one shell and
   `func start` in another.
4. Fire the trigger through the admin endpoint:

   ```bash
   curl --request POST -H "Content-Type: application/json" \
        --data '{"input":"{\"orderId\":42}"}' \
        http://localhost:7071/admin/functions/OrderProcessor
   ```

   The host returns HTTP 202 (Accepted) and the function logs the processed order.
5. Unit-test `OrderProcessor.Run` with a mocked `FunctionContext` (xUnit),
   asserting the parsed order id - no host required.

Result: queue-trigger wiring is verified against Azurite and handler logic is
gated in CI, with no live Azure Storage account.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip Azurite for queue/timer triggers | Queue and storage triggers require `AzureWebJobsStorage`; without it `func start` errors | Start Azurite and set `"AzureWebJobsStorage": "UseDevelopmentStorage=true"` in `local.settings.json` |
| Use in-process model for new projects | Support for in-process model ends 2026-11-10 per [learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences) | Use `--worker-runtime dotnet-isolated` |
| Hard-code connection strings in code | Secrets leak to source control | Use `local.settings.json` `Values` array; it is git-ignored by default |
| Call admin endpoint without `Content-Type: application/json` | Host rejects the request | Always include `Content-Type: application/json` header and `{"input":"..."}` body |
| Commit `local.settings.json` | Contains secrets | Verify `.gitignore` excludes it; use `func settings` to sync with Azure app settings |
| Use `func host start` for Core Tools v4 | Command removed in v4; it was v1.x syntax per Core Tools docs | Use `func start` |

## Limitations

- Azurite does not emulate Azure Files or Azure Data Lake Storage Gen2,
  per
  [learn.microsoft.com/azure/storage/common/storage-use-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite).
  Functions that use these services must connect to live Azure Storage
  during local testing.
- Event Grid triggers require extra configuration to run locally; the
  admin-endpoint approach does not cover them. See
  [learn.microsoft.com/azure/azure-functions/functions-run-local#run-a-local-function](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#run-a-local-function)
  for the viewer web app approach.
- Managed Identity authentication and RBAC roles cannot be replicated
  by `func start`. Test with connection strings locally; verify RBAC
  in a staging environment.
- Cold-start behaviour differs from production. For cold-start budgets see
  `cold-start-budget-reference`.

## References

- Core Tools install and `func start`:
  [learn.microsoft.com/azure/azure-functions/functions-run-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- Local development overview:
  [learn.microsoft.com/azure/azure-functions/functions-develop-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local)
- .NET isolated worker model guide:
  [learn.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- In-process vs isolated model comparison:
  [learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences)
- Azurite install and run:
  [learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite)
- Azurite emulator overview:
  [learn.microsoft.com/azure/storage/common/storage-use-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- Manually run non-HTTP triggers:
  [learn.microsoft.com/azure/azure-functions/functions-manually-run-non-http](https://learn.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http)
- Sibling skills:
  `aws-sam-local-testing`,
  `cold-start-budget-reference`,
  `cloudflare-workers-miniflare`,
  `serverless-integration-test-builder`
