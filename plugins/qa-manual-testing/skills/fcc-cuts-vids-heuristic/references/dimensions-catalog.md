# FCC CUTS VIDS - the ten dimensions in full

Deep reference for `fcc-cuts-vids-heuristic` SKILL.md. Consult when the compact
table in the skill isn't enough and you want each dimension's modelling prompt
and the concrete things to enumerate under it.

## FCC (the system shape)

### F - Format

> What is the **shape / format** of inputs + outputs?

Specific data formats the system reads + writes:

- File formats (CSV, JSON, XML, PDF, Avro, Parquet)
- Message formats (HTTP / gRPC / MQTT)
- Data layouts (column vs row store; documents vs relations)
- Encodings (UTF-8, base64, hex)

Modelling Format means listing every format the system touches - 
including where format boundaries are (parser, serialiser,
transport layer).

### C - Constraints

> What are the **rules** the system enforces?

- Schema constraints (column type, NOT NULL)
- Business rules (max 5 orders per cart)
- Performance constraints (response within 200ms)
- Security constraints (auth required before /admin)
- Regulatory constraints (no PII in logs)

Constraints define what *should* happen; exploration tests whether
the system holds them under stress.

### C - Connections

> What does the system **integrate with**?

- External services (third-party APIs, payment processors, identity
  providers)
- Internal services (microservice topology)
- Databases / data stores
- Event buses / queues
- Filesystems / blob storage
- Browsers / clients

Each connection is a potential boundary where things can fail - 
prime exploration territory.

## CUTS (the user shape)

### C - Coverage

> What **categories** of behaviour does the system cover?

Where in the feature space does the system claim to operate? Not
*what tests cover the code* (that's
`qa-test-impact-analysis`) - 
this is *what the product claims to do*.

### U - Users

> Who **uses** the system, and how?

- User personas (anonymous visitor, free user, paid customer,
  admin, partner)
- User-skill levels (novice, expert)
- User-context (mobile in transit, desktop at work, screen-reader user)
- Programmatic users (API consumers, scripts, bots)

Modelling Users surfaces "who's a tester *for* this system?"

### T - Tasks

> What **goals** do users have when using the system?

Not features (that's part of F - Function in SFDPOT). Tasks:

- "Get my package delivered by Friday"
- "Cancel my subscription before next billing cycle"
- "Find what the team did this week"

Tasks span features. A bug that breaks a task (even if every
feature works individually) is high-impact.

### S - Sequences

> What **orderings** of user actions are expected?

- Onboarding sequence (sign-up → verify email → first action)
- Normal workflow sequences
- Recovery sequences (after error → retry → success)
- Edge sequences (cancel mid-flow, navigate away)

Sequences differ from Operations (SFDPOT) - Sequences is the
*shape* of expected user paths; Operations is the *variation* of
how users navigate them.

## VIDS (the data shape)

### V - Variables

> What **runtime values** vary, and within what bounds?

System-level variables - settings, configs, feature flags. These
aren't user inputs; they're values the system holds + uses to
behave differently:

- Feature flags
- Tunable thresholds (max retries, timeout values)
- Environment-specific settings
- Cached values (TTLs, refresh policies)

### I - Inputs

> What does the system **receive** from outside?

User-supplied data - distinct from system variables. Bach's
distinction: Variables are *internal state*; Inputs are *external
data crossing into the system*.

### D - Data

> What does the system **store / process / produce**?

The system's data lifecycle. What gets written + read + how it
flows through the system. Different from Input - Data is what
the system *owns + transforms*, not what arrives.

### S - Storage

> Where and how does data **persist**?

- Database (Postgres, MySQL, DynamoDB)
- Cache (Redis, Memcached)
- Blob (S3, GCS)
- Local filesystem (tmpfs, persistent)
- Browser storage (localStorage, IndexedDB, cookies)
- Memory only (volatile)

Storage matters because durability + consistency expectations
differ across these layers.
