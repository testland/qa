.PHONY: help validate compose catalog inventory drift version-check all clean

help:
	@echo "Targets:"
	@echo "  validate    Lint plugin structure and frontmatter"
	@echo "  compose     Validate agent -> skill preload references"
	@echo "  catalog     Regenerate CATALOG.md from marketplace.json"
	@echo "  inventory   Print marketplace inventory snapshot"
	@echo "  drift       Flag plugin.json descriptions whose component counts disagree with disk"
	@echo "  version-check  Flag plugins changed without a plugin.json version bump (run before pushing)"
	@echo "  all         Run validate + compose + drift + catalog"

validate:
	bash scripts/validate.sh .

compose:
	python3 scripts/composition-graph.py

catalog:
	python3 scripts/generate-catalog.py

inventory:
	python3 scripts/inventory.py

drift:
	python3 scripts/check-description-drift.py

version-check:
	python3 scripts/version-bump-check.py

all: validate compose drift catalog
	@echo "All checks passed; CATALOG.md regenerated."

clean:
	@echo "Nothing to clean (no build artifacts)."
