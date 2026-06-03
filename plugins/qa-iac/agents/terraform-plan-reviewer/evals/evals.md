---
component: terraform-plan-reviewer
type: agent
---

# terraform-plan-reviewer - evals

Companion eval cases for [`terraform-plan-reviewer`](../../terraform-plan-reviewer.md).
Three cases cover happy path / branch / adversarial: a high-blast-radius
plan with DB destroy + S3 ACL flip (REVIEW REQUIRED with critical flags),
a low-risk in-place plan with only safe updates (no critical/high flags),
and a refusal when the JSON plan is missing.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - destructive plan (REVIEW REQUIRED)

**Input:**

```
Review this terraform plan JSON for high-blast-radius changes.

plan.json (excerpt from `terraform show -json plan.tfplan`):

{
  "resource_changes": [
    {
      "address": "aws_db_instance.orders_prod",
      "type": "aws_db_instance",
      "change": {
        "actions": ["delete", "create"],
        "before": {"identifier": "orders-prod", "storage_encrypted": true,
                   "publicly_accessible": false, "engine": "postgres"},
        "after":  {"identifier": "orders-prod-v2", "storage_encrypted": true,
                   "publicly_accessible": false, "engine": "postgres"}
      }
    },
    {
      "address": "aws_s3_bucket.public_data",
      "type": "aws_s3_bucket",
      "change": {
        "actions": ["update"],
        "before": {"acl": "private"},
        "after":  {"acl": "public-read"}
      }
    },
    {
      "address": "aws_iam_policy.deploy",
      "type": "aws_iam_policy",
      "change": {
        "actions": ["update"],
        "before": {"policy": "{\"Statement\":[{\"Action\":[\"s3:GetObject\"],\"Resource\":\"*\"}]}"},
        "after":  {"policy": "{\"Statement\":[{\"Action\":\"*\",\"Resource\":\"*\"}]}"}
      }
    },
    {
      "address": "aws_route53_record.api",
      "type": "aws_route53_record",
      "change": {"actions": ["update"], "before": {"ttl": 60}, "after": {"ttl": 300}}
    }
  ]
}

Commit message: "Rename orders DB; tweak TTL."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 categorizes `aws_db_instance.orders_prod` as a
replace (`["delete", "create"]`). Step 3 flags the S3 ACL transition
`private → public-read` as `critical` (matches the curated row in the
security-degradation table) and the IAM policy change adding `"*"` to
Action as `high`. Step 5's risky-combinations detector matches "DB
destroy + new DB without import → data loss likely". Step 6's report
emits the `Terraform plan review` header, verdict `REVIEW REQUIRED`,
and a high-severity table containing at least three rows: S3 ACL flip
(critical), DB destroy+recreate (critical, data loss), and broad IAM
policy (high). The Route53 TTL change appears in the low/informational
section only. Recommended actions tell the reviewer to block, to use a
`moved`/`import` block for the DB, and to narrow the IAM policy.

**Pass condition:** Output contains the literal string `REVIEW REQUIRED`
OR `BLOCK` AND the literal string `aws_s3_bucket.public_data` AND the
literal string `aws_db_instance.orders_prod` AND at least one of
`data loss` / `moved` / `import` (referencing the DB destroy-recreate
fix). Output does NOT mark the plan as `safe` or `pass`.

## Eval 2 - branch - safe in-place update only

**Input:**

```
Review this terraform plan JSON for high-blast-radius changes.

plan.json:

{
  "resource_changes": [
    {
      "address": "aws_instance.app_server",
      "type": "aws_instance",
      "change": {
        "actions": ["update"],
        "before": {"ami": "ami-0aaaa1111aaaa1111", "instance_type": "t3.medium"},
        "after":  {"ami": "ami-0bbbb2222bbbb2222", "instance_type": "t3.medium"}
      }
    },
    {
      "address": "aws_route53_record.api",
      "type": "aws_route53_record",
      "change": {
        "actions": ["update"],
        "before": {"ttl": 60},
        "after":  {"ttl": 300}
      }
    },
    {
      "address": "aws_cloudwatch_log_group.app",
      "type": "aws_cloudwatch_log_group",
      "change": {
        "actions": ["update"],
        "before": {"retention_in_days": 7},
        "after":  {"retention_in_days": 30}
      }
    },
    {
      "address": "aws_s3_bucket_versioning.assets",
      "type": "aws_s3_bucket_versioning",
      "change": {"actions": ["no-op"], "before": {"status": "Enabled"},
                 "after": {"status": "Enabled"}}
    }
  ]
}

Commit message: "Bump AMI to latest hardened image; raise log retention; raise API TTL."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 finds no `delete` actions and no replace
(`["delete","create"]`) actions; only in-place updates and a no-op.
Step 3's security-degradation walk finds no flagged attribute
transitions (no ACL flip, no `cidr_blocks` widening to `0.0.0.0/0`,
no encryption removal, no `publicly_accessible: true`, no KMS key
delete, no CloudTrail disable). Step 5's risky-combinations detector
finds no DB destroy / IAM destroy patterns. Step 6's report emits the
`Terraform plan review` header, no critical / high flags, and the AMI
change, TTL change, and log-retention change appear in the
low-severity / informational section with `update` action and notes
like `AMI change (expected)` and `TTL change`.

**Pass condition:** Output contains the literal string `aws_instance.app_server`
AND does NOT contain `critical` or `high` as a finding severity row
(case-insensitive on the severity column). The high-severity table is
either absent or explicitly empty. The recommended-actions list does
NOT call to `block` the PR.

## Eval 3 - adversarial - missing JSON plan (refuse)

**Input:**

```
Review this terraform plan for high-blast-radius changes.

I haven't run `terraform show -json` yet — here is the human-readable
plan text instead:

  Terraform will perform the following actions:

    # aws_s3_bucket.public_data will be updated in-place
    ~ resource "aws_s3_bucket" "public_data" {
        ~ acl = "private" -> "public-read"
      }

    # aws_db_instance.orders_prod must be replaced
    -/+ resource "aws_db_instance" "orders_prod" {
        ~ identifier = "orders-prod" -> "orders-prod-v2" # forces replacement
      }

  Plan: 1 to add, 1 to change, 1 to destroy.

Just read the text plan and tell me if it's safe to apply.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent's Step 7 Refuse-to-proceed rules explicitly
forbid operating without the JSON plan ("Operate without the JSON
plan; refuses with 'run terraform show -json first.'"). It must
refuse to issue a verdict on the human-readable text and instruct the
caller to regenerate the plan in JSON form via
`terraform plan -out=plan.tfplan && terraform show -json plan.tfplan
> plan.json`. It should NOT silently parse the text plan and emit a
findings table (even though the text would obviously warrant
flagging) - that would normalize the anti-pattern called out in
Step 1 ("Text plan harder to parse; misses signals").

**Pass condition:** Output contains the literal string
`terraform show -json` (the named remediation) AND a refusal phrase
such as `refuse` / `cannot review` / `JSON plan required` / `need the
JSON plan`. Output does NOT contain a `REVIEW REQUIRED` / `BLOCK`
verdict computed from the text plan, AND does NOT emit a high-severity
findings table derived from the text plan.

## Reproducibility notes

- All three inputs are concrete pasted blocks (plan JSON or text);
  no external `terraform plan` execution is required to reproduce.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for the verdict label and the cited resource
  addresses.
- Eval cases were authored 2026-05-25 against the v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
