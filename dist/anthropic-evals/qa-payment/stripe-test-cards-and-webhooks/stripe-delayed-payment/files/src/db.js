// orders(id, checkout_session_id UNIQUE, status TEXT) in Postgres
module.exports = {
  findOrderBySession: async (sessionId) => { /* SELECT ... */ },
  setOrderStatus: async (id, status) => { /* UPDATE ... */ },
};
