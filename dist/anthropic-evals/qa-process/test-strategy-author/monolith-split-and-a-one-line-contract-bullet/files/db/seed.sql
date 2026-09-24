-- Shared billing seed. Loaded by npm run db:reset before every integration run.
INSERT INTO accounts (id, name) VALUES ('acct_1000', 'Northwind'), ('acct_1001', 'Contoso');
INSERT INTO subscriptions (id, account_id, plan) VALUES ('sub_2000', 'acct_1000', 'team');
INSERT INTO invoices (id, account_id, status) VALUES ('inv_5000', 'acct_1000', 'posted');
INSERT INTO invoice_lines (invoice_id, sku, amount_cents) VALUES ('inv_5000', 'seats', 12000);
INSERT INTO ledger_entries (id, account_id, amount_cents) VALUES ('le_9000', 'acct_1000', 12000);
INSERT INTO dunning_schedules (id, invoice_id, next_run) VALUES ('dn_100', 'inv_5000', '2026-03-01');
