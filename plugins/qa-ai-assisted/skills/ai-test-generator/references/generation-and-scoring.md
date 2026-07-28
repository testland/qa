# Generation and scoring - full scripts

The SKILL.md spine keeps a minimal runnable core of each script. This file
holds the production versions with their helper functions.

## Generator (Step 2, full version)

```python
# scripts/ai-gen.py
import openai
import os

system_prompt = """
You generate tests in {framework} for the given AC spec.
Constraints:
- One test per AC.
- Use the project's test code conventions (see test-code-conventions reference).
- Specific assertions only - no .toBeTruthy() / .toBeDefined() style.
- Use {test_runner}'s standard primitives.
- If you can't satisfy an AC with the given inputs, mark with
  CONFIDENCE: low and explain why.
"""

def format_ac_prompt(ac):
    """Format a single AC dict into a prompt string for the LLM."""
    return (
        f"AC ID: {ac['id']}\n"
        f"Description: {ac['description']}\n"
        f"Inputs: {ac['inputs']}\n"
        f"Expected: {ac['expected']}"
    )

def save_test(ac_id, test_code, output_dir='tests/generated'):
    """Write generated test code to tests/generated/<ac_id>.test.js (or .py)."""
    os.makedirs(output_dir, exist_ok=True)
    # Detect language from shebang or content; default to .js
    ext = '.py' if test_code.lstrip().startswith('def ') or 'import pytest' in test_code else '.js'
    path = os.path.join(output_dir, f"{ac_id.replace('-', '_').lower()}{ext}")
    with open(path, 'w') as f:
        f.write(test_code)
    return path

for ac in input_yaml['acceptance_criteria']:
    response = openai.chat.completions.create(
        model='gpt-4',
        messages=[
            {'role': 'system', 'content': system_prompt.format(
                framework='jest',       # replace with team's framework
                test_runner='jest',     # replace with team's test runner
            )},
            {'role': 'user', 'content': format_ac_prompt(ac)},
        ],
    )
    save_test(ac['id'], response.choices[0].message.content)
```

The `test-code-conventions` reference in the system prompt should be a
project-specific file (e.g. `docs/test-code-conventions.md`) injected into the
prompt at runtime.

## Scoring helpers (Step 4, full version)

The spine keeps the `score()` rubric inline; these are the parsing helpers it
calls.

```python
import importlib.util
import ast
import re

def extract_imports(test_code: str) -> list[str]:
    """Return a list of top-level module names imported in the code."""
    try:
        tree = ast.parse(test_code)
    except SyntaxError:
        return []
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name.split('.')[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module.split('.')[0])
    return imports

def module_exists(module_name: str) -> bool:
    """Return True if the module can be found in the current environment."""
    return importlib.util.find_spec(module_name) is not None

def extract_test_name(test_code: str) -> str:
    """Return the first test/it/def test_ name found in the code."""
    match = re.search(r'(?:it|test|def test_)\s*\(?["\']?([^"\'(),]+)', test_code)
    return match.group(1) if match else ''
```
