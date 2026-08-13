# Per-regime identifier catalogs

Full per-regime enumerations behind [pii-categories.md](pii-categories.md).
The cross-jurisdiction map there is the fast scoping tool; this file holds
the detail behind each column.

## GDPR - personal data (Article 4(1))

**Definition** (Article 4(1)): "any information relating to an
identified or identifiable natural person ('data subject')"
([gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)).

The article enumerates identifiers that make a person identifiable:

| Identifier class | Examples |
|---|---|
| **Name** | Given name, surname, full name, online aliases linked to the person |
| **Identification number** | National ID, passport, driver's licence, tax ID, employee ID |
| **Location data** | GPS coordinates, IP-derived city/region, cell-tower triangulation |
| **Online identifier** | IP address, cookie ID, device fingerprint, advertising ID (per Recital 30) |
| **Physical/physiological factor** | Height, weight, eye colour, fingerprint, gait |
| **Genetic factor** | DNA-derived information (further defined in Art. 4(13)) |
| **Mental factor** | Diagnosed mental-health conditions, IQ test results |
| **Economic factor** | Salary, credit score, transaction history, account balances |
| **Cultural factor** | Language, religion, ethnic background |
| **Social factor** | Marital status, family relationships, social-network connections |

Source: Article 4(1) GDPR
([gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)).

### GDPR Article 9 - special categories of personal data

Article 9(1) lists categories whose processing is **prohibited by
default** unless one of the Article 9(2) exceptions applies:

- Racial or ethnic origin
- Political opinions
- Religious or philosophical beliefs
- Trade-union membership
- Genetic data (defined in Art. 4(13))
- Biometric data processed for unique identification (defined in
  Art. 4(14))
- Data concerning health (defined in Art. 4(15))
- Data concerning a natural person's sex life or sexual orientation

A masking pipeline for an EU dataset must apply **at least the
broader Art. 4(1) rules** and **stricter rules** to any field
falling under Art. 9 (special categories carry higher fines and
must be either redacted or fully anonymised, not merely
pseudonymised).

### GDPR Article 4(5) - pseudonymisation vs anonymisation

"Pseudonymisation" (Art. 4(5)) keeps data attributable to a subject
**with additional information**, kept separately. Pseudonymised
data is **still personal data** under GDPR - it remains in scope.

Anonymised data (no longer linkable to a subject under any
reasonably likely method, per Recital 26) falls **out** of GDPR
scope. The masking pipeline must mark which output is which
([masking-techniques.md](masking-techniques.md)
explains the techniques).

## CCPA / CPRA - personal information

**Definition** (Cal. Civ. Code § 1798.140(v)(1), as amended by
CPRA): "information that identifies, relates to, describes, is
reasonably capable of being associated with, or could reasonably be
linked, directly or indirectly, with a particular consumer or
household" ([oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa)).

Statutory categories enumerated in § 1798.140(v)(1)(A) - (K):

| # | Category | Examples |
|---|---|---|
| A | **Identifiers** | Name, postal address, email, IP address, account name, SSN, driver's licence, passport |
| B | **Customer records** | Records covered by Cal. Civ. Code § 1798.80(e) - name, signature, education, employment, financial info, medical, health-insurance, with paper/electronic regardless of storage medium |
| C | **Protected classifications** | Race, religion, gender, sexual orientation, age, national origin, disability, marital status (under California or federal law) |
| D | **Commercial information** | Purchases, products considered, consuming history |
| E | **Biometric information** | Fingerprints, retina, hand prints, voice recordings, keystroke patterns |
| F | **Internet/network activity** | Browsing history, search history, interaction with a website or app |
| G | **Geolocation data** | Physical location, movements, especially "precise geolocation" (CPRA refinement) |
| H | **Sensory data** | Audio, electronic, visual, thermal, olfactory recordings |
| I | **Professional/employment** | Job titles, salaries, employment records |
| J | **Education** | Education records as defined in 20 USC § 1232g (FERPA) |
| K | **Inferences** | Profile drawn from any of A - J to predict preferences, characteristics, predispositions, behaviour |

### CPRA - sensitive personal information (SPI)

CPRA added a subcategory of personal information requiring extra
protection (Cal. Civ. Code § 1798.140(ae)):

- Government identifiers - SSN, driver's licence, state ID,
  passport number
- Account log-in + password / financial account / debit-card /
  credit-card number with security code
- Precise geolocation (≤1,850 ft / 1,850 ft radius)
- Racial / ethnic origin, religious / philosophical beliefs, union
  membership
- Contents of mail, email, text messages (where the business isn't
  the intended recipient)
- Genetic data
- Biometric information processed to **uniquely identify** a
  consumer
- Health information (collected by businesses, distinct from HIPAA
  PHI)
- Sex life or sexual orientation

Citation: oag.ca.gov/privacy/ccpa "Sensitive Personal Information"
([oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa)).

## NIST SP 800-122 - PII

**Definition** (citing OMB Memorandum 07-16, reproduced in NIST SP
800-122 Section 2.1): "information which can be used to distinguish
or trace an individual's identity, such as their name, social
security number, biometric records, etc., alone, or when combined
with other personal or identifying information which is linked or
linkable to a specific individual, such as date and place of
birth, mother's maiden name, etc."

Citation: NIST SP 800-122:2010 §2.1, fetched from
[csrc.nist.gov/pubs/sp/800/122/final](https://csrc.nist.gov/pubs/sp/800/122/final).

### Linked vs linkable

NIST 800-122 §2.2 introduces a crucial distinction:

- **Linked information** is information about or related to an
  individual that is logically associated with other information
  about the individual.
- **Linkable information** is information about or related to an
  individual for which there is a possibility of logical
  association with other information about the individual.

A masking pipeline must consider *linkable* fields (e.g., birth
date alone isn't identifying, but date + zip + sex is - the
Sweeney 87 % rule). The pipeline shouldn't only protect direct
identifiers.

### Confidentiality impact levels

NIST 800-122 §3 names six factors that drive the PII
confidentiality impact level (low / moderate / high):

1. **Identifiability** - how directly the PII identifies
2. **Quantity** - how many individuals' data
3. **Data field sensitivity** - what specific fields (SSN > name)
4. **Context of use** - what the PII is used for
5. **Obligation to protect confidentiality** - legal duty
6. **Access to and location of PII** - where stored, who can
   access

Masking aggressiveness scales with impact level.

## HIPAA Safe Harbor - 18 identifiers (45 CFR § 164.514(b)(2))

For health data (PHI), the HIPAA Privacy Rule defines two
de-identification methods (Expert Determination, 45 CFR §
164.514(b)(1), and Safe Harbor, 45 CFR § 164.514(b)(2)). Safe
Harbor requires removing **all** of these 18 identifiers (per HHS
guidance,
[hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)):

1. Names
2. All geographic subdivisions smaller than a state (street, city,
   county, precinct, ZIP - except first 3 digits of ZIP if
   population > 20,000)
3. All elements of dates (except year) directly related to the
   individual, including birth, admission, discharge, death; all
   ages over 89 → "90 or older"
4. Phone numbers
5. Fax numbers
6. Electronic mail addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate / licence numbers
12. Vehicle identifiers (incl. licence plate)
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voiceprints)
17. Full-face photos and comparable images
18. Any other unique identifying number, characteristic, or code

A masking pipeline operating on health data must catch all 18; a
detector configured only for GDPR's broader categories will miss
HIPAA-required identifiers (e.g., medical record number is not
explicit in GDPR Art. 4(1) - covered by "identification number"
but a detector may not flag it without a HIPAA-specific
recogniser).
