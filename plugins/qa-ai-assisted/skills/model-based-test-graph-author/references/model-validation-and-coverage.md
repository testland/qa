# Model validation and coverage-criteria selection

Deep reference for the `model-based-test-graph-author` SKILL.md. Consult
when validating a state-machine model or choosing which coverage
criterion drives path generation.

[mbt]: https://en.wikipedia.org/wiki/Model-based_testing

## Validate the model

A model with unreachable or dead-end states wastes generation effort.
Validate it before generating any paths:

```python
# scripts/validate-model.py
import yaml

model = yaml.safe_load(open('models/checkout.yaml'))
states = {s['id'] for s in model['states']}
initial = next(s['id'] for s in model['states'] if s.get('initial'))
finals = {s['id'] for s in model['states'] if s.get('final')}

# Check 1: every transition references valid states
for t in model['transitions']:
    assert t['from'] in states, f"Unknown from-state: {t['from']}"
    assert t['to'] in states, f"Unknown to-state: {t['to']}"

# Check 2: every state is reachable from initial
reachable = {initial}
changed = True
while changed:
    changed = False
    for t in model['transitions']:
        if t['from'] in reachable and t['to'] not in reachable:
            reachable.add(t['to'])
            changed = True
unreachable = states - reachable
assert not unreachable, f"Unreachable states: {unreachable}"

# Check 3: every state can reach a final state
for s in states - finals:
    if not can_reach_final(s, model, finals):
        print(f"Warning: state {s} cannot reach a final state (deadlock)")

# Check 4: report the counts that bound path generation
print(f"States: {len(states)}; Transitions: {len(model['transitions'])}")
print(f"Possible test paths (transition coverage): {len(model['transitions'])}")
```

The four checks are: (1) every transition references valid states, (2)
every state is reachable from the initial state, (3) every non-final
state can reach a final state (deadlock guard), and (4) print the
state / transition counts.

## Generate test paths per criterion

The coverage criterion decides how many paths get generated:

```python
def generate_paths(model, criterion='transition'):
    """Returns list of paths (each a list of transitions)."""
    if criterion == 'transition':
        # Greedy: walk the graph, prefer untraversed edges
        return greedy_transition_cover(model)
    elif criterion == 'state':
        return paths_visiting_each_state(model)
    elif criterion == 'all_pairs':
        return all_2_step_pairs(model)
    # ...
```

Criteria, from cheapest to most exhaustive:

| Criterion    | What it exercises                        |
|--------------|------------------------------------------|
| `transition` | every transition at least once           |
| `state`      | every state visited at least once        |
| `all_pairs`  | every 2-step transition pair             |
| `all_paths`  | every path up to length N (rarely viable) |

## Why not all-paths

> "Because systems can have enormous numbers of possible
> configurations, finding all paths is impractical. Instead, test
> criteria are needed to guide the selection of a finite,
> appropriate number of test cases." ([mbt-wiki][mbt])

> "Model-based testing qualifies as black-box testing since test
> suites are derived from models and not from source code."
> ([mbt-wiki][mbt])

The team picks the coverage criterion (transition, state, all 2-step
pairs, all paths up to length N); MBT generates the matching paths.
