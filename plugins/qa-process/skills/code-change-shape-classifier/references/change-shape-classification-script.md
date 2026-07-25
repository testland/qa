# Change shape classification script

Deep reference for `code-change-shape-classifier` SKILL.md. The runnable per-file
classifier that mechanizes the four-shape rules from the main body's "four change
shapes" table: path rules first, content overrides second, excluded paths dropped.

Save it as `scripts/classify-change-shape.py` and pipe a `git log --name-only`
stream (Step 1) through it.

```python
# scripts/classify-change-shape.py
import re

PATH_RULES = [
    ("data-heavy",    r"(^|/)(migrations?|db/migrate|etl|pipelines?)/|"
                      r"schema\.(sql|prisma|graphql)$|\.(proto|avsc)$|seeds?/"),
    ("ui-heavy",      r"(^|/)(components?|views?|pages?|screens?|layouts?)/|"
                      r"\.(tsx|jsx|vue|svelte|css|scss|html)$"),
    ("service-layer", r"(^|/)(routes?|controllers?|handlers?|api|services?|"
                      r"repositor(y|ies)|resolvers?|consumers?|clients?)/"),
    ("pure-logic",    r"(^|/)(domain|core|lib|rules|calc|models?)/"),
]

CONTENT_OVERRIDES = [
    ("data-heavy",    r"CREATE TABLE|ALTER TABLE|ADD COLUMN|def upgrade\("),
    ("ui-heavy",      r"<[A-Z][A-Za-z]*|useState\(|render\(|@Component\b"),
    ("service-layer", r"@(Get|Post|Put|Delete)Mapping|app\.(get|post|put)\(|"
                      r"session\.query\(|createConnection\(|fetch\(|HttpClient"),
]

EXCLUDE = re.compile(r"(^|/)(tests?|spec|__tests__|e2e|fixtures?)/|"
                     r"\.(test|spec)\.|(^|/)(\.github|docs)/|"
                     r"(package-lock|yarn\.lock|Gemfile\.lock)")

def classify_file(path, content=""):
    if EXCLUDE.search(path):
        return None                      # not evidence about the change
    for shape, pattern in PATH_RULES:
        if re.search(pattern, path):
            path_shape = shape
            break
    else:
        path_shape = None
    for shape, pattern in CONTENT_OVERRIDES:
        if content and re.search(pattern, content):
            return shape if path_shape is None else path_shape
    return path_shape or "pure-logic"    # default: no surface signal found
```

How the code maps back to the rules: `EXCLUDE` is Rule 2 (test files and config
are not evidence); the `PATH_RULES` order encodes "path first"; `CONTENT_OVERRIDES`
are the content tie-breakers applied only when a path match is contested. Keep the
three tables in sync with the "four change shapes" table in SKILL.md - if a signal
is added there, add it here too, or the code and the prose drift apart.
