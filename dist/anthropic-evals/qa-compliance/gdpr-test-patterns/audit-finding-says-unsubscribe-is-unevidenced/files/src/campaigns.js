'use strict';

const { send } = require('./mailer');

function runCampaign(name, recipients) {
  return recipients.map((email) => ({ email, result: send(email, 'marketing', name).status }));
}

function sendReceipt(email, invoiceId) {
  return send(email, 'transactional', `Receipt ${invoiceId}`);
}

module.exports = { runCampaign, sendReceipt };
