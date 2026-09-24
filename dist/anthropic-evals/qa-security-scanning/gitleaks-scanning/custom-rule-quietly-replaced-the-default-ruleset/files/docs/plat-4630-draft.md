# PLAT-4630 draft — two more internal formats (r.dasgupta, 2026-09-08)

I dumped the scanner's built-in rule definitions and started from the two that
were closest in shape to ours — the Terraform password rule and the Stripe one,
since `whsec_` is the same family of thing — then swapped in our regexes and
descriptions. Same approach Marta took for PLAT-4471, so the reports stay
consistent. Ready to paste into `.gitleaks.toml` as-is:

    [[rules]]
    id = "hashicorp-tf-password"
    description = "Northvale Postgres role password (pgr_ prefix)"
    regex = '''pgr_[a-zA-Z0-9]{32}'''
    keywords = ["pgr_"]
    tags = ["internal", "database"]

    [[rules]]
    id = "stripe-access-token"
    description = "Northvale webhook signing secret (whsec_nv_ prefix)"
    regex = '''whsec_nv_[a-f0-9]{48}'''
    keywords = ["whsec_nv_"]
    tags = ["internal", "webhooks"]
