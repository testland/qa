export class AdminClient {
  constructor(private token: string) {}

  /** Runs a statement against whichever environment ADMIN_API_BASE points at. */
  async sql(statement: string): Promise<{ rows: number }> {
    const res = await fetch(`${process.env.ADMIN_API_BASE}/admin/sql`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ statement }),
    });
    if (!res.ok) throw new Error(`admin sql failed: ${res.status}`);
    return res.json() as Promise<{ rows: number }>;
  }
}
