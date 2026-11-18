CREATE ROLE app LOGIN PASSWORD 'app';      -- the API connects as app; app also runs migrations
ALTER TABLE invoices OWNER TO app;
