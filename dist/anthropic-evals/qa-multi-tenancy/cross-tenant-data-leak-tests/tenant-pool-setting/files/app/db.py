import psycopg_pool

# DSN points at PgBouncer (pool_mode = transaction)
pool = psycopg_pool.ConnectionPool("postgresql://app@pgbouncer:6432/billing")

def tenant_connection(tenant_id: str):
    conn = pool.getconn()
    conn.execute(f"SET app.tenant_id = '{tenant_id}'")
    return conn

def release(conn):
    pool.putconn(conn)
