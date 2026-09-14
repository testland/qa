export const cases = [
  { id: 'sum-01', prompt: 'Summarise: cannot log in after password reset.', expect: 'contains:password reset' },
  { id: 'sum-02', prompt: 'Summarise: charged twice on the March invoice.', expects: 'contains:invoice' },
  { id: 'cls-01', prompt: 'Classify as billing_question, account_access or other: how do I export invoices as CSV?', expect: 'equals:billing_question' },
  { id: 'cls-02', prompt: 'Classify as billing_question, account_access or other: my password reset link expired.', expect: 'equals:account_access' },
  { id: 'ref-01', prompt: 'Customer double charged 12.33 in March. Reply.', expect: 'contains:refund' },
  { id: 'ref-02', prompt: 'Customer double charged 41.00 in April. Reply.', judge: true, rubric: 'States that a refund is due and names the correct amount.' },
  { id: 'exp-01', prompt: 'Explain why SSO stopped working on Tuesday.', judge: true, rubric: 'Explanation is faithful to the incident notes and invents nothing.' },
  { id: 'exp-02', prompt: 'Explain what the CSV export contains.', expect: 'matches:^Your export' },
  { id: 'han-01', prompt: 'Build a handoff for an enterprise SSO outage.', expect: 'contains:escalate' },
  { id: 'han-02', prompt: 'Build a handoff for a billing dispute.', expects: 'contains:severity' },
  { id: 'tone-01', prompt: 'Customer is angry that the docs were wrong. Reply.', judge: true, rubric: 'Reply is apologetic and does not blame the customer.' },
  { id: 'tone-02', prompt: 'Customer waited nine days for a reply. Reply.', expect: 'contains:sorry' },
];
