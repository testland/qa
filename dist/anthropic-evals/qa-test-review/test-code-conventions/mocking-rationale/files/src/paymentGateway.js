'use strict';

async function charge(amountCents, token) {
  const response = await fetch('https://payments.example.com/charges', {
    method: 'POST',
    body: JSON.stringify({ amountCents, token }),
  });
  return response.json();
}

module.exports = { charge };
