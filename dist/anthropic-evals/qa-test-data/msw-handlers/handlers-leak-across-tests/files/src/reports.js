export async function loadDailyReport() {
  const res = await fetch('https://api.example.com/reports/daily');
  if (res.status >= 500) return { id: 'daily', status: 'degraded', rows: 0 };
  if (!res.ok) throw new Error(`report request failed: ${res.status}`);
  const body = await res.json();
  return { ...body, status: 'ok' };
}
