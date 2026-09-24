# ACC-2044 - two accounts for one address

2026-09-03. A tenant admin signed up through the web form as
`Rachel.M@northgate.co.uk` and the account key stored for her was
`Rachel.M@northgate.co.uk`. The same person signing in later from the mobile
app - which lower-cases the field in the form before it posts - landed in a
second, empty account keyed `rachel.m@northgate.co.uk`. She could see neither
account's data from the other.

Two tickets in August read the same way (SUP-49903, SUP-50117), both from
addresses with a capital letter in them. Support has been merging these by hand.
Nobody has traced where the two keys come from. The web form has never
lower-cased anything; only the mobile client does.
