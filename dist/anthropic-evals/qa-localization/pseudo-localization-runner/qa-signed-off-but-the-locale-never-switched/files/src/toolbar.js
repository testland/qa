const { t } = require('./i18n');

const WIDTHS = {
  save: 8,
  saveDraft: 14,
  publish: 11,
  discard: 20,
  trial: 26,
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderToolbar() {
  return [
    { id: 'save', text: fit('Save', WIDTHS.save) },
    { id: 'saveDraft', text: fit(t('toolbar.saveDraft'), WIDTHS.saveDraft) },
    { id: 'publish', text: fit(t('toolbar.publish'), WIDTHS.publish) },
    { id: 'discard', text: fit(t('toolbar.discard'), WIDTHS.discard) },
    { id: 'trial', text: fit(t('banner.trialEnds'), WIDTHS.trial) },
  ];
}

module.exports = { renderToolbar, WIDTHS };
