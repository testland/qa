async function send(to, subject, body) {
  const res = await fetch('https://mail.example.com/v1/send', {
    method: 'POST',
    body: JSON.stringify({ to, subject, body }),
  });

  if (!res.ok) throw new Error(`transport failed: ${res.status}`);
  return res.json();
}

module.exports = { send };
