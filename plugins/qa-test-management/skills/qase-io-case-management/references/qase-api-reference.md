# Qase.io Public API v1 reference

Field enums, endpoint map, and response shapes for the Qase Public API v1. Per
developers.qase.io schema definitions (Cloudflare-protected; cite by stable URL).

## Field enums

| Field | Values |
|---|---|
| `severity` | 1=Blocker, 2=Critical, 3=Major, 4=Normal, 5=Minor, 6=Trivial |
| `priority` | 1=High, 2=Medium, 3=Low |
| `type` | 1=Functional, 2=Smoke, 3=Regression, 4=Security, 5=Usability, 6=Performance, 7=Acceptance, 8=Compatibility (defaults; configurable) |
| `automation` | 0=Manual, 1=Automated, 2=To-be-automated |
| `status` | 0=Actual, 1=Draft, 2=Deprecated |

Map per `severity-vs-priority-reference` (in the qa-defect-management plugin);
note Qase priority is reversed from the defect-management convention (1=High
here vs 1=Critical in IEEE 1044).

## Endpoints

| Verb + path | Purpose |
|---|---|
| `POST /case/{project_code}` | Create a case |
| `PATCH /case/{project_code}/{id}` | Update a case |
| `GET /case/{project_code}/{id}` | Get one case |
| `GET /case/{project_code}` | List cases (paginate with `limit` / `offset`) |
| `POST /suite/{project_code}` | Create a suite |
| `POST /shared_step/{project_code}` | Create a shared step |
| `POST /result/{project_code}` | Post run results (different surface; not case authoring) |

## Response shapes

- Create returns `{"status": true, "result": {"id": N}}`.
- List returns `{"status": true, "result": {"total", "filtered", "count", "entities": [...]}}`.
- Paginate a list until `len(entities) < limit`.

## Shared-step reuse

Define a step once, then reference it inside a case via its `shared_step_hash`:

    steps = [
        {"shared_step_hash": shared_step_hash},
        {"action": "...", "expected_result": "..."},
    ]
