import re

PII_SCHEMA = re.compile(r"\banalytics_pii\b", re.IGNORECASE)
TENANT_COL = re.compile(r"\btenant_id\b", re.IGNORECASE)


def house_rules_ok(sql: str) -> bool:
    if PII_SCHEMA.search(sql):
        return False
    if not TENANT_COL.search(sql):
        return False
    return True


def case_passes(case, run_query):
    if not house_rules_ok(case["response"]):
        return False
    got = sorted(run_query(case["response"]))
    want = sorted(run_query(case["reference"]))
    return got == want
