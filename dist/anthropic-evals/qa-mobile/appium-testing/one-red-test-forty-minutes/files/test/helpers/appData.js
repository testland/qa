// Seeds fixtures through the backend admin API. Owned by the platform team.
function seedUser() {
  return { email: `qa+${Date.now()}@acme.test`, password: 'correct horse' };
}

function catalogItem() {
  return { sku: 'SKU-1001', name: 'Wool blanket' };
}

module.exports = { seedUser, catalogItem };
