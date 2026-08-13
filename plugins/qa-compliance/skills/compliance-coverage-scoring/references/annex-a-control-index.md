# Annex A control index (ISO/IEC 27001:2022)

Deep reference behind [iso27001.md](iso27001.md). The full 93-control
enumeration across the four Annex A themes. Consult when scoping a Statement of
Applicability or checking which theme a control belongs to; iso27001.md keeps
only the four-theme summary and the testable-control shortlist.

ISO/IEC 27001:2022 restructured Annex A from 114 controls (2013 edition) to
**93 controls across four themes**, adding 11 new controls for cloud, threat
intelligence, secure coding, and monitoring. All control IDs, names, and counts
below are sourced from
[isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04); the canonical standard text is paywalled at iso.org and is
cited by stable ID "ISO/IEC 27001:2022".

## A.5 Organizational controls (37 controls)

Most A.5 controls are verified by document review, policy attestation, or
access-control test. The exceptions with automated test patterns are A.5.3
(segregation of duties) and A.5.34 (PII protection) - both in
[technical-control-test-patterns.md](technical-control-test-patterns.md).

| ID | Control name |
|---|---|
| A.5.1 | Policies for Information Security |
| A.5.2 | Information Security Roles and Responsibilities |
| A.5.3 | Segregation of Duties |
| A.5.4 | Management Responsibilities |
| A.5.5 | Contact With Authorities |
| A.5.6 | Contact With Special Interest Groups |
| A.5.7 | Threat Intelligence (NEW 2022) |
| A.5.8 | Information Security in Project Management |
| A.5.9 | Inventory of Information and Other Associated Assets |
| A.5.10 | Acceptable Use of Information and Other Associated Assets |
| A.5.11 | Return of Assets |
| A.5.12 | Classification of Information |
| A.5.13 | Labelling of Information |
| A.5.14 | Information Transfer |
| A.5.15 | Access Control |
| A.5.16 | Identity Management |
| A.5.17 | Authentication Information |
| A.5.18 | Access Rights |
| A.5.19 | Information Security in Supplier Relationships |
| A.5.20 | Addressing Information Security Within Supplier Agreements |
| A.5.21 | Managing Information Security in the ICT Supply Chain |
| A.5.22 | Monitoring, Review and Change Management of Supplier Services |
| A.5.23 | Information Security for Use of Cloud Services (NEW 2022) |
| A.5.24 | Information Security Incident Management Planning and Preparation |
| A.5.25 | Assessment and Decision on Information Security Events |
| A.5.26 | Response to Information Security Incidents |
| A.5.27 | Learning From Information Security Incidents |
| A.5.28 | Collection of Evidence |
| A.5.29 | Information Security During Disruption |
| A.5.30 | ICT Readiness for Business Continuity (NEW 2022) |
| A.5.31 | Legal, Statutory, Regulatory and Contractual Requirements |
| A.5.32 | Intellectual Property Rights |
| A.5.33 | Protection of Records |
| A.5.34 | Privacy and Protection of PII |
| A.5.35 | Independent Review of Information Security |
| A.5.36 | Compliance With Policies, Rules and Standards for Information Security |
| A.5.37 | Documented Operating Procedures |

## A.6 People controls (8 controls)

A.6 controls are verified by HR records, contract review, training completion
records, and offboarding audits. A.6.8 (Information Security Event Reporting)
has an automated test pattern - see
[technical-control-test-patterns.md](technical-control-test-patterns.md).

| ID | Control name |
|---|---|
| A.6.1 | Screening |
| A.6.2 | Terms and Conditions of Employment |
| A.6.3 | Information Security Awareness, Education and Training |
| A.6.4 | Disciplinary Process |
| A.6.5 | Responsibilities After Termination or Change of Employment |
| A.6.6 | Confidentiality or Non-Disclosure Agreements |
| A.6.7 | Remote Working |
| A.6.8 | Information Security Event Reporting |

## A.7 Physical controls (14 controls)

A.7 controls are verified by site inspection, physical access-log review, and
equipment maintenance records. No automated code-level test patterns exist for
A.7; evidence is operational.

| ID | Control name |
|---|---|
| A.7.1 | Physical Security Perimeters |
| A.7.2 | Physical Entry |
| A.7.3 | Securing Offices, Rooms and Facilities |
| A.7.4 | Physical Security Monitoring (NEW 2022) |
| A.7.5 | Protecting Against Physical and Environmental Threats |
| A.7.6 | Working In Secure Areas |
| A.7.7 | Clear Desk and Clear Screen |
| A.7.8 | Equipment Siting and Protection |
| A.7.9 | Security of Assets Off-Premises |
| A.7.10 | Storage Media |
| A.7.11 | Supporting Utilities |
| A.7.12 | Cabling Security |
| A.7.13 | Equipment Maintenance |
| A.7.14 | Secure Disposal or Re-Use of Equipment |

## A.8 Technological controls (34 controls)

NEW = added in the 2022 revision. The A.8.x controls verifiable through
automated tests have code patterns in
[technical-control-test-patterns.md](technical-control-test-patterns.md).

A.8.1 User Endpoint Devices / A.8.2 Privileged Access Rights /
A.8.3 Information Access Restriction / A.8.4 Access to Source Code /
A.8.5 Secure Authentication / A.8.6 Capacity Management /
A.8.7 Protection Against Malware / A.8.8 Management of Technical
Vulnerabilities / **A.8.9 Configuration Management (NEW)** /
**A.8.10 Information Deletion (NEW)** / **A.8.11 Data Masking (NEW)** /
**A.8.12 Data Leakage Prevention (NEW)** / A.8.13 Information Backup /
A.8.14 Redundancy of Information Processing Facilities /
A.8.15 Logging / **A.8.16 Monitoring Activities (NEW)** /
A.8.17 Clock Synchronization / A.8.18 Use of Privileged Utility
Programs / A.8.19 Installation of Software on Operational Systems /
A.8.20 Networks Security / A.8.21 Security of Network Services /
A.8.22 Segregation of Networks / **A.8.23 Web Filtering (NEW)** /
A.8.24 Use of Cryptography / A.8.25 Secure Development Life Cycle /
A.8.26 Application Security Requirements / A.8.27 Secure System
Architecture and Engineering Principles /
**A.8.28 Secure Coding (NEW)** /
A.8.29 Security Testing in Development and Acceptance /
A.8.30 Outsourced Development /
A.8.31 Separation of Development, Test and Production Environments /
A.8.32 Change Management / A.8.33 Test Information /
A.8.34 Protection of Information Systems During Audit Testing

## Source

- [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/) -
  community Annex A reference (control IDs, names, counts; fetched 2026-06-04)
- iso.org/standard/27001 - canonical ISO/IEC 27001:2022 standard text
  (paywalled; cite by stable ID "ISO/IEC 27001:2022")
