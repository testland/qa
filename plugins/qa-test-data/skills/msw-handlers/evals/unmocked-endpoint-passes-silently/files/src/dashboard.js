export async function loadDashboard(userId) {
  const profileRes = await fetch(`https://api.example.com/users/${userId}`);
  const profile = await profileRes.json();

  let notifications = [];
  try {
    const res = await fetch(`https://api.example.com/users/${userId}/notifications`);
    if (res.ok) notifications = await res.json();
  } catch {
    notifications = [];
  }

  return {
    name: profile.name,
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  };
}
