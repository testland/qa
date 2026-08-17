export async function loadProfile() {
  const res = await fetch('https://api.example.com/profile');
  if (!res.ok) throw new Error(`profile request failed: ${res.status}`);
  return res.json();
}
