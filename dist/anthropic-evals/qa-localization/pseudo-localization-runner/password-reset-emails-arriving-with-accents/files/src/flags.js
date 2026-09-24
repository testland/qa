// Opt-in only. Unset, empty and any other value all mean off.
const PSEUDO_LOCALE = process.env.PSEUDO_LOCALE === 'on';

module.exports = { PSEUDO_LOCALE };
