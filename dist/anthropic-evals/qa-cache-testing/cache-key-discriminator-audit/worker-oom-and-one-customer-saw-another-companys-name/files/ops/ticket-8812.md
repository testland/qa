# 8812 - wrong company name on the catalogue page

**Reported:** 2026-09-09 14:22 by Northwind Traders (tenant `northwind`)
**Severity:** raised to P1 by the account team, currently unassigned

Customer screenshot shows the catalogue page header reading "Acme Supply Co"
above three product codes (a-100, a-101, a-102) that are not Northwind's.
Customer noticed because Acme Supply Co is a competitor of theirs.

Timeline from the access log:

    14:02:11  tenant=acme        region=eu  GET /catalog/footwear  200
    14:02:44  tenant=northwind   region=eu  GET /catalog/footwear  200
    14:21:58  tenant=northwind   region=eu  GET /catalog/footwear  200
    14:23:40  worker restart (deploy 4.2.6)
    14:24:02  tenant=northwind   region=eu  GET /catalog/footwear  200

Customer confirms the header was correct again after 14:24. Both tenants are
served out of the `eu` region. No error was logged on any of these requests.

Support has asked twice whether any other tenant has been affected. We do not
currently have an answer.
