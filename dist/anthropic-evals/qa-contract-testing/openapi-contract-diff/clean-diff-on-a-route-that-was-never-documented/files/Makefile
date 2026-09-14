PORTAL_BUCKET ?= northwind-webhooks-portal
VERSION := $(shell node -p "require('./package.json').version")

.PHONY: test
test:
	node --test

.PHONY: publish-spec
publish-spec:
	aws s3 cp spec/openapi.yaml s3://$(PORTAL_BUCKET)/specs/v$(VERSION)/openapi.yaml
	aws s3 cp spec/openapi.yaml s3://$(PORTAL_BUCKET)/specs/latest/openapi.yaml
