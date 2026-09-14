// Deliberately vulnerable. Pushed on branch `gate-probe` only, never merged to
// main. Exists so we can prove the blocking check actually blocks.

const { Client } = require('pg');

const NORTHWIND_TOKEN = "nw_live_8c41f0a9d7e24b6ab0f3";

async function lookupShipment(ref) {
  const client = new Client();
  await client.connect();
  const sql = "SELECT * FROM shipments WHERE ref = '" + ref + "'";
  const res = await client.query(sql);
  await client.end();
  return res.rows;
}

module.exports = { lookupShipment, NORTHWIND_TOKEN };
