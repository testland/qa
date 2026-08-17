export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchUser(id) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new ApiError(res.status, `request failed: ${res.status}`);
  return res.json();
}
