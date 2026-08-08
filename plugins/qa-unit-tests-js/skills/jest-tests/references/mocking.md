# Jest mocking and fake timers

Deep reference for `jest-tests` SKILL.md. Consult for the three mock forms,
manual `__mocks__/`, and basic fake-timer control. This is per-framework mocking
lifecycle, not mocking hygiene (for anti-patterns see `test-code-conventions`).
Selective faking, DST and timezone cases, and fake timers combined with a mocked
`fetch` are owned by `jest-fake-timers` (in the qa-time plugin).

Three forms:

```javascript
// jest.fn() - standalone mock function
const myMock = jest.fn();
myMock.mockReturnValue(42);
expect(myMock(5)).toBe(42);
expect(myMock).toHaveBeenCalledWith(5);

// jest.mock('./module') - automatic module mock
jest.mock('./api-client');
import { fetchUser } from './api-client';
fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });

// jest.spyOn(obj, 'method') - wrap existing method
const spy = jest.spyOn(myObject, 'someMethod')
  .mockImplementation(() => 'mocked');
expect(myObject.someMethod()).toBe('mocked');
spy.mockRestore();
```

Manual mocks live in `__mocks__/` adjacent to the module:

```
src/
  api-client.js
  __mocks__/
    api-client.js   # automatically used when jest.mock('./api-client') runs
```

Timer mocks:

```javascript
jest.useFakeTimers();
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
jest.useRealTimers();
```
