# Application security & compliance QA

Application-security & compliance QA role bundle: one-command install of SAST, DAST, SCA, secrets scanning, SBOM, fuzzing, compliance, multi-tenancy isolation, test-data privacy, and IaC policy testing.

Installing this one plugin installs all 10 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-security@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-sast** - SAST (static application security testing)
- **qa-dast** - DAST (dynamic application security testing)
- **qa-sca** - SCA (software composition analysis) / dependency scanning
- **qa-secrets** - Secrets scanning + rotation
- **qa-sbom** - SBOM generation + container image scanning + vuln prioritization
- **qa-fuzz-testing** - Structure-aware coverage-guided fuzzing
- **qa-compliance** - Compliance test patterns + readiness review
- **qa-multi-tenancy** - Tenant-isolation testing for B2B SaaS
- **qa-test-data-privacy** - PII detection, masking, and synthetic data generation for test environments
- **qa-iac** - Infrastructure-as-code testing + security policy

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
