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
