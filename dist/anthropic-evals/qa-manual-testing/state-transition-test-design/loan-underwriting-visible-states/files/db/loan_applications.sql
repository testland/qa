-- Internal schema. Testers do not have access to this; it is included so the
-- pack's author can see what the old cases were asserting on.
CREATE TABLE loan_applications (
  id                BIGINT PRIMARY KEY,
  applicant_id      BIGINT NOT NULL,
  status_code       SMALLINT NOT NULL,
  is_locked         TINYINT(1) NOT NULL DEFAULT 0,
  doc_reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  funding_batch_id  BIGINT NULL,
  decision_json     JSON NULL,
  updated_at        DATETIME NOT NULL
);

-- status_code values used by loan-service:
--   10 received
--   20 docs_requested
--   30 queued_for_underwriting   -- portal and console both show "In underwriting"
--   31 with_underwriter          -- portal and console both show "In underwriting"
--   40 approved
--   50 declined
--   60 funded
--   70 withdrawn
--
-- is_locked is set while an underwriter has the file open in the decision
-- editor and cleared when they save or navigate away. It is not surfaced
-- anywhere in the portal or the console.
-- funding_batch_id is populated when the nightly batch picks the application
-- up and stays populated afterwards.
