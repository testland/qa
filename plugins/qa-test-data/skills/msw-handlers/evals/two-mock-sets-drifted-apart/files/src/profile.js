export async function loadProfile() {
  const res = await fetch('https://api.example.com/profile');
  if (!res.ok) throw new Error(`profile request failed: ${res.status}`);
  const body = await res.json();

  return {
    id: body.id,
    name: body.display_name,
    tier: body.plan,
    seats: body.seats,
  };
}
