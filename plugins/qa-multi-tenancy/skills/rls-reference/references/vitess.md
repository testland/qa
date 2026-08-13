# Vitess - keyspace sharding + vindexes

Vitess has no row-level security policy layer. Tenant isolation happens
at the routing tier: a tenant's rows sit on a dedicated shard (or shard
range), and vindexes route queries so cross-tenant access never reaches
the wrong MySQL shard. A keyspace is a logical database; when sharded it
maps to multiple MySQL databases across shards, and a vindex maps a
column value to a keyspace ID.

## Vindexes for tenant isolation

A primary vindex on `tenant_id` maps each tenant to a keyspace-ID range;
Vitess routes every query carrying a `tenant_id` condition to the owning
shard(s).

| Vindex type | Use for tenant isolation |
|---|---|
| Functional hash (`xxhash`, `hash`) | Maps `tenant_id` to a keyspace ID deterministically; no lookup table needed |
| Consistent lookup (unique) | Stores `tenant_id -> keyspace_id` in a MySQL lookup table; supports non-hash distributions |
| Non-unique lookup | Secondary routing on tenant-level subtables |

Example VSchema fragment:

```json
{
  "sharded": true,
  "vindexes": { "tenant_hash": { "type": "xxhash" } },
  "tables": {
    "documents": {
      "columnVindexes": [ { "column": "tenant_id", "name": "tenant_hash" } ]
    }
  }
}
```

Any query without a `tenant_id` condition scatters to all shards.
Isolation therefore depends on every query carrying a `tenant_id`
predicate - an application-layer responsibility.

## Bypass risks

| Risk | Why |
|---|---|
| Query without `tenant_id` predicate | Scatters to all shards; returns rows from every tenant |
| Cross-shard transactions | 2PC for cross-shard writes; isolation bugs can occur in rollback paths |
| Row updates that change `tenant_id` | Vitess cannot move rows between shards on update; `tenant_id` must be immutable |
| Direct MySQL access (bypassing VTGate) | Shard-level MySQL has no vindex awareness; direct access bypasses routing |

Sources: Vitess Vindexes
[vitess.io/docs/21.0/reference/features/vindexes/](https://vitess.io/docs/21.0/reference/features/vindexes/);
Vitess Keyspaces
[vitess.io/docs/21.0/concepts/keyspace/](https://vitess.io/docs/21.0/concepts/keyspace/).
