const { t } = require('./i18n');

const WIDTHS = {
  greeting: 26,
  summary: 22,
  invite: 31,
  checkout: 30,
  remove: 12,
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderCart(user, cart) {
  return [
    { id: 'greeting', text: fit(t('greeting.hello', { name: user.name }), WIDTHS.greeting) },
    { id: 'summary', text: fit(t('cart.summary', { count: cart.count, total: cart.total }), WIDTHS.summary) },
    { id: 'invite', text: fit(t('invite.sent', { email: user.email }), WIDTHS.invite) },
    { id: 'checkout', text: fit(t('cart.checkout'), WIDTHS.checkout) },
    { id: 'remove', text: fit('Remove', WIDTHS.remove) },
  ];
}

module.exports = { renderCart, WIDTHS };
