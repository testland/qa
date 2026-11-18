CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, email text NOT NULL UNIQUE);
