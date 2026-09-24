const { t } = require('./i18n');

const WIDTHS = {
  save: 8,
  saveDraft: 14,
  publish: 11,
  discard: 20,
  trial: 26,
};

// resolved once; the toolbar does not re-translate on every render
const LABELS = {
  save: 'Save',
  saveDraft: t('toolbar.saveDraft'),
  publish: t('toolbar.publish'),
  discard: t('toolbar.discard'),
  trial: t('banner.trialEnds'),
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderToolbar() {
  return Object.keys(LABELS).map((id) => ({ id, text: fit(LABELS[id], WIDTHS[id]) }));
}

module.exports = { renderToolbar, WIDTHS };
