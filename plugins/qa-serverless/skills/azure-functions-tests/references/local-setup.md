# Local environment setup

Install Azure Functions Core Tools v4 and Azurite, scaffold the app, and start
the local host. Companion to the `azure-functions-tests` skill.

## Install

```bash
# macOS
brew tap azure/functions
brew install azure-functions-core-tools@4

# Ubuntu/Debian (see full APT steps at learn.microsoft.com/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools)
sudo apt-get install azure-functions-core-tools-4

# Windows: download the MSI from
# https://go.microsoft.com/fwlink/?linkid=2174087 (64-bit) per the Core Tools docs
```

Verify:

```bash
func --version   # must be 4.x
```

Install Azurite via npm, per
[learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite):

```bash
npm install -g azurite
```

## Project initialisation

```bash
# .NET isolated worker model (recommended; in-process support ends 2026-11-10
# per learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences)
func init MyApp --worker-runtime dotnet-isolated

# Node.js (v4 programming model)
func init MyApp --worker-runtime javascript --model V4

# Python (v2 programming model)
func init MyApp --worker-runtime python --model V2

# Add a trigger template
func new --template "Http Trigger" --name HttpExample
func new --template "Azure Queue Storage Trigger" --name QueueExample
func new --template "Timer trigger" --name TimerExample
```

## local.settings.json

Per
[learn.microsoft.com/azure/azure-functions/functions-develop-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local),
`local.settings.json` holds app settings used only when running locally.
Set `AzureWebJobsStorage` to `UseDevelopmentStorage=true` to route storage
triggers to Azurite:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true"
  }
}
```

Never commit `local.settings.json` to source control; it may contain
connection strings.

## Start Azurite

Azurite emulates Blob (port 10000), Queue (port 10001), and Table (port 10002)
per
[learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite).
Start it before `func start`:

```bash
azurite --silent --location ./azurite-data
```

For Docker:

```bash
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    mcr.microsoft.com/azure-storage/azurite
```

## Start the local Functions host

From the project root, per
[learn.microsoft.com/azure/azure-functions/functions-run-local#start-the-functions-runtime](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#start-the-functions-runtime):

```bash
func start
```

Output includes HTTP trigger URLs, e.g.:

```
Http Function HttpExample: http://localhost:7071/api/HttpExample
```

By default, HTTP authorization is not enforced locally (all requests are
treated as `authLevel = "anonymous"`). Pass `--enableAuth` to require
authorization during local testing.
