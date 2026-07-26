# Cross-environment data-sharing agreements

Referenced from [SKILL.md](../SKILL.md). When a dataset moves between
environments (production to staging, staging to dev, dev to a third-party test
vendor), a data-sharing agreement (DSA) must be in place before the transfer.
The DSA governs:

1. **Purpose statement.** The specific test goal that justifies the transfer
   (GDPR Art. 5(1)(b) purpose limitation). A vague "QA use" is not sufficient;
   name the sprint, the feature, or the compliance audit.

2. **Data categories transferred.** Enumerated from the cross-jurisdiction map
   in `pii-categories-reference` so
   all applicable regimes are in scope.

3. **Receiving environment classification.** Documents whether the target
   environment meets the access control and audit standard required for the
   tier (NIST 800-122 §4 control families apply here).

4. **Retention limit in the receiving environment.** Must be equal to or
   shorter than the source environment retention, never longer.

5. **Deletion obligation.** Receiving party must confirm deletion and provide
   a certificate no later than 5 business days after expiry.

6. **Onward transfer restriction.** The receiving environment may not forward
   the dataset to a fourth environment without a separate DSA. This prevents
   uncontrolled fan-out of high-impact datasets across test fleets.

Third-party vendors (outsourced QA teams, penetration testers, performance
testing partners) accessing environments containing personal test data are
processors under GDPR Art. 4(8) and require a Data Processing Agreement (DPA)
in addition to the DSA. The DPA must specify the categories of data, the
processing purposes, and deletion obligations at contract end.
