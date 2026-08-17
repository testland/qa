export async function loadUnreadCount() {
  const res = await fetch('https://api.example.com/notifications');
  if (!res.ok) throw new Error(`notification request failed: ${res.status}`);
  const items = await res.json();
  return items.filter((item) => !item.read).length;
}
