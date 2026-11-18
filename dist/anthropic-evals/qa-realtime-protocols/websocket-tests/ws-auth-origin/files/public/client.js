const token = localStorage.getItem('apiToken');   // long-lived API token
const ws = new WebSocket(`wss://app.example.com/live?token=${token}`, {
  headers: { Authorization: `Bearer ${token}` },
});
