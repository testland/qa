.PHONY: help install validate compose catalog inventory drift version-check evals test typecheck all clean

help:
	@echo "Targets:"
	@echo "  install     Install the Node tooling (npm ci)"
	@echo "  validate    Lint plugin structure and frontmatter"
	@echo "  compose     Validate agent -> skill preload references"
	@echo "  catalog     Regenerate CATALOG.md from marketplace.json"
	@echo "  inventory   Print marketplace inventory snapshot"
	@echo "  drift       Flag plugin.json descriptions whose component counts disagree with disk"
	@echo "  version-check  Flag plugins changed without a plugin.json version bump (run before pushing)"
	@echo "  evals       Recompile the Anthropic eval manifests from the scenarios"
	@echo "  test        Run the tooling unit tests"
	@echo "  typecheck   Type-check the tooling"
	@echo "  all         Run validate + compose + drift + evals + catalog"

install:
	npm ci

validate:
	npm run validate

compose:
	npm run compose

catalog:
	npm run catalog

inventory:
	npm run inventory

drift:
	npm run drift

version-check:
	npm run version-check

evals:
	npm run evals:build

test:
	npm test

typecheck:
	npm run typecheck

all: validate compose drift evals catalog
	@echo "All checks passed; CATALOG.md regenerated."

clean:
	@echo "Nothing to clean (no build artifacts)."
