export async function loadAccount() {
  const res = await fetch('https://api.example.com/account');
  if (!res.ok) throw new Error(`account request failed: ${res.status}`);
  const body = await res.json();

  return {
    id: body.id,
    tier: body.plan,
    seatsLeft: body.seats,
    atSeatLimit: body.seats === 0,
  };
}
