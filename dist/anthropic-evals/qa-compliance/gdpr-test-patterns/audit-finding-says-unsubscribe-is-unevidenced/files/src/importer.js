'use strict';

const { getUser, signup, setMarketingOptIn } = require('./consent');

function syncPartnerList(rows, at) {
  return rows.map((row) => {
    if (!getUser(row.email)) {
      signup({
        email: row.email,
        displayName: row.name,
        consentMarketing: row.subscribed,
        at,
        via: 'partner-list',
      });
      return { email: row.email, action: 'created' };
    }
    setMarketingOptIn(row.email, row.subscribed);
    return { email: row.email, action: 'updated' };
  });
}

module.exports = { syncPartnerList };
