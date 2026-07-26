# Access controls

Referenced from [SKILL.md](../SKILL.md). Access to test datasets containing
personal data follows the NIST 800-122 principle of minimum necessary access
(referenced in §4 control recommendations, grounded in the Fair Information
Practices). In practice:

- **Role-based access:** only testers whose test case requires the data are
  granted access. Developers not running those tests do not have access to
  the test database or fixture files.
- **Shared credentials are prohibited:** each accessor has an individual account
  so the audit log (NIST 800-122 control family: Audit and Accountability) can
  attribute access to a named person.
- **Elevated-access review:** T3 and T4 environments require the data steward's
  approval for new access grants. Access is time-bounded to the duration of the
  test engagement.
- **Read-only by default:** write or delete access to a test dataset containing
  personal data must be justified separately. A tester running assertions does
  not need INSERT or UPDATE.
- **Offboarding:** when a tester leaves the project or the vendor engagement
  ends, access must be revoked the same day. The offboarding checklist must
  include test-environment credentials.

CI pipelines that access test databases containing personal data must use
dedicated service accounts (not developer credentials) and those accounts must
be reviewed when the pipeline is decommissioned.
