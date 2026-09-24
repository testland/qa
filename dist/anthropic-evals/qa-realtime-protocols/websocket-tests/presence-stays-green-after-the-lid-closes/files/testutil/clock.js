'use strict';

// Deterministic stand-in for setInterval; handlers run only when the clock is advanced.
function createClock() {
  let current = 0;
  const timers = [];

  return {
    now() {
      return current;
    },
    setInterval(fn, ms) {
      const timer = { fn, ms, next: current + ms, active: true };
      timers.push(timer);
      return timer;
    },
    clearInterval(timer) {
      if (timer) {
        timer.active = false;
      }
    },
    tick(ms) {
      const until = current + ms;
      for (;;) {
        const due = timers
          .filter((timer) => timer.active && timer.next <= until)
          .sort((a, b) => a.next - b.next)[0];
        if (!due) {
          break;
        }
        current = due.next;
        due.next = current + due.ms;
        due.fn();
      }
      current = until;
    },
  };
}

module.exports = { createClock };
