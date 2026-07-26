# fast-check stateful and async testing

Advanced fast-check for concurrent and stateful systems.

[fco]: https://fast-check.dev/

## Race condition detection

Per [fast-check-overview][fco]: "Race condition detection for async
code."

```typescript
import { test } from 'vitest';
import fc from 'fast-check';

test('concurrent counter increments are atomic', async () => {
  await fc.assert(
    fc.asyncProperty(fc.scheduler(), async (s) => {
      const counter = new AsyncCounter();
      const tasks = [
        s.schedule(counter.increment()),
        s.schedule(counter.increment()),
        s.schedule(counter.increment()),
      ];
      await s.waitAll();
      await Promise.all(tasks);
      expect(counter.value).toBe(3);
    })
  );
});
```

`fc.scheduler` exhaustively explores task interleavings; `s.schedule`
queues an async operation; `s.waitAll()` advances. fast-check finds
interleavings that cause the property to fail - the canonical
race-condition catcher.

## Model-based testing

Per [fast-check-overview][fco]: "Model-based testing for stateful
systems."

```typescript
class CounterModel {
  count = 0;
  increment() { this.count++; }
  decrement() { this.count--; }
}

const allCommands = [
  fc.constant({ run: (c, real) => { c.increment(); real.increment(); expect(real.value).toBe(c.count); } }),
  fc.constant({ run: (c, real) => { c.decrement(); real.decrement(); expect(real.value).toBe(c.count); } }),
];

it('counter behaves per model', () => {
  fc.assert(
    fc.property(fc.commands(allCommands), (cmds) => {
      const model = new CounterModel();
      const real = new RealCounter();
      fc.modelRun(() => ({ model, real }), cmds);
    })
  );
});
```

fast-check generates random sequences of commands; the model
stays in sync with the real implementation; any divergence is a
bug in the real implementation.
