CREATE TABLE people (
  person_id     CHAR(36)     NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  PRIMARY KEY (person_id)
);

CREATE TABLE members (
  tenant_id  VARCHAR(64)  NOT NULL,
  member_no  INT          NOT NULL,
  person_id  CHAR(36)     NOT NULL,
  role       VARCHAR(32)  NOT NULL,
  PRIMARY KEY (tenant_id, member_no),
  KEY idx_members_person (person_id),
  CONSTRAINT fk_members_person FOREIGN KEY (person_id) REFERENCES people (person_id)
);

CREATE TABLE preferences (
  person_id  CHAR(36)     NOT NULL,
  theme      VARCHAR(32)  NOT NULL,
  digest     VARCHAR(32)  NOT NULL,
  timezone   VARCHAR(64)  NOT NULL,
  PRIMARY KEY (person_id)
);

CREATE TABLE orgs (
  tenant_id  VARCHAR(64)  NOT NULL,
  org_name   VARCHAR(255) NOT NULL,
  region     VARCHAR(32)  NOT NULL,
  seat_limit INT          NOT NULL,
  PRIMARY KEY (tenant_id)
);
