# SOC 2 evidence source map

## In-scope criteria decision

Most SaaS engagements include CC + Availability + Confidentiality. Privacy criteria add when GDPR/CCPA also in scope. Processing Integrity adds for fintech / data-processing SaaS.

| Criterion category | Typical scope decision |
|---|---|
| CC1 Control Environment | Always |
| CC2 Communication & Information | Always |
| CC3 Risk Assessment | Always |
| CC4 Monitoring | Always |
| CC5 Control Activities | Always |
| CC6 Logical & Physical Access | Always |
| CC7 System Operations | Always |
| CC8 Change Management | Always |
| CC9 Risk Mitigation | Always |
| A1 Availability | If uptime SLA committed |
| C1 Confidentiality | Typical for B2B SaaS |
| PI1 Processing Integrity | If data-processing accuracy matters |
| P1 - P9 Privacy | If handling PII at scale |

## Control to evidence source

Map each control to one or more automatable evidence sources:

| Control | Evidence source | Collector pattern |
|---|---|---|
| CC6.1 Logical access | IDP audit logs (Okta/Auth0/Keycloak) | Daily export of user-access events |
| CC6.2 Access provisioning | Onboarding workflow logs | Per-hire ticket + access-grant audit |
| CC6.3 Access deprovisioning | Offboarding workflow logs | Per-departure ticket + access-revoke audit |
| CC7.1 Threat detection | SIEM (Datadog, Splunk) alert logs | Continuous alert-history feed |
| CC7.2 System monitoring | APM (Datadog, New Relic) uptime data | Daily uptime report |
| CC8.1 Change management | Git PR history + CI deploy logs | Per-PR audit (reviewer attribution) |
| A1.1 Availability monitoring | SLO dashboards | Monthly availability report |
| C1.1 Encryption at rest | Cloud KMS audit logs | Quarterly attestation |
| C1.2 Encryption in transit | TLS config audit | Quarterly attestation |
