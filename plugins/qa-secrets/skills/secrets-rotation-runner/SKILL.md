---
name: secrets-rotation-runner
description: "Build-an-X for the secret-rotation workflow after detection - detect via gitleaks/trufflehog/kingfisher → identify provider via verifier → rotate via provider API (AWS IAM / GitHub PAT / Stripe / GCP / Azure / Twilio / Slack / etc.) → invalidate old secret → audit log via observability stack → post-mortem cross-ref. Use when a secret is detected in code (or proactively for periodic rotation) - assume git-history scrub does NOT prevent compromise."
---

# secrets-rotation-runner

## Overview

Detecting a leaked secret in code is the easy part. Rotating it
correctly - without breaking production, with full audit trail,
across all the systems that referenced the old value - is the hard
part. This skill is a **build-an-X workflow** for the rotation
process.

**Critical assumption:** git-history rewrites (BFG Repo-Cleaner,
git filter-repo) do NOT prevent compromise. The leaked secret IS
exposed (forks / clones / mirrors / archives / human eyeballs).
Rotation is mandatory; history scrub is at most cosmetic.

## When to use

- A scanner ([`gitleaks-scanning`](../gitleaks-scanning/SKILL.md),
  [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md),
  [`kingfisher-scanning`](../kingfisher-scanning/SKILL.md)) found a
  leaked credential.
- Proactive periodic rotation (e.g., quarterly rotation of all
  cloud-provider service-account keys).
- Compliance review requires evidence of rotation runbook + recent
  exercise.
- Incident response after a known breach (assume all secrets in
  affected scope are compromised).

## Step 1 - Identify the secret type

The scanner output identifies the credential class:

| Detection | Provider | Rotation API |
|---|---|---|
| AWS key ID + secret (AKIA…) | AWS IAM | `aws iam create-access-key` + `aws iam delete-access-key` |
| GitHub PAT (ghp_…) | GitHub | github.com/settings/tokens (or GraphQL API) |
| GCP service account key | GCP IAM | `gcloud iam service-accounts keys create` + `delete` |
| Azure service principal | Azure AD | `az ad sp credential reset` |
| Stripe API key (sk_live_…) | Stripe | dashboard.stripe.com → API keys |
| Twilio account+token | Twilio | console.twilio.com → API Keys |
| Slack bot/user token (xoxb-…, xoxp-…) | Slack | api.slack.com/apps → OAuth & Permissions |
| Database password (DB conn string) | DB-specific | `ALTER USER` etc. |
| Custom JWT signing key | Internal | App-specific rotation logic |

For automation-friendly providers (AWS, GitHub, GCP, Azure, Stripe,
Twilio), rotation can be scripted. For others (often custom or
on-prem), rotation is manual + documented.

## Step 2 - Pre-rotation: assess blast radius

Before rotating, identify everything that uses the old value:

```bash
# Local: where does the leaked key appear?
grep -r "AKIAEXAMPLE" .

# Across infrastructure: secret-management system
vault kv list -recursive secret/    # for HashiCorp Vault
aws secretsmanager list-secrets       # AWS Secrets Manager

# Across application code: where's the env var consumed?
grep -r "MY_API_KEY" src/

# Across CI/CD: where's the secret injected?
gh secret list                       # GitHub Actions secrets
```

The blast radius shapes the rotation strategy:

- **Single use** - straightforward swap
- **Multiple services** - coordinated swap (rolling deploy)
- **Distributed (cached, replicated)** - staged swap with
  invalidation window

## Step 3 - Rotation strategy by use pattern

### A. Two-secret pattern (preferred)

The provider supports multiple active credentials simultaneously:

1. Create new secret (provider API)
2. Deploy new secret to all consumers (rolling deploy)
3. Verify all consumers use the new secret (audit logs)
4. Delete old secret (provider API)

This minimizes downtime risk. Most modern providers support it
(AWS allows 2 active access keys per IAM user; GitHub supports
multiple PATs; Stripe supports multiple API keys per account).

```bash
# Example: AWS IAM user "myapp"
NEW_KEY=$(aws iam create-access-key --user-name myapp)
NEW_KEY_ID=$(echo $NEW_KEY | jq -r '.AccessKey.AccessKeyId')
NEW_SECRET=$(echo $NEW_KEY | jq -r '.AccessKey.SecretAccessKey')

# Deploy new key to all consumers...
# (e.g., update Kubernetes secrets, Vault, AWS Secrets Manager)

# After verification, deactivate old:
aws iam update-access-key --user-name myapp --access-key-id $OLD_KEY_ID --status Inactive
# Wait observation window (e.g., 24h to confirm no consumer regressed)
aws iam delete-access-key --user-name myapp --access-key-id $OLD_KEY_ID
```

### B. Atomic swap (when two-secret unsupported)

Some providers only support one credential at a time:

1. Schedule downtime window (or accept brief outage)
2. Generate new secret
3. Update all consumers simultaneously
4. Old secret invalidates automatically when new is generated

Higher downtime risk; minimize via tooling that updates all
consumers atomically.

### C. Emergency invalidation (compromise confirmed)

If active exploitation is confirmed:

1. Invalidate immediately (don't wait for new-secret deployment)
2. Service consumers will fail until new secret deploys
3. Accept brief outage as cost of compromise mitigation

## Step 4 - Audit + verify

After rotation:

```bash
# AWS: check audit log for usage of old key after deactivation
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=$OLD_KEY_ID \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S)

# GitHub: check audit log for PAT usage
gh api orgs/myorg/audit-log --paginate | jq '.[] | select(.actor_token_id == "leaked-token-id")'

# Stripe: dashboard.stripe.com → API keys → activity log
```

Audit verifies:

- Old secret was actually invalidated (no successful calls after
  deactivation timestamp)
- New secret IS being used by expected consumers
- No unauthorized usage in the exposure window before rotation

## Step 5 - Post-rotation: incident documentation

Cross-ref `post-mortem-author` (in the qa-process plugin):

- Detection mechanism + time
- Exposure window estimate (commit timestamp → rotation timestamp)
- Provider audit log review
- Blast radius (what could the secret access?)
- Customer impact assessment
- Fix: how was the leak prevented going forward?
- Lessons learned: what process gap allowed the leak?

## Step 6 - Add detection rule for future

If the scanner missed the format that leaked, add a custom rule:

- gitleaks: `[[rules]]` in `.gitleaks.toml`
  (cross-ref [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md) Step 4)
- TruffleHog: custom detector definition
  (cross-ref [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md))
- Kingfisher: built-in rule extension
  (cross-ref [`kingfisher-scanning`](../kingfisher-scanning/SKILL.md))

This is the "test that catches the bug" pattern for security:
make sure the same leak format gets caught at PR time going
forward.

## Step 7 - Proactive rotation cadence

Beyond reactive rotation, schedule periodic rotation:

| Secret type | Recommended rotation cadence |
|---|---|
| Production cloud-provider service account keys | Quarterly |
| Long-lived API keys (Stripe, Twilio, Slack) | Quarterly |
| Database passwords | Quarterly + on personnel change |
| GitHub PATs | Quarterly + on personnel change |
| TLS certificates | Per provider (typically 1 year max) |
| JWT signing keys | Annually (with grace period for outstanding tokens) |
| Webhook signing secrets | Annually (with grace period for in-flight webhooks) |

Automate via the same workflow (Step 3 two-secret pattern); don't
wait for an incident to discover the rotation runbook is broken.

## Step 8 - Tooling integration

For coordinated rotation across consumers, use a secrets-management
platform:

- **HashiCorp Vault** - dynamic secrets, lease management
- **AWS Secrets Manager** - automatic rotation Lambda functions
  for RDS, Redshift, DocumentDB
- **GCP Secret Manager** - version pinning + rotation
- **Azure Key Vault** - automated rotation policies
- **Doppler / Akeyless / Infisical** - multi-cloud secret platforms

These platforms handle the consumer-update-and-coordinate part
(Step 3 deploy phase) more reliably than ad-hoc scripts.

## Step 9 - End-to-end test recipe

After every rotation:

1. ✅ New secret generated (provider API confirms)
2. ✅ All consumers verified using new secret (audit logs)
3. ✅ Old secret invalidated (provider confirms; subsequent calls
   fail)
4. ✅ Audit log reviewed for unauthorized old-secret usage during
   exposure window
5. ✅ Post-mortem documented (or "scheduled rotation; no incident")
6. ✅ Detection rule added for future similar formats
7. ✅ Next proactive rotation scheduled

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Trust git-history scrub to fix the leak | Leaked secret IS exposed; assume compromise | Always rotate (Overview) |
| Atomic swap without coordination | Brief outage during deploy | Two-secret pattern (Step 3A) |
| Skip audit-log review post-rotation | Miss unauthorized usage during exposure | Always audit (Step 4) |
| Rotate; skip post-mortem | Same leak pattern recurs | Document + add detection rule (Steps 5 - 6) |
| Ad-hoc rotation; no proactive cadence | Rotation runbook stale; emergency rotation breaks | Quarterly cadence per secret type (Step 7) |

## Limitations

- This is a build-an-X workflow. Tests use provider-native APIs +
  the team's secrets-management platform.
- Some providers don't support two-secret pattern; atomic swap
  is the only option (downtime risk).
- Audit-log retention varies (AWS CloudTrail 90 days default; GCP
  Audit Logs configurable); rotation in older incidents may have
  insufficient audit evidence.
- Custom (in-house) credential systems need bespoke rotation
  logic; document per system.

## References

- [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md),
  [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md),
  [`kingfisher-scanning`](../kingfisher-scanning/SKILL.md) - sister
  scanners (the detection step)
- AWS IAM key rotation: docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- GitHub PAT management: docs.github.com/en/authentication/keeping-your-account-and-data-secure
- HashiCorp Vault: developer.hashicorp.com/vault
- AWS Secrets Manager rotation: docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
- `post-mortem-author` - 
  cross-plugin: post-rotation incident documentation
