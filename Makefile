.PHONY: help validate rate compose catalog inventory version-check all clean

help:
	@echo "Targets:"
	@echo "  validate    Lint plugin structure and frontmatter"
	@echo "  rate        Enforce rating >= 21 and d6 >= 1"
	@echo "  compose     Validate agent -> skill preload references"
	@echo "  catalog     Regenerate CATALOG.md from marketplace.json"
	@echo "  inventory   Print marketplace inventory snapshot"
	@echo "  version-check  Flag plugins changed without a plugin.json version bump (run before pushing)"
	@echo "  all         Run validate + rate + compose + catalog"

validate:
	bash scripts/validate.sh .

rate:
	bash scripts/rating-check.sh .

compose:
	python3 scripts/composition-graph.py

catalog:
	python3 scripts/generate-catalog.py

inventory:
	python3 scripts/inventory.py

version-check:
	python3 scripts/version-bump-check.py

all: validate rate compose catalog
	@echo "All checks passed; CATALOG.md regenerated."

clean:
	@echo "Nothing to clean (no build artifacts)."
