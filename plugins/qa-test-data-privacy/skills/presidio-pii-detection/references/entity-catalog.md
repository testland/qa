# presidio-pii-detection - built-in entity catalog

Full entity lists for [presidio-pii-detection](../SKILL.md). The runnable
detection, custom-recogniser, anonymise, batch, and CI examples stay in
SKILL.md; this file is the lookup catalog behind the `entities=[...]` whitelist.

Per [presidio.dataprivacystack.org/supported_entities](https://presidio.dataprivacystack.org/supported_entities/),
the global entities are:

| Entity | Detects |
|---|---|
| `CREDIT_CARD` | 12 - 19 digit numbers (Luhn-validated) |
| `CRYPTO` | Bitcoin wallet addresses |
| `DATE_TIME` | Absolute or relative dates / times |
| `EMAIL_ADDRESS` | Email box identifiers |
| `IBAN_CODE` | International bank account numbers |
| `IP_ADDRESS` | IPv4 / IPv6 |
| `MAC_ADDRESS` | Network interface identifiers |
| `NRP` | Nationality / religious / political affiliation |
| `LOCATION` | Politically or geographically defined location (NER) |
| `PERSON` | Full names (NER) |
| `PHONE_NUMBER` | Telephone numbers |
| `MEDICAL_LICENSE` | Common medical licence numbers |
| `URL` | Uniform Resource Locators |

Country-specific entities (subset):

| Region | Entities |
|---|---|
| US | `US_BANK_NUMBER`, `US_DRIVER_LICENSE`, `US_ITIN`, `US_MBI`, `US_NPI`, `US_PASSPORT`, `US_SSN` |
| UK | `UK_NHS`, `UK_NINO`, `UK_PASSPORT`, `UK_POSTCODE`, `UK_VEHICLE_REGISTRATION` |
| Spain | `ES_NIF`, `ES_NIE` |
| Italy | `IT_FISCAL_CODE`, `IT_DRIVER_LICENSE`, `IT_VAT_CODE`, `IT_PASSPORT`, `IT_IDENTITY_CARD` |
| Poland | `PL_PESEL` |
| Singapore | `SG_NRIC_FIN`, `SG_UEN` |
| Australia | `AU_ABN`, `AU_ACN`, `AU_TFN`, `AU_MEDICARE` |
| India | `IN_PAN`, `IN_AADHAAR`, `IN_VEHICLE_REGISTRATION`, `IN_VOTER`, `IN_PASSPORT`, `IN_GSTIN` |
| Finland | `FI_PERSONAL_IDENTITY_CODE` |
| Korea | `KR_DRIVER_LICENSE`, `KR_FRN`, `KR_PASSPORT`, `KR_BRN`, `KR_RRN` |
| Nigeria | `NG_NIN`, `NG_VEHICLE_REGISTRATION` |
| Thailand | `TH_TNIN` |

For the full list and entity descriptions see
[presidio.dataprivacystack.org/supported_entities](https://presidio.dataprivacystack.org/supported_entities/).
