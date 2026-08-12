# Subscribers must see a change before it is persisted

## Problem Description

`src/store.js` batches state changes. Subscribers are notified on the
microtask queue so the UI updates in the same tick, while persistence is
deferred to a macrotask so it never blocks rendering.

That ordering is a real guarantee - a persistence hook that reads the store
must never run before subscribers have observed the change - and it is
entirely untested. Several changes in the same tick are also supposed to
coalesce into a single notification.

## Output Specification

Add `src/store.test.js` proving the ordering guarantee between notification
and persistence, and proving that multiple changes in one tick produce one
notification.

Run `npm test` before you finish; it must pass.

Leave `src/store.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "state-core",
  "version": "1.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/store.js ===============
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

=============== FILE: src/store.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('./store');

test('reads back the value that was set', () => {
  const store = createStore(0);
  store.setState(7);
  assert.equal(store.read(), 7);
});
