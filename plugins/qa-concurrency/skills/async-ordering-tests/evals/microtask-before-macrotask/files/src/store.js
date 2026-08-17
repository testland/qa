'use strict';

function createStore(initial) {
  let state = initial;
  const subscribers = [];
  const persisted = [];
  let scheduled = false;

  function schedule() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      for (const subscriber of subscribers) {
        subscriber(state);
      }
    });
    setTimeout(() => {
      persisted.push(state);
    }, 0);
  }

  return {
    setState(next) {
      state = next;
      schedule();
    },
    subscribe(fn) {
      subscribers.push(fn);
      return () => {
        const index = subscribers.indexOf(fn);
        if (index >= 0) {
          subscribers.splice(index, 1);
        }
      };
    },
    persistedValues() {
      return persisted.slice();
    },
    read() {
      return state;
    },
  };
}

module.exports = { createStore };
