# Settings update trusts the client's types

## Problem Description

`src/updateSettings.js` applies a partial settings update. Each field has a
declared type, and the handler rejects anything that does not match.

We shipped a bug where `itemsPerPage` arrived as the string `"25"` from an
older mobile client and was stored as a string, which broke pagination
downstream. The handler does reject it now, but nothing tests that it does -
and the same hole exists for the other fields.

## Output Specification

Add `src/updateSettings.test.js` covering the wrong-type rejection for every
field this handler accepts, plus the value-level rejections it implements.

Run `npm test` before you finish; it must pass.

Leave `src/updateSettings.happy.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "user-preferences",
  "version": "4.1.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/updateSettings.js ===============
'use strict';

const THEMES = ['light', 'dark', 'system'];
const ITEMS_MIN = 5;
const ITEMS_MAX = 100;

function updateSettings(current, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, field: null, code: 'MALFORMED_PATCH' };
  }

  if ('theme' in patch) {
    if (typeof patch.theme !== 'string') {
      return { ok: false, field: 'theme', code: 'WRONG_TYPE' };
    }
    if (!THEMES.includes(patch.theme)) {
      return { ok: false, field: 'theme', code: 'UNSUPPORTED_VALUE' };
    }
  }

  if ('notificationsEnabled' in patch) {
    if (typeof patch.notificationsEnabled !== 'boolean') {
      return { ok: false, field: 'notificationsEnabled', code: 'WRONG_TYPE' };
    }
  }

  if ('itemsPerPage' in patch) {
    if (typeof patch.itemsPerPage !== 'number' || !Number.isInteger(patch.itemsPerPage)) {
      return { ok: false, field: 'itemsPerPage', code: 'WRONG_TYPE' };
    }
    if (patch.itemsPerPage < ITEMS_MIN || patch.itemsPerPage > ITEMS_MAX) {
      return { ok: false, field: 'itemsPerPage', code: 'OUT_OF_RANGE' };
    }
  }

  if ('tags' in patch) {
    if (!Array.isArray(patch.tags)) {
      return { ok: false, field: 'tags', code: 'WRONG_TYPE' };
    }
    if (patch.tags.some((tag) => typeof tag !== 'string')) {
      return { ok: false, field: 'tags', code: 'WRONG_ELEMENT_TYPE' };
    }
  }

  return { ok: true, field: null, code: null, settings: { ...current, ...patch } };
}

module.exports = { updateSettings, THEMES, ITEMS_MIN, ITEMS_MAX };

=============== FILE: src/updateSettings.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { updateSettings } = require('./updateSettings');

const CURRENT = { theme: 'light', notificationsEnabled: true, itemsPerPage: 25, tags: [] };

test('applies a partial update', () => {
  const result = updateSettings(CURRENT, { theme: 'dark' });
  assert.equal(result.ok, true);
  assert.equal(result.settings.theme, 'dark');
  assert.equal(result.settings.itemsPerPage, 25);
});
